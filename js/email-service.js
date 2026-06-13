/**
 * email-service.js
 * Sri Prasannanjaneya Home Needs — EmailJS Email Notification Service
 *
 * Sends emails via EmailJS Browser SDK.
 * Credentials are read from EMAILJS_CONFIG (emailjs-config.js).
 *
 * Public API:
 *   sendTicketCreatedEmail(ticket)
 *   sendStatusUpdatedEmail(ticket, previousStatus)   — requires separate template
 *   sendCommentAddedEmail(ticket, commentText, addedBy) — requires separate template
 *
 * All functions are fire-and-forget.
 * Failures are logged but NEVER thrown — they cannot block ticket creation,
 * status updates, or comment saves.
 */

// ─── Constants ─────────────────────────────────────────────────────────────────
const TRACK_LINK = 'https://sriprasannanjaneyahomeneeds.vercel.app/track-ticket.html';

// ─── Initialize EmailJS ────────────────────────────────────────────────────────
(function initEmailJS() {
    if (typeof emailjs === 'undefined') {
        console.warn('EmailJS SDK not loaded — emails will be skipped.');
        return;
    }
    if (typeof EMAILJS_CONFIG === 'undefined') {
        console.warn('EMAILJS_CONFIG not found — ensure emailjs-config.js is loaded first.');
        return;
    }
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
    console.log('EmailJS initialized. Service:', EMAILJS_CONFIG.SERVICE_ID);
})();

// ─── Date formatter ────────────────────────────────────────────────────────────
function _emailDate(isoStr) {
    const d = isoStr ? new Date(isoStr) : new Date();
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    });
}

// ─── Internal send helper ──────────────────────────────────────────────────────
/**
 * Sends an email via EmailJS. Never throws.
 * @param {string} templateId   - EmailJS Template ID
 * @param {Object} params       - Template variable map
 */
async function _sendEmailJS(templateId, params) {
    if (typeof emailjs === 'undefined') {
        console.error('EMAILJS: Email failed — SDK not loaded.');
        return;
    }
    if (typeof EMAILJS_CONFIG === 'undefined') {
        console.error('EMAILJS: Email failed — EMAILJS_CONFIG missing.');
        return;
    }

    try {
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            templateId,
            params
        );

        if (response.status === 200) {
            console.log('EMAILJS: Email sent successfully');
        } else {
            console.error('EMAILJS: Email failed', response);
        }
    } catch (error) {
        console.error('EMAILJS: Email failed', error);
        // Intentionally NOT re-throwing.
    }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Send ticket confirmation email after successful ticket creation.
 *
 * EmailJS template variables used:
 *   {{customer_name}}   Customer's full name
 *   {{ticket_number}}   e.g. SPHN-20260610-143015-431
 *   {{status}}          e.g. Open
 *   {{submitted_date}}  Formatted datetime string
 *   {{track_link}}      URL to track-ticket.html
 *   {{email}}           Recipient email address (also used by EmailJS as To)
 *
 * @param {Object} ticket
 * @param {string} ticket.email
 * @param {string} ticket.customer_name
 * @param {string} ticket.ticket_number
 * @param {string} [ticket.status]
 * @param {string} [ticket.created_at]
 */
async function sendTicketCreatedEmail(ticket) {
    const email        = ticket?.email;
    const ticketNumber = ticket?.ticket_number;
    const customerName = ticket?.customer_name || 'Customer';

    if (!email || !email.includes('@')) {
        console.warn('EMAILJS: Skipped — no valid email address.');
        return;
    }

    console.log('EMAILJS: Sending email...');
    console.log('EMAILJS: Customer =', email);
    console.log('EMAILJS: Ticket =', ticketNumber);

    await _sendEmailJS(EMAILJS_CONFIG.TEMPLATE_ID, {
        customer_name:  customerName,
        ticket_number:  ticketNumber,
        status:         ticket.status  || 'Open',
        submitted_date: _emailDate(ticket.created_at),
        track_link:     TRACK_LINK,
        email:          email,
    });
}

/**
 * Send status update notification email when admin changes ticket status.
 * Skips automatically if the status has not changed.
 * Uses shared template: template_r45di9h
 *
 * EmailJS template variables:
 *   {{customer_name}}   Customer full name
 *   {{email}}           Recipient email (To field)
 *   {{ticket_number}}   Ticket number
 *   {{status}}          New status after update
 *   {{updated_date}}    Formatted datetime
 *   {{track_link}}      URL to track-ticket.html
 *   {{assigned_to}}     Technician name (empty string if not set)
 *   {{added_by}}        Name of admin who made the change
 *   {{update_title}}    "Ticket Status Updated"
 *   {{update_icon}}     "\uD83D\uDD04"
 *   {{update_message}}  Human-readable status change sentence
 *
 * @param {Object} ticket           - Ticket object after update
 * @param {string} previousStatus   - Status before the change
 * @param {string} [addedBy]        - Admin who triggered the update
 * @param {string} [assignedTo]     - Technician assigned (overrides ticket.assigned_to)
 */
async function sendStatusUpdatedEmail(ticket, previousStatus, addedBy, assignedTo) {
    if (!ticket?.email) {
        console.warn('EMAILJS: Status update email skipped \u2014 no customer email.');
        return;
    }
    if (previousStatus === ticket.status) return; // no change \u2014 skip

    const email        = ticket.email;
    const ticketNumber = ticket.ticket_number;
    const newStatus    = ticket.status;
    // Use the explicitly passed assignedTo if provided; fall back to ticket field
    const resolvedAssignedTo = (assignedTo ?? ticket.assigned_to ?? '').trim();
    const resolvedAddedBy    = (addedBy ?? 'Admin').trim();

    console.log('EMAILJS: Sending email...');
    console.log('EMAILJS: Customer =', email);
    console.log('EMAILJS: Ticket =', ticketNumber);

    await _sendEmailJS(EMAILJS_CONFIG.TEMPLATE_UPDATES, {
        customer_name:  ticket.customer_name  || 'Customer',
        email:          email,
        ticket_number:  ticketNumber,
        status:         newStatus,
        updated_date:   _emailDate(new Date().toISOString()),
        track_link:     TRACK_LINK,
        assigned_to:    resolvedAssignedTo,
        added_by:       resolvedAddedBy,
        update_title:   'Ticket Status Updated',
        update_icon:    '\uD83D\uDD04',
        update_message: `Your service request status has been updated to ${newStatus}.`,
    });
}

/**
 * Send comment notification email after admin adds a comment.
 * Uses the same shared template as status updates: template_r45di9h
 *
 * EmailJS template variables:
 *   {{customer_name}}   Customer full name
 *   {{email}}           Recipient email (To field)
 *   {{ticket_number}}   Ticket number
 *   {{status}}          Current ticket status
 *   {{updated_date}}    Formatted datetime
 *   {{track_link}}      URL to track-ticket.html
 *   {{assigned_to}}     Technician name (empty string if not set)
 *   {{added_by}}        Name of admin who added the comment
 *   {{update_title}}    "New Comment Added"
 *   {{update_icon}}     "\uD83D\uDCAC"
 *   {{update_message}}  The actual comment text
 *
 * @param {Object} ticket      - Current ticket object
 * @param {string} commentText - The comment entered by admin
 * @param {string} addedBy     - Name of commenter
 */
async function sendCommentAddedEmail(ticket, commentText, addedBy) {
    if (!ticket?.email) {
        console.warn('EMAILJS: Comment email skipped \u2014 no customer email.');
        return;
    }
    if (!commentText || !commentText.trim()) {
        console.warn('EMAILJS: Comment email skipped \u2014 empty comment.');
        return;
    }

    const email           = ticket.email;
    const ticketNumber    = ticket.ticket_number;
    const resolvedAddedBy = (addedBy ?? 'Admin').trim();
    const resolvedAssignedTo = (ticket.assigned_to ?? '').trim();

    console.log('EMAILJS: Sending email...');
    console.log('EMAILJS: Customer =', email);
    console.log('EMAILJS: Ticket =', ticketNumber);

    await _sendEmailJS(EMAILJS_CONFIG.TEMPLATE_UPDATES, {
        customer_name:  ticket.customer_name || 'Customer',
        email:          email,
        ticket_number:  ticketNumber,
        status:         ticket.status        || 'Open',
        updated_date:   _emailDate(new Date().toISOString()),
        track_link:     TRACK_LINK,
        assigned_to:    resolvedAssignedTo,
        added_by:       resolvedAddedBy,
        update_title:   'New Comment Added',
        update_icon:    '\uD83D\uDCAC',
        update_message: commentText.trim(),
    });
}
