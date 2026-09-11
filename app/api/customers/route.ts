import { NextRequest, NextResponse } from 'next/server'
import { initDB, getCustomers, getAllCustomers, createCustomer } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const admin = request.nextUrl.searchParams.get('admin')
    const customers = admin === '1010' ? await getAllCustomers() : await getCustomers()
    return NextResponse.json(customers)
  } catch (error) { return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const customer = await createCustomer(data)
    return NextResponse.json(customer, { status: 201 })
  } catch (error) { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
