import { NextRequest, NextResponse } from 'next/server'
import { deleteCustomer, initDB } from '@/lib/db-postgres'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await initDB()
    const success = await deleteCustomer(id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
