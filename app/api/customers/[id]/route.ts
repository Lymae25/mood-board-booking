import { NextRequest, NextResponse } from 'next/server'
import { deleteCustomer, updateCustomerPin, initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

// Deleting a customer (and cascading their projects) is admin-only.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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

// Changing a PIN used to take no proof at all - any request with a
// customer's id (guessable: it's just Date.now() at creation time) could
// silently reset their PIN and lock the real customer out. Now it requires
// that customer's own session (proven at /api/verify-pin) or an admin.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!(await requireOwnerOrAdmin(request, id))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { pin } = await request.json()
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'invalid_pin' }, { status: 400 })
    }
    await initDB()
    const success = await updateCustomerPin(id, pin)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
