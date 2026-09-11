import { NextRequest, NextResponse } from 'next/server'
import { deleteCustomer, updateCustomerPin, initDB } from '@/lib/db-postgres'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await initDB()
    const success = await deleteCustomer(id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch (error) {
    console.error('DELETE customer error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { pin } = await request.json()
    await initDB()
    const success = await updateCustomerPin(id, pin)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
