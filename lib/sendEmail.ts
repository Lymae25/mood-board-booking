const ADMIN_EMAIL = 'chromevaultstudios@outlook.dk'
const FROM_EMAIL = 'Mood Board <onboarding@resend.dev>'
const ADMIN_BASE_URL = 'https://mood-board-booking-production.up.railway.app/admin'

interface CustomerMessageEmailParams {
  customerId: string
  customerName: string
  customerLogoUrl?: string | null
  content: string
  sceneRef?: string | null
  projectRef?: string | null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(params: CustomerMessageEmailParams): string {
  const { customerName, customerLogoUrl, content, sceneRef, projectRef, customerId } = params
  const replyUrl = `${ADMIN_BASE_URL}?chat=${encodeURIComponent(customerId)}`
  const safeName = escapeHtml(customerName)

  const logoCell = customerLogoUrl
    ? `<img src="${escapeHtml(customerLogoUrl)}" alt="${safeName}" width="56" height="56" style="display:block;border-radius:50%;border:1px solid #333333;" />`
    : `<table role="presentation" width="56" height="56" cellpadding="0" cellspacing="0" style="background-color:#111111;border:1px solid #333333;border-radius:50%;"><tr><td align="center" valign="middle" style="color:#666666;font-size:20px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(customerName.charAt(0) || '?')}</td></tr></table>`

  const refLines: string[] = []
  if (projectRef) refLines.push(`Projekt: ${escapeHtml(projectRef)}`)
  if (sceneRef) refLines.push(`Refererer til: ${escapeHtml(sceneRef)}`)
  const refRow = refLines.length
    ? `<tr><td style="padding-bottom:16px;font-size:12px;color:#999999;font-family:Arial,Helvetica,sans-serif;">${refLines.join('<br/>')}</td></tr>`
    : ''

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td style="padding-bottom:24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999999;font-family:Arial,Helvetica,sans-serif;">
            Chrome Vault Studios &middot; Mood Board
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:16px;">${logoCell}</td>
                <td valign="middle">
                  <p style="margin:0;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${safeName}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">Ny besked</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${refRow}
        <tr>
          <td style="border:1px solid #333333;padding:20px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#ffffff;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(content)}</p>
          </td>
        </tr>
        <tr><td style="height:32px;line-height:32px;font-size:1px;">&nbsp;</td></tr>
        <tr>
          <td>
            <a href="${replyUrl}" style="display:inline-block;background-color:#ffffff;color:#000000;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Svar Her</a>
          </td>
        </tr>
        <tr><td style="height:40px;line-height:40px;font-size:1px;">&nbsp;</td></tr>
        <tr>
          <td style="font-size:10px;color:#666666;letter-spacing:1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
            Chrome Vault Studios &middot; Mood Board System
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

// Best-effort notification: never throws. A failed email must never stop the
// caller from saving the chat message to the database.
export async function sendCustomerMessageEmail(params: CustomerMessageEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('sendCustomerMessageEmail: RESEND_API_KEY not set')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `Ny besked fra ${params.customerName}`,
        html: buildEmailHtml(params)
      })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('sendCustomerMessageEmail: Resend API error', res.status, text)
      return false
    }
    return true
  } catch (error) {
    console.error('sendCustomerMessageEmail error:', error)
    return false
  }
}
