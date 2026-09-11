import { NextRequest, NextResponse } from 'next/server'
import { verifyPin } from '@/lib/db-postgres'

export async function POST(request: NextRequest) {
  try {
    const { customerId, pin } = await request.json()
    const valid = await verifyPin(customerId, pin)
    return NextResponse.json({ valid })
  } catch (error) { return NextResponse.json({ valid: false }, { status: 500 }) }
}
