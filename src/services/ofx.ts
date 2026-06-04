import type { Transaction } from '@/types'

interface OFXTransaction {
  TRNTYPE: string
  DTPOSTED: string
  TRNAMT: string
  FITID: string
  MEMO?: string
  NAME?: string
}

function parseOFXDate(raw: string): string {
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  const y = raw.slice(0, 4)
  const m = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  return `${y}-${m}-${d}`
}

function extractTagValue(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\n]*)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

function extractAllBlocks(content: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'gi')
  return content.match(regex) || []
}

export function parseOFX(content: string): Omit<Transaction, 'id' | 'bank_account_id' | 'entity_id' | 'status' | 'created_at'>[] {
  const stmtTrn = extractAllBlocks(content, 'STMTTRN')

  return stmtTrn.map((block) => {
    const type = extractTagValue(block, 'TRNTYPE').toUpperCase()
    const date = parseOFXDate(extractTagValue(block, 'DTPOSTED'))
    const amount = parseFloat(extractTagValue(block, 'TRNAMT').replace(',', '.'))
    const ofxId = extractTagValue(block, 'FITID')
    const description = extractTagValue(block, 'MEMO') || extractTagValue(block, 'NAME') || 'Sem descrição'

    const isCredit = type === 'CREDIT' || amount > 0

    return {
      date,
      description,
      amount: Math.abs(amount),
      type: isCredit ? 'credit' : 'debit',
      ofx_id: ofxId,
    }
  })
}
