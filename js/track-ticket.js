/**
 * Track Ticket — Sri Prasannanjaneya Home Needs
 * Customer-facing ticket status tracker using Supabase.
 */

// ─── Supabase Configuration ──────────────────────────────────────────────────
const SUPABASE_URL      = 'https://kzjfquajbdkyexxxfsem.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amZxdWFqYmRreWV4eHhmc2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDkxNDIsImV4cCI6MjA5NjU4NTE0Mn0.KXlAMFFUGBHL6TCO-jchQV22ptDCrCOaTL7nz_xMstQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const trackForm      = document.getElementById('trackForm');
const ticketNumInput = document.getElementById('ticketNumber');
const mobileInput    = document.getElementById('mobileNumber');
const trackBtn       = document.getElementById('trackBtn');
const trackBtnText   = document.getElementById('trackBtnText');
const trackSpinner   = document.getElementById('trackSpinner');

const searchCard     = document.getElementById('searchCard');
const notFoundCard   = document.getElementById('notFoundCard');
const resultWrapper  = document.getElementById('resultWrapper');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safe(val) {
    return val && String(val).trim() ? String(val).trim() : '–';
}

function formatDate(isoStr) {
    if (!isoStr) return '–';
    return new Date(isoStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateShort(isoStr) {
    if (!isoStr) return '–';
    return new Date(isoStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm() {
    let valid = true;

    const ticketVal = ticketNumInput.value.trim();
    const mobileVal = mobileInput.value.trim();

    // Ticket number
    const ticketErr = document.getElementById('ticketNumError');
    if (!ticketVal) {
        ticketErr.textContent = 'Ticket number is required.';
        ticketNumInput.classList.add('is-error');
        valid = false;
    } else {
        ticketErr.textContent = '';
        ticketNumInput.classList.remove('is-error');
    }

    // Mobile
    const mobileErr = document.getElementById('mobileError');
    if (!mobileVal) {
        mobileErr.textContent = 'Mobile number is required.';
        mobileInput.classList.add('is-error');
        valid = false;
    } else if (!/^\d{10}$/.test(mobileVal)) {
        mobileErr.textContent = 'Mobile number must be exactly 10 digits.';
        mobileInput.classList.add('is-error');
        valid = false;
    } else {
        mobileErr.textContent = '';
        mobileInput.classList.remove('is-error');
    }

    return valid;
}

// Clear errors on input
ticketNumInput.addEventListener('input', () => {
    document.getElementById('ticketNumError').textContent = '';
    ticketNumInput.classList.remove('is-error');
});

mobileInput.addEventListener('input', () => {
    // Only allow digits
    mobileInput.value = mobileInput.value.replace(/\D/g, '');
    document.getElementById('mobileError').textContent = '';
    mobileInput.classList.remove('is-error');
});

// ─── Show / Hide Sections ─────────────────────────────────────────────────────
function showSearch() {
    searchCard.style.display    = 'block';
    notFoundCard.style.display  = 'none';
    resultWrapper.style.display = 'none';
}

function showNotFound() {
    searchCard.style.display    = 'none';
    notFoundCard.style.display  = 'block';
    resultWrapper.style.display = 'none';
}

function showResult() {
    searchCard.style.display    = 'none';
    notFoundCard.style.display  = 'none';
    resultWrapper.style.display = 'flex';
}

// Try again / Search again buttons
document.getElementById('tryAgainBtn').addEventListener('click', () => {
    showSearch();
    ticketNumInput.focus();
});

document.getElementById('searchAgainBtn').addEventListener('click', () => {
    showSearch();
    ticketNumInput.value = '';
    mobileInput.value    = '';
    ticketNumInput.focus();
});

// ─── Status Badge ─────────────────────────────────────────────────────────────
function applyStatusBadge(elId, status) {
    const el = document.getElementById(elId);
    if (!el) return;

    // Map status → CSS class (handle spaces → hyphens)
    const cls = (status || 'Open').replace(/\s+/g, '-');
    el.textContent = status || 'Open';
    el.className   = 'status-badge-lg ' + cls;
}

// ─── Populate Result Card ─────────────────────────────────────────────────────
function populateResult(ticket) {
    document.getElementById('rTicketNum').textContent    = safe(ticket.ticket_number);
    document.getElementById('rName').textContent         = safe(ticket.customer_name);
    document.getElementById('rMobile').textContent       = safe(ticket.mobile);
    document.getElementById('rCategory').textContent     = safe(ticket.product_type);
    document.getElementById('rBrand').textContent        = safe(ticket.brand);
    document.getElementById('rModel').textContent        = safe(ticket.model_number);
    document.getElementById('rRequestType').textContent  = safe(ticket.request_type);
    document.getElementById('rCreatedAt').textContent    = formatDate(ticket.created_at);
    document.getElementById('rAssignedTo').textContent   = ticket.assigned_to?.trim() ? ticket.assigned_to.trim() : 'Not yet assigned';
    document.getElementById('rStatusText').textContent   = safe(ticket.status);

    // Status badge
    applyStatusBadge('rStatusBadge', ticket.status);

    // Completed date
    const completedRow = document.getElementById('rCompletedRow');
    if (ticket.completed_at) {
        document.getElementById('rCompletedAt').textContent = formatDate(ticket.completed_at);
        completedRow.style.display = 'flex';
    } else {
        completedRow.style.display = 'none';
    }

    // Invoice
    renderInvoice(ticket.invoice_image_url);
}

// ─── Invoice Rendering ────────────────────────────────────────────────────────
function renderInvoice(filePath) {
    const section = document.getElementById('invoiceSection');
    const content = document.getElementById('invoiceContent');

    if (!filePath) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const { data } = supabaseClient.storage.from('invoice').getPublicUrl(filePath);
    const url = data?.publicUrl;

    if (!url) {
        content.innerHTML = `<p class="invoice-error-text">Invoice image unavailable.</p>`;
        return;
    }

    const ext = filePath.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf';

    if (isPdf) {
        content.innerHTML = `
            <a class="btn-view-invoice" href="${url}" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-file-pdf" style="color:#ff4d4d;"></i>
                View Uploaded Invoice (PDF)
            </a>`;
    } else {
        content.innerHTML = `
            <div class="invoice-thumb-wrap" id="invoiceThumbWrap">
                <img
                    class="invoice-thumb"
                    id="invoiceThumb"
                    src="${url}"
                    alt="Invoice"
                >
            </div>
            <br>
            <button class="btn-view-invoice" id="btnFullInvoice">
                <i class="fas fa-expand-alt"></i>
                View Uploaded Invoice
            </button>`;

        // Wait for DOM to update
        setTimeout(() => {
            const thumb    = document.getElementById('invoiceThumb');
            const fullBtn  = document.getElementById('btnFullInvoice');
            const thumbWrap= document.getElementById('invoiceThumbWrap');

            const openViewer = () => openInvViewer(url);

            thumb?.addEventListener('click', openViewer);
            fullBtn?.addEventListener('click', openViewer);
            thumbWrap?.addEventListener('click', openViewer);

            if (thumb) {
                thumb.onerror = () => {
                    thumb.style.display = 'none';
                    content.insertAdjacentHTML('afterbegin',
                        `<p class="invoice-error-text">Invoice image unavailable.</p>`);
                };
            }
        }, 0);
    }
}

// ─── Comments ─────────────────────────────────────────────────────────────────
async function loadComments(ticketNumber) {
    const list = document.getElementById('commentsList');
    list.innerHTML = `<div class="comments-loading"><div class="mini-spinner"></div> Loading comments…</div>`;

    console.log('Loading comments for ticket:', ticketNumber);

    try {
        const { data: commentsData, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('ticket_number', ticketNumber)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Comments fetch error:', error);
            console.error('Error code:', error.code, '| Message:', error.message);
            list.innerHTML = `<p class="no-comments">Failed to load comments: ${error.message}</p>`;
            return;
        }

        console.log('Comments found:', commentsData);
        console.log('Comment count:', commentsData ? commentsData.length : 0);

        if (!commentsData || commentsData.length === 0) {
            list.innerHTML = `<p class="no-comments">No comments yet.</p>`;
            console.log('Comment render complete');
            return;
        }

        list.innerHTML = commentsData.map(c => `
            <div class="comment-item">
                <div class="comment-meta">
                    <span class="comment-author">
                        <i class="fas fa-user-circle"></i>
                        ${c.added_by ? c.added_by.trim() : '–'}
                    </span>
                    <span class="comment-date">${formatDate(c.created_at)}</span>
                </div>
                <p class="comment-body">${c.comment || '–'}</p>
            </div>
        `).join('');

        console.log('Comment render complete');

    } catch (err) {
        console.error('Load comments unexpected error:', err);
        list.innerHTML = `<p class="no-comments">Unable to load comments.</p>`;
    }
}


// ─── Form Submit → Supabase Query ─────────────────────────────────────────────
trackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const ticketNumber = ticketNumInput.value.trim().toUpperCase();
    const mobileNumber = mobileInput.value.trim();

    // Loading state
    trackBtn.disabled        = true;
    trackBtnText.innerHTML   = 'Searching…';
    trackSpinner.style.display = 'inline-block';

    console.log('Searching ticket:', ticketNumber, 'Mobile:', mobileNumber);

    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .select('*')
            .eq('ticket_number', ticketNumber)
            .eq('mobile', mobileNumber)
            .single();

        if (error || !data) {
            console.log('No ticket found for:', ticketNumber, mobileNumber);
            showNotFound();
            return;
        }

        console.log('Ticket found:', data.ticket_number);

        // Populate result card
        populateResult(data);
        showResult();

        // Load comments async
        loadComments(data.ticket_number);

    } catch (err) {
        console.error('Search error:', err);
        showNotFound();
    } finally {
        trackBtn.disabled          = false;
        trackBtnText.innerHTML     = '<i class="fas fa-search"></i> Track Status';
        trackSpinner.style.display = 'none';
    }
});

// ─── Invoice Fullscreen Viewer ────────────────────────────────────────────────
let invScale      = 1;
let invTranslateX = 0;
let invTranslateY = 0;

const invViewerOverlay = document.getElementById('invViewerOverlay');
const invViewerImg     = document.getElementById('invViewerImg');
const invViewerStage   = document.getElementById('invViewerStage');
const invViewerClose   = document.getElementById('invViewerClose');

function openInvViewer(src) {
    invScale      = 1;
    invTranslateX = 0;
    invTranslateY = 0;
    invViewerImg.src = src;
    applyInvTransform();
    invViewerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeInvViewer() {
    invViewerOverlay.classList.remove('active');
    document.body.style.overflow = '';
    invViewerImg.src = '';
}

function applyInvTransform() {
    invViewerImg.style.transform =
        `translate(${invTranslateX}px, ${invTranslateY}px) scale(${invScale})`;
}

invViewerClose?.addEventListener('click', closeInvViewer);

invViewerOverlay?.addEventListener('click', (e) => {
    if (e.target === invViewerOverlay || e.target === invViewerStage) closeInvViewer();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && invViewerOverlay?.classList.contains('active')) closeInvViewer();
});

// Mouse wheel zoom
invViewerStage?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? -0.15 : 0.15;
    invScale = Math.min(5, Math.max(0.3, invScale + step));
    applyInvTransform();
}, { passive: false });

// Double-click: toggle 1× / 2.5×
invViewerStage?.addEventListener('dblclick', () => {
    if (invScale !== 1) {
        invScale = 1; invTranslateX = 0; invTranslateY = 0;
    } else {
        invScale = 2.5;
    }
    applyInvTransform();
});
