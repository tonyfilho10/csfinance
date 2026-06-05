import type { Transaction } from '@/types'

function parseOFXDate(raw: string): string {
  // Formats: YYYYMMDDHHMMSS[.000][+00:00] or YYYYMMDD
  const clean = raw.replace(/[\[.+\-].*/, '').trim()
  const y = clean.slice(0, 4)
  const m = clean.slice(4, 6)
  const d = clean.slice(6, 8)
  return `${y}-${m}-${d}`
}

function extractTagValue(content: string, tag: string): string {
  // Handles both open-style <TAG>value and closed-style <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>([^<\\n\\r]*)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

function extractAllBlocks(content: string, tag: string): string[] {
  // Try closed-tag format first: <TAG>...</TAG>
  const closedRegex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi')
  const closedBlocks = content.match(closedRegex)
  if (closedBlocks && closedBlocks.length > 0) return closedBlocks

  // Fallback: open-tag SGML format — split on <TAG>
  const openRegex = new RegExp(`<${tag}>([\\s\\S]*?)(?=<${tag}>|$)`, 'gi')
  return Array.from(content.matchAll(openRegex), (m) => `<${tag}>${m[1]}`)
}

export async function readOFXFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  // Always try UTF-8 first — many "converted" OFX files have CHARSET:1252
  // in the header but are actually UTF-8 encoded
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer)

  // If UTF-8 decoding produced replacement chars (U+FFFD) it's not valid UTF-8
  const hasReplacementChars = utf8.includes('�')

  if (!hasReplacementChars) return utf8

  // Fall back to Windows-1252 / Latin-1
  try {
    return new TextDecoder('windows-1252').decode(arrayBuffer)
  } catch {
    return new TextDecoder('iso-8859-1').decode(arrayBuffer)
  }
}

export function parseOFX(content: string): Omit<Transaction, 'id' | 'bank_account_id' | 'entity_id' | 'status' | 'created_at'>[] {
  const stmtTrn = extractAllBlocks(content, 'STMTTRN')

  const results: Omit<Transaction, 'id' | 'bank_account_id' | 'entity_id' | 'status' | 'created_at'>[] = []

  for (const block of stmtTrn) {
    const rawDate = extractTagValue(block, 'DTPOSTED')
    if (!rawDate) continue

    const date = parseOFXDate(rawDate)
    const rawAmount = extractTagValue(block, 'TRNAMT').replace(',', '.')
    const amount = parseFloat(rawAmount)
    if (isNaN(amount)) continue

    const trnType = extractTagValue(block, 'TRNTYPE').toUpperCase()
    const ofxId = extractTagValue(block, 'FITID') || undefined
    const description = (
      extractTagValue(block, 'MEMO') ||
      extractTagValue(block, 'NAME') ||
      extractTagValue(block, 'CHECKNUM') ||
      'Sem descrição'
    ).trim()

    // Determine type: explicit TRNTYPE takes priority, then sign of amount
    const isCredit =
      trnType === 'CREDIT' ||
      trnType === 'DEP' ||
      trnType === 'INT' ||
      trnType === 'DIV' ||
      (trnType !== 'DEBIT' && trnType !== 'CHECK' && trnType !== 'PAYMENT' && amount > 0)

    results.push({
      date,
      description,
      amount: Math.abs(amount),
      type: isCredit ? 'credit' : 'debit',
      ofx_id: ofxId,
    })
  }

  return results
}

export interface OFXPeriod {
  start: string  // "YYYY-MM-DD"
  end: string    // "YYYY-MM-DD"
}

/** Extrai o período declarado no cabeçalho do OFX (DTSTART/DTEND) */
export function parseOFXPeriod(content: string): OFXPeriod | null {
  const rawStart = extractTagValue(content, 'DTSTART')
  const rawEnd   = extractTagValue(content, 'DTEND')

  // Fallback: menor e maior data dentre as transações
  if (!rawStart && !rawEnd) {
    const txs = parseOFX(content)
    if (!txs.length) return null
    const dates = txs.map((t) => t.date).sort()
    return { start: dates[0], end: dates[dates.length - 1] }
  }

  return {
    start: rawStart ? parseOFXDate(rawStart) : '',
    end:   rawEnd   ? parseOFXDate(rawEnd)   : '',
  }
}
