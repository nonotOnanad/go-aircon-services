// Vercel Serverless Function — POST /api/notify-admin
// Notifies go.aircon.services.business@gmail.com on every new booking or quotation

const BUSINESS_EMAIL = 'go.aircon.services.business@gmail.com'
const WEBSITE = 'https://go-aircon-services.vercel.app/'

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function row(label, value, last = false) {
  if (!value) return ''
  return `
  <tr>
    <td style="padding:7px 0;${last ? '' : 'border-bottom:1px solid #d8e7f0;'}width:36%;vertical-align:top;">
      <span style="font-size:11px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">${label}</span>
    </td>
    <td style="padding:7px 0;${last ? '' : 'border-bottom:1px solid #d8e7f0;'}vertical-align:top;">
      <span style="font-size:14px;color:#0a1f2e;">${escHtml(String(value))}</span>
    </td>
  </tr>`
}

function buildBookingEmail({ ref, name, phone, email, address, service, work_type, units, model, pref_date, pref_time, notes }) {
  const dateDisplay = pref_date
    ? new Date(pref_date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not specified'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>New Booking — ${escHtml(ref)}</title></head>
<body style="margin:0;padding:0;background:#f0f7fb;font-family:'Segoe UI',Arial,sans-serif;color:#0a1f2e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;padding:32px 0;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0a1f2e 0%,#103a5a 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
      <div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 14px;margin-bottom:16px;">
        <span style="font-size:24px;font-weight:900;letter-spacing:-1px;color:#0f6fb0;">GO</span>
        <span style="font-size:16px;font-weight:700;color:#0a1f2e;"> Aircon Services</span>
      </div>
      <div style="display:inline-block;margin-left:12px;background:#dcf5e9;border-radius:8px;padding:5px 13px;vertical-align:middle;">
        <span style="font-size:13px;font-weight:700;color:#0f7a4f;">🔔 NEW BOOKING</span>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:12px 0 4px;">New service booking received</h1>
      <p style="color:#9fd5ee;margin:0;font-size:14px;">Reference: <strong style="color:#46c6ef;">${escHtml(ref)}</strong></p>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#ffffff;padding:32px 40px;">
      <p style="font-size:15px;margin:0 0 20px;color:#56708a;line-height:1.6;">
        A client has submitted a new service booking through your website. Review the details below and confirm the schedule as soon as possible.
      </p>

      <!-- Client Info -->
      <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#27a8d6;margin:0 0 10px;font-weight:700;">Client Information</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;border-radius:12px;border:1px solid #d8e7f0;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Full name', name)}
            ${row('Mobile', phone)}
            ${row('Email', email || 'Not provided')}
            ${row('Address', address, true)}
          </table>
        </td></tr>
      </table>

      <!-- Booking Details -->
      <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#27a8d6;margin:0 0 10px;font-weight:700;">Booking Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;border-radius:12px;border:1px solid #d8e7f0;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Service', service)}
            ${row('Type of work', work_type)}
            ${row('No. of units', units)}
            ${row('Brand / model', model)}
            ${row('Preferred date', dateDisplay)}
            ${row('Preferred time', pref_time)}
            ${row('Notes', notes, true)}
          </table>
        </td></tr>
      </table>

      <!-- Action button -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td align="center">
          <a href="${WEBSITE}" style="display:inline-block;background:#0f6fb0;color:#fff;font-weight:700;font-size:15px;padding:13px 30px;border-radius:10px;text-decoration:none;">
            Open Dashboard to Confirm →
          </a>
        </td></tr>
      </table>

      <p style="font-size:13px;color:#7d93a8;margin:0;line-height:1.6;">
        Please call or message the client to confirm the schedule. Once confirmed, update the booking status in the dashboard — this will automatically send a confirmation email to the client.
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#103a5a;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#7fb6d2;">
        © ${new Date().getFullYear()} GO Aircon Services · Internal Notification<br/>
        <a href="${WEBSITE}" style="color:#46c6ef;text-decoration:none;">${WEBSITE}</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`

  const text = `NEW BOOKING — ${ref}

Client: ${name}
Mobile: ${phone}
Email: ${email || 'Not provided'}
Address: ${address}

Service: ${service}
Type of work: ${work_type || '—'}
Units: ${units || 1}${model ? '\nModel: ' + model : ''}
Preferred date: ${dateDisplay}${pref_time ? '\nPreferred time: ' + pref_time : ''}${notes ? '\nNotes: ' + notes : ''}

Open dashboard: ${WEBSITE}`

  return {
    subject: `🔔 New Booking — ${ref} | ${name} | ${service}`,
    html,
    text,
  }
}

function buildQuotationEmail({ ref, name, phone, email, address, unit_type, hp, quantity, brand, budget, notes }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>New Quotation Request — ${escHtml(ref)}</title></head>
<body style="margin:0;padding:0;background:#f0f7fb;font-family:'Segoe UI',Arial,sans-serif;color:#0a1f2e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;padding:32px 0;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0a1f2e 0%,#103a5a 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
      <div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 14px;margin-bottom:16px;">
        <span style="font-size:24px;font-weight:900;letter-spacing:-1px;color:#0f6fb0;">GO</span>
        <span style="font-size:16px;font-weight:700;color:#0a1f2e;"> Aircon Services</span>
      </div>
      <div style="display:inline-block;margin-left:12px;background:#ece2fb;border-radius:8px;padding:5px 13px;vertical-align:middle;">
        <span style="font-size:13px;font-weight:700;color:#6b3fb0;">📋 NEW QUOTATION</span>
      </div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:12px 0 4px;">New quotation request received</h1>
      <p style="color:#9fd5ee;margin:0;font-size:14px;">Reference: <strong style="color:#46c6ef;">${escHtml(ref)}</strong></p>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#ffffff;padding:32px 40px;">
      <p style="font-size:15px;margin:0 0 20px;color:#56708a;line-height:1.6;">
        A client has submitted a quotation request for a brand-new aircon unit. Prepare and send them a written quotation as soon as possible.
      </p>

      <!-- Client Info -->
      <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#27a8d6;margin:0 0 10px;font-weight:700;">Client Information</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;border-radius:12px;border:1px solid #d8e7f0;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Full name', name)}
            ${row('Mobile', phone)}
            ${row('Email', email || 'Not provided')}
            ${row('Address', address, true)}
          </table>
        </td></tr>
      </table>

      <!-- Unit Details -->
      <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b3fb0;margin:0 0 10px;font-weight:700;">Unit Requirements</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0fd;border-radius:12px;border:1px solid #d8c8f5;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Unit type', unit_type)}
            ${row('Capacity', hp)}
            ${row('Quantity', quantity)}
            ${row('Preferred brand', brand)}
            ${row('Budget range', budget)}
            ${row('Notes', notes, true)}
          </table>
        </td></tr>
      </table>

      <!-- Action button -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td align="center">
          <a href="${WEBSITE}" style="display:inline-block;background:#6b3fb0;color:#fff;font-weight:700;font-size:15px;padding:13px 30px;border-radius:10px;text-decoration:none;">
            Open Dashboard to Review →
          </a>
        </td></tr>
      </table>

      <p style="font-size:13px;color:#7d93a8;margin:0;line-height:1.6;">
        Contact the client via phone or email with a written quotation. Update the quotation status in the dashboard once processed.
      </p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#103a5a;border-radius:0 0 16px 16px;padding:22px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#7fb6d2;">
        © ${new Date().getFullYear()} GO Aircon Services · Internal Notification<br/>
        <a href="${WEBSITE}" style="color:#46c6ef;text-decoration:none;">${WEBSITE}</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`

  const text = `NEW QUOTATION REQUEST — ${ref}

Client: ${name}
Mobile: ${phone}
Email: ${email || 'Not provided'}
Address: ${address}

Unit type: ${unit_type}
Capacity: ${hp}
Quantity: ${quantity}${brand ? '\nPreferred brand: ' + brand : ''}${budget ? '\nBudget: ' + budget : ''}${notes ? '\nNotes: ' + notes : ''}

Open dashboard: ${WEBSITE}`

  return {
    subject: `📋 New Quotation — ${ref} | ${name} | ${unit_type} ${hp}`,
    html,
    text,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return res.status(500).json({ error: 'Email service not configured' })

  const { type, ...data } = req.body

  if (!type || !data.ref || !data.name) {
    return res.status(400).json({ error: 'Missing required fields: type, ref, name' })
  }

  let emailContent
  if (type === 'booking') {
    emailContent = buildBookingEmail(data)
  } else if (type === 'quotation') {
    emailContent = buildQuotationEmail(data)
  } else {
    return res.status(400).json({ error: 'Invalid type. Use "booking" or "quotation"' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'GO Aircon Services <onboarding@resend.dev>',
        to: [BUSINESS_EMAIL],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('Resend error:', result)
      return res.status(response.status).json({ error: result.message || 'Failed to send email' })
    }

    return res.status(200).json({ success: true, id: result.id })
  } catch (err) {
    console.error('notify-admin error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
