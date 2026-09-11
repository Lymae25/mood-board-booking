import { NextRequest, NextResponse } from 'next/server'
import { initDB, getMessagesByCustomer, getAllMessages, createMessage, markMessagesRead, getCustomerById } from '@/lib/db-postgres'
import { sendCustomerMessageEmail } from '@/lib/sendEmail'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const admin = request.nextUrl.searchParams.get('admin')
    if (admin === '1010') {
      const messages = await getAllMessages()
      return NextResponse.json(messages)
    }
    const customerId = request.nextUrl.searchParams.get('customerId')
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    const messages = await getMessagesByCustomer(customerId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error('GET /api/messages error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    if (!data.customerId || !data.content) return NextResponse.json({ error: 'customerId and content required' }, { status: 400 })
    const message = await createMessage(data)

    // Notify admin by email when a customer messages in. The message is
    // already saved above, so an email failure here must never surface as
    // an error to the customer - just log it and move on.
    if (message.sender === 'customer') {
      try {
        const customer = await getCustomerById(data.customerId)
        await sendCustomerMessageEmail({
          customerId: data.customerId,
          customerName: customer?.name || 'Ukendt kunde',
          customerLogoUrl: customer?.logoUrl,
          content: message.content,
          sceneRef: message.sceneRef,
          projectRef: message.projectRef
        })
      } catch (emailError) {
        console.error('POST /api/messages: failed to send admin notification email', emailError)
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('POST /api/messages error:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    if (!data.customerId || !data.reader) return NextResponse.json({ error: 'customerId and reader required' }, { status: 400 })
    const success = await markMessagesRead(data.customerId, data.reader)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } catch (error) {
    console.error('PATCH /api/messages error:', error)
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
  }
}
