// Vercel Serverless Function — POST /api/send-confirmation
// Sends a professional booking confirmation email via Resend

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return res.status(500).json({ error: 'Email service not configured' })

  const { to, name, ref, service, work_type, schedule, time, address, units, model, notes } = req.body

  if (!to || !name || !ref) return res.status(400).json({ error: 'Missing required fields' })

  const scheduleDisplay = schedule
    ? new Date(schedule + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'To be confirmed'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Booking Confirmed — GO Aircon Services</title>
</head>
<body style="margin:0;padding:0;background:#f0f7fb;font-family:'Segoe UI',Arial,sans-serif;color:#0a1f2e;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7fb;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0a1f2e 0%,#103a5a 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <div style="display:inline-block;background:#fff;border-radius:14px;padding:10px 14px;margin-bottom:18px;">
            <span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#0f6fb0;">GO</span>
            <span style="font-size:18px;font-weight:700;color:#0a1f2e;"> Aircon Services</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-.5px;">
            Your booking is confirmed! ✅
          </h1>
          <p style="color:#9fd5ee;margin:0;font-size:15px;">We'll see you on your scheduled date.</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 40px;">

          <p style="font-size:16px;margin:0 0 22px;color:#103a5a;">Hi <strong>${escHtml(name)}</strong>,</p>
          <p style="font-size:15px;margin:0 0 24px;line-height:1.65;color:#56708a;">
            Great news! Your service booking with <strong style="color:#0a1f2e;">GO Aircon Services</strong> has been 
            <strong style="color:#0f7a4f;">confirmed</strong>. Our technician will be at your location on the scheduled 
            date. Please make sure someone is home to receive us.
          </p>

          <!-- Booking Details Card -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f0f7fb;border-radius:12px;border:1px solid #d8e7f0;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#27a8d6;margin:0 0 14px;font-weight:700;">Booking Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;width:38%;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Reference</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <strong style="color:#0f6fb0;font-size:16px;font-family:monospace;">${escHtml(ref)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Service</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:14px;color:#0a1f2e;">${escHtml(service)}${work_type ? ' — ' + escHtml(work_type) : ''}</span>
                  </td>
                </tr>
                ${units && units > 1 ? `
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Units</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:14px;color:#0a1f2e;">${escHtml(String(units))}${model ? ' · ' + escHtml(model) : ''}</span>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Date</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <strong style="font-size:14px;color:#0a1f2e;">${scheduleDisplay}</strong>
                  </td>
                </tr>
                ${time ? `
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Time</span>
                  </td>
                  <td style="padding:6px 0;border-bottom:1px solid #d8e7f0;">
                    <span style="font-size:14px;color:#0a1f2e;">${escHtml(time)}</span>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:6px 0${notes ? ';border-bottom:1px solid #d8e7f0' : ''};">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Address</span>
                  </td>
                  <td style="padding:6px 0${notes ? ';border-bottom:1px solid #d8e7f0' : ''};">
                    <span style="font-size:14px;color:#0a1f2e;">${escHtml(address)}</span>
                  </td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:12px;font-family:monospace;letter-spacing:1px;text-transform:uppercase;color:#7d93a8;">Your notes</span>
                  </td>
                  <td style="padding:6px 0;">
                    <span style="font-size:14px;color:#0a1f2e;">${escHtml(notes)}</span>
                  </td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>

          <!-- What to expect -->
          <p style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#27a8d6;margin:0 0 12px;font-weight:700;">What to expect</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
              ['📞','We will call you','A team member will call to reconfirm the exact time a day before your visit.'],
              ['🏠','Be home on the day','Please ensure someone is available to receive our technician at the service address.'],
              ['🔧','Sit back & relax','Our trained technician will handle everything. We leave your space clean after every job.'],
            ].map(([ico, title, desc]) => `
            <tr>
              <td width="40" valign="top" style="padding:6px 12px 6px 0;font-size:20px;">${ico}</td>
              <td style="padding:6px 0;">
                <strong style="display:block;font-size:14px;color:#0a1f2e;margin-bottom:2px;">${title}</strong>
                <span style="font-size:13px;color:#56708a;line-height:1.5;">${desc}</span>
              </td>
            </tr>`).join('')}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="https://go-aircon-services.vercel.app/"
                style="display:inline-block;background:#0f6fb0;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:-.2px;">
                Visit Our Website
              </a>
            </td></tr>
          </table>

          <p style="font-size:14px;line-height:1.65;color:#56708a;margin:0 0 6px;">
            Need to reschedule or have questions? Don't hesitate to reach out — we're always happy to help!
          </p>
          <p style="font-size:14px;line-height:1.65;color:#56708a;margin:0;">
            Thank you for trusting <strong style="color:#0a1f2e;">GO Aircon Services</strong>. 
            We look forward to serving you! 🌟
          </p>

        </td></tr>

        <!-- Contact Footer -->
        <tr><td style="background:#103a5a;border-radius:0 0 16px 16px;padding:28px 40px;">
          <p style="font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#46c6ef;margin:0 0 16px;font-weight:700;">Get in touch</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">📞</td>
              <td style="padding:4px 0;font-size:13px;color:#cfe6f2;">
                <a href="tel:09452536433" style="color:#46c6ef;text-decoration:none;font-weight:600;">0945 253 6433</a> &nbsp;·&nbsp;
                <a href="tel:09558958908" style="color:#46c6ef;text-decoration:none;font-weight:600;">0955 895 8908</a> &nbsp;·&nbsp;
                <a href="tel:09773851187" style="color:#46c6ef;text-decoration:none;font-weight:600;">0977 385 1187</a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">📘</td>
              <td style="padding:4px 0;font-size:13px;color:#cfe6f2;">
                <a href="https://www.facebook.com/go.aircon.services" style="color:#46c6ef;text-decoration:none;font-weight:600;">facebook.com/go.aircon.services</a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">🌐</td>
              <td style="padding:4px 0;font-size:13px;color:#cfe6f2;">
                <a href="https://go-aircon-services.vercel.app/" style="color:#46c6ef;text-decoration:none;font-weight:600;">go-aircon-services.vercel.app</a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">✉️</td>
              <td style="padding:4px 0;font-size:13px;color:#cfe6f2;">
                <a href="mailto:go.aircon.services.business@gmail.com" style="color:#46c6ef;text-decoration:none;font-weight:600;">go.aircon.services.business@gmail.com</a>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">📍</td>
              <td style="padding:4px 0;font-size:13px;color:#9fd5ee;">Blk 23 Lot 81 Gentree Villas, Pasong Kawayan 1, General Trias, Cavite</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:20px 0;"/>
          <p style="margin:0;font-size:12px;color:#7fb6d2;text-align:center;">
            © ${new Date().getFullYear()} GO Aircon Services · Cleaning · Repair · Maintenance<br/>
            <span style="font-size:11px;opacity:.7;">Parañaque · Las Piñas · Muntinlupa · Laguna · Cavite</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`

  // Plain text fallback
  const text = `Hi ${name},

Your booking with GO Aircon Services has been CONFIRMED!

Booking Reference: ${ref}
Service: ${service}${work_type ? ' — ' + work_type : ''}
Scheduled Date: ${scheduleDisplay}${time ? '\nTime: ' + time : ''}
Address: ${address}${notes ? '\nYour notes: ' + notes : ''}

Our technician will be at your location on the scheduled date. We will call you a day before to reconfirm the exact time.

Need to reschedule? Contact us:
📞 0945 253 6433 / 0955 895 8908 / 0977 385 1187
📘 facebook.com/go.aircon.services
🌐 go-aircon-services.vercel.app
✉️ go.aircon.services.business@gmail.com

Thank you for trusting GO Aircon Services!
Cleaning · Repair · Maintenance`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'GO Aircon Services <onboarding@resend.dev>',
        to: [to],
        subject: `✅ Booking Confirmed — ${ref} | GO Aircon Services`,
        html,
        text,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(response.status).json({ error: data.message || 'Failed to send email' })
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('Email send error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
