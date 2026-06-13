// Supabase Edge Function: send-email
// Deno runtime · Deploy via: supabase functions deploy send-email
//
// Handles three email types:
//   ticket_created   → Customer confirmation on ticket creation
//   status_updated   → Customer notification on status change
//   comment_added    → Customer notification when admin adds a comment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ─── Configuration ───────────────────────────────────────────────────────────
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'sriprasannanjaneyahomeneeds16@gmail.com';
const FROM_NAME      = 'Sri Prasannanjaneya Home Needs';
const TRACK_URL      = Deno.env.get('TRACK_TICKET_URL') ?? 'https://your-domain.com/track-ticket.html';

// ─── CORS headers ────────────────────────────────────────────────────────────
const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Shared HTML email wrapper ────────────────────────────────────────────────
function wrapEmail(bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sri Prasannanjaneya Home Needs</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#d4af37,#b8960c);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#000;font-size:20px;font-weight:700;letter-spacing:0.5px;">
              Sri Prasannanjaneya Home Needs
            </h1>
            <p style="margin:6px 0 0;color:rgba(0,0,0,0.65);font-size:13px;">Customer Service Portal</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Auto-Generated Disclaimer Notice -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#0d0d0d;border:1px solid rgba(212,175,55,0.35);border-radius:10px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:700;
                            text-transform:uppercase;letter-spacing:0.6px;">
                    ⚠ Important Notice
                  </p>
                  <p style="margin:0 0 10px;color:rgba(255,255,255,0.75);font-size:12px;line-height:1.65;">
                    This is an <strong style="color:#fff;">automatically generated</strong> service notification
                    from Sri Prasannanjaneya Home Needs.
                    <strong style="color:#fff;">Please do not reply directly to this email.</strong>
                  </p>
                  <p style="margin:0;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.65;">
                    For any questions, service enquiries, ticket updates, installation schedules,
                    warranty support, or service assistance, please refer to the support section below.
                    Our customer support team will be happy to assist you.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:24px 32px;border-top:1px solid rgba(212,175,55,0.15);">
            <p style="margin:0 0 10px;color:#d4af37;font-size:13px;font-weight:700;">Need Help?</p>
            <p style="margin:0 0 12px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.65;">
              If you have any questions regarding your service request, ticket status, technician visit,
              installation schedule, warranty support, or product service, please contact us:
            </p>
            <p style="margin:4px 0;color:rgba(255,255,255,0.6);font-size:12px;">
              📧 <a href="mailto:sriprasannanjaneyahomeneeds16@gmail.com"
                    style="color:#d4af37;text-decoration:none;">sriprasannanjaneyahomeneeds16@gmail.com</a>
            </p>
            <p style="margin:4px 0;color:rgba(255,255,255,0.6);font-size:12px;">
              📞 <a href="tel:+919885946179" style="color:#d4af37;text-decoration:none;">+91 9885946179</a>
            </p>
            <p style="margin:4px 0;color:rgba(255,255,255,0.6);font-size:12px;">
              🔍 <a href="${TRACK_URL}" style="color:#d4af37;text-decoration:none;">Track Your Ticket</a>
            </p>
            <p style="margin:18px 0 0;color:rgba(255,255,255,0.3);font-size:11px;
                      border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;line-height:1.7;">
              Please keep your Ticket Number handy when contacting support.<br>
              Thank you for choosing Sri Prasannanjaneya Home Needs.<br><br>
              <strong style="color:rgba(255,255,255,0.4);">
                Sri Prasannanjaneya Home Needs &nbsp;·&nbsp; Customer Support Team
              </strong>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template: Ticket Created ─────────────────────────────────────────────────

function templateTicketCreated(d: {
    customerName: string;
    ticketNumber: string;
    status: string;
    submittedDate: string;
    trackUrl: string;
}): { subject: string; html: string } {
    const subject = `Service Request Received - ${d.ticketNumber}`;
    const body = `
      <h2 style="color:#d4af37;font-size:18px;margin:0 0 6px;">Service Request Received ✓</h2>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 24px;font-size:13px;">
        Hi <strong style="color:#fff;">${d.customerName}</strong>, your service request has been received and is being processed.
      </p>

      <!-- Ticket Summary Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:10px;margin-bottom:24px;">
        <tr><td style="padding:20px;">
          ${row('Ticket Number', `<span style="font-family:monospace;color:#d4af37;font-size:15px;font-weight:700;">${d.ticketNumber}</span>`)}
          ${row('Status',        badge(d.status))}
          ${row('Submitted On',  d.submittedDate)}
        </td></tr>
      </table>

      <!-- Track CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:4px 0 20px;">
          <a href="${d.trackUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8960c);color:#000;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
            🔍 Track Your Service Request
          </a>
        </td></tr>
      </table>

      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;">
        Our team will review your request and update the status shortly. You will be notified at every step.
      </p>`;

    return { subject, html: wrapEmail(body) };
}

// ─── Template: Status Updated ─────────────────────────────────────────────────
function templateStatusUpdated(d: {
    ticketNumber: string;
    previousStatus: string;
    newStatus: string;
    assignedTo: string;
    updatedDate: string;
    trackUrl: string;
}): { subject: string; html: string } {
    const subject = `Ticket Status Updated - ${d.ticketNumber}`;
    const body = `
      <h2 style="color:#d4af37;font-size:18px;margin:0 0 6px;">Ticket Status Updated</h2>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 24px;font-size:13px;">
        There's an update on your service request. Here are the latest details:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:10px;margin-bottom:24px;">
        <tr><td style="padding:20px;">
          ${row('Ticket Number',    `<span style="font-family:monospace;color:#d4af37;font-weight:700;">${d.ticketNumber}</span>`)}
          ${row('Previous Status',  badge(d.previousStatus, true))}
          ${row('New Status',       badge(d.newStatus))}
          ${d.assignedTo ? row('Assigned To', d.assignedTo) : ''}
          ${row('Updated On',       d.updatedDate)}
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:4px 0 20px;">
          <a href="${d.trackUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8960c);color:#000;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
            🔍 View Full Ticket Status
          </a>
        </td></tr>
      </table>`;

    return { subject, html: wrapEmail(body) };
}

// ─── Template: Comment Added ──────────────────────────────────────────────────
function templateCommentAdded(d: {
    ticketNumber: string;
    commentText: string;
    addedBy: string;
    commentDate: string;
    trackUrl: string;
}): { subject: string; html: string } {
    const subject = `New Update on Your Service Request - ${d.ticketNumber}`;
    const body = `
      <h2 style="color:#d4af37;font-size:18px;margin:0 0 6px;">New Update from Our Team 💬</h2>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 24px;font-size:13px;">
        Our team has added a new comment on your service request <strong style="color:#fff;">${d.ticketNumber}</strong>:
      </p>

      <!-- Comment bubble -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:rgba(255,255,255,0.04);border-left:3px solid #d4af37;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:rgba(255,255,255,0.45);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
            ${d.addedBy} · ${d.commentDate}
          </p>
          <p style="margin:0;color:#fff;font-size:14px;line-height:1.6;">${d.commentText}</p>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          ${row('Ticket Number', `<span style="font-family:monospace;color:#d4af37;font-weight:700;">${d.ticketNumber}</span>`)}
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:4px 0 20px;">
          <a href="${d.trackUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8960c);color:#000;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;">
            🔍 View Full Ticket &amp; Comments
          </a>
        </td></tr>
      </table>`;

    return { subject, html: wrapEmail(body) };
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function row(label: string, value: string): string {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
      <tr>
        <td width="140" style="color:rgba(255,255,255,0.45);font-size:12px;vertical-align:top;padding-top:2px;">${label}</td>
        <td style="color:#fff;font-size:13px;font-weight:500;">${value}</td>
      </tr>
    </table>`;
}

const STATUS_COLORS: Record<string, string> = {
    'Open':        '#60a5fa',
    'Assigned':    '#fbbf24',
    'In Progress': '#c084fc',
    'Completed':   '#2ecc71',
    'Closed':      '#a0a0a0',
};

function badge(status: string, muted = false): string {
    const color = STATUS_COLORS[status] ?? '#a0a0a0';
    const bg    = muted ? 'rgba(255,255,255,0.05)' : `${color}20`;
    return `<span style="background:${bg};color:${muted ? '#888' : color};border:1px solid ${muted ? 'rgba(255,255,255,0.1)' : color + '40'};
              border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600;">${status}</span>`;
}

// ─── Send via Resend ──────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log('Email queued:', subject, '→', to);

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({
            from:    `${FROM_NAME} <${FROM_EMAIL}>`,
            to:      [to],
            subject: subject,
            html:    html,
        }),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error('Email send failed:', res.status, errorBody);
        throw new Error(`Resend error ${res.status}: ${errorBody}`);
    }

    const result = await res.json();
    console.log('Email sent successfully. ID:', result.id);
}

// ─── Request Handler ──────────────────────────────────────────────────────────
serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is not set');
        }

        const { type, to, data } = await req.json();

        if (!type || !to || !data) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: type, to, data' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let subject = '';
        let html    = '';

        switch (type) {
            case 'ticket_created': {
                const result = templateTicketCreated({
                    customerName:  data.customerName,
                    ticketNumber:  data.ticketNumber,
                    status:        data.status ?? 'Open',
                    submittedDate: data.submittedDate ?? new Date().toLocaleString('en-IN'),
                    trackUrl:      `${TRACK_URL}`,
                });
                subject = result.subject;
                html    = result.html;
                break;
            }
            case 'status_updated': {
                const result = templateStatusUpdated({
                    ticketNumber:   data.ticketNumber,
                    previousStatus: data.previousStatus,
                    newStatus:      data.newStatus,
                    assignedTo:     data.assignedTo ?? '',
                    updatedDate:    data.updatedDate ?? new Date().toLocaleString('en-IN'),
                    trackUrl:       `${TRACK_URL}`,
                });
                subject = result.subject;
                html    = result.html;
                break;
            }
            case 'comment_added': {
                const result = templateCommentAdded({
                    ticketNumber: data.ticketNumber,
                    commentText:  data.commentText,
                    addedBy:      data.addedBy,
                    commentDate:  data.commentDate ?? new Date().toLocaleString('en-IN'),
                    trackUrl:     `${TRACK_URL}`,
                });
                subject = result.subject;
                html    = result.html;
                break;
            }
            default:
                return new Response(
                    JSON.stringify({ error: `Unknown email type: ${type}` }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }

        await sendEmail(to, subject, html);

        return new Response(
            JSON.stringify({ success: true, message: 'Email sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Edge Function error:', message);

        return new Response(
            JSON.stringify({ success: false, error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
