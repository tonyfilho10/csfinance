import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { userId, fullName, email } = await req.json()
  if (!userId || !email) return NextResponse.json({ ok: false })

  await prisma.profile.upsert({
    where: { id: userId },
    create: { id: userId, fullName: fullName ?? email.split('@')[0], email },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
