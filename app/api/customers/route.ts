import { NextRequest, NextResponse } from 'next/server'
import { initDB, getCustomers, getAllCustomers, createCustomer } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const isAdmin = await requireAdminSession(request)
    const customers = isAdmin ? await getAllCustomers() : await getCustomers()
    return NextResponse.json(customers)
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 }) }
}

// Creating a customer (and their PIN) is an admin-only action - there is no
// customer self-registration flow in this app.
export async function POST(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const data = await request.json()
    const customer = await createCustomer(data)
    return NextResponse.json(customer, { status: 201 })
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
