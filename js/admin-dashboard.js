/**
 * Admin Dashboard — Sri Prasannanjaneya Home Needs
 * Handles Supabase data loading, ticket management, comments, and UI interactions.
 */

// ─── Supabase Configuration ──────────────────────────────────────────────────
const SUPABASE_URL      = 'https://kzjfquajbdkyexxxfsem.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amZxdWFqYmRreWV4eHhmc2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDkxNDIsImV4cCI6MjA5NjU4NTE0Mn0.KXlAMFFUGBHL6TCO-jchQV22ptDCrCOaTL7nz_xMstQ';
const SESSION_KEY       = 'sphn_admin_session';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth Guard ──────────────────────────────────────────────────────────────
if (!localStorage.getItem(SESSION_KEY)) {
    window.location.replace('admin-login.html');
}

// ─── State ────────────────────────────────────────────────────────────────────
let allTickets     = [];     // full list from Supabase
let filteredTickets = [];    // after search + status filter
let activeStatus   = 'all';
let currentTicket  = null;   // ticket open in modal

// ─── DOM References ───────────────────────────────────────────────────────────
const tableBody     = document.getElementById('ticketTableBody');
const tableCount    = document.getElementById('tableCount');
const searchInput   = document.getElementById('searchInput');
const clearSearchBtn= document.getElementById('clearSearch');
const refreshBtn    = document.getElementById('refreshBtn');
const filterBtns    = document.querySelectorAll('.filter-btn');

// Stats
const countTotal     = document.getElementById('countTotal');
const countOpen      = document.getElementById('countOpen');
const countAssigned  = document.getElementById('countAssigned');
const countCompleted = document.getElementById('countCompleted');

// Modal
const modalOverlay   = document.getElementById('modalOverlay');
const modalClose     = document.getElementById('modalClose');

// Logout buttons
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('logoutBtnTop')?.addEventListener('click', logout);

// Sidebar mobile toggle
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const menuToggle      = document.getElementById('menuToggle');
const sidebarClose    = document.getElementById('sidebarClose');

menuToggle?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
});

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

sidebarClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace('admin-login.html');
}

// ─── Toast Notification ───────────────────────────────────────────────────────
let toastTimeout;
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className   = 'toast' + (isError ? ' error' : '');

    clearTimeout(toastTimeout);
    // Force reflow to restart animation if already shown
    void toast.offsetWidth;
    toast.classList.add('show');

    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ─── Format Helpers ───────────────────────────────────────────────────────────
function formatDate(isoStr) {
    if (!isoStr) return '–';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
        hour:  '2-digit',
        minute:'2-digit'
    });
}

function formatDateShort(isoStr) {
    if (!isoStr) return '–';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function safe(val) {
    return val && val.trim() ? val.trim() : '–';
}

// ─── Stats Update ─────────────────────────────────────────────────────────────
function updateStats(tickets) {
    countTotal.textContent     = tickets.length;
    countOpen.textContent      = tickets.filter(t => t.status === 'Open').length;
    countAssigned.textContent  = tickets.filter(t => t.status === 'Assigned').length;
    countCompleted.textContent = tickets.filter(t => t.status === 'Completed').length;
}

// ─── Render Table ──────────────────────────────────────────────────────────────
function renderTable(tickets) {
    tableCount.textContent = `Showing ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`;

    if (tickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">No tickets found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = tickets.map(ticket => `
        <tr>
            <td><span class="ticket-number">${ticket.ticket_number || '–'}</span></td>
            <td>${safe(ticket.customer_name)}</td>
            <td>${safe(ticket.mobile)}</td>
            <td>${safe(ticket.product_type)}</td>
            <td>${safe(ticket.brand)}</td>
            <td>${safe(ticket.request_type)}</td>
            <td><span class="status-badge ${ticket.status || 'Open'}">${ticket.status || 'Open'}</span></td>
            <td>${formatDateShort(ticket.created_at)}</td>
            <td>
                <button
                    class="btn-view"
                    data-id="${ticket.id}"
                    aria-label="View ticket ${ticket.ticket_number}"
                >
                    View Details
                </button>
            </td>
        </tr>
    `).join('');

    // Attach view-detail button listeners
    tableBody.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const ticket = allTickets.find(t => String(t.id) === String(id));
            if (ticket) openModal(ticket);
        });
    });
}

// ─── Filter & Search ──────────────────────────────────────────────────────────
function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();

    filteredTickets = allTickets.filter(t => {
        // Status filter
        if (activeStatus !== 'all' && t.status !== activeStatus) return false;

        // Text search
        if (query) {
            const haystack = [
                t.ticket_number,
                t.customer_name,
                t.mobile
            ].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
        }

        return true;
    });

    renderTable(filteredTickets);
}

// Search input listener
searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    applyFilters();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
});

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatus = btn.getAttribute('data-status');
        applyFilters();
    });
});

// ─── Load All Tickets ─────────────────────────────────────────────────────────
async function loadTickets() {
    // Show loading state
    tableBody.innerHTML = `<tr><td colspan="9" class="loading-row"><div class="loading-spinner"></div>Loading tickets…</td></tr>`;
    tableCount.textContent = 'Loading…';

    try {
        const { data, error } = await supabaseClient
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allTickets = data || [];
        updateStats(allTickets);
        applyFilters();

    } catch (err) {
        console.error('Failed to load tickets:', err);
        tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">Failed to load tickets. Please refresh.</td></tr>`;
        showToast('Failed to load tickets', true);
    }
}

// Refresh button
refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');
    await loadTickets();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
    showToast('Tickets refreshed');
});

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(ticket) {
    currentTicket = ticket;

    // Header
    document.getElementById('modalTicketNum').textContent = ticket.ticket_number || 'Ticket';
    document.getElementById('modalCreatedAt').textContent = 'Created: ' + formatDate(ticket.created_at);

    // Customer
    document.getElementById('mCustomerName').textContent   = safe(ticket.customer_name);
    document.getElementById('mMobile').textContent         = safe(ticket.mobile);
    document.getElementById('mEmail').textContent          = safe(ticket.email);
    document.getElementById('mContactPref').textContent    = safe(ticket.preferred_contact);
    document.getElementById('mServiceAddress').textContent = safe(ticket.service_address);

    // Product
    document.getElementById('mCategory').textContent = safe(ticket.product_type);
    document.getElementById('mBrand').textContent    = safe(ticket.brand);
    document.getElementById('mModel').textContent    = safe(ticket.model_number);
    document.getElementById('mSerial').textContent   = safe(ticket.serial_number);

    // Purchase
    document.getElementById('mInvoiceNum').textContent  = safe(ticket.invoice_number);
    document.getElementById('mInvoiceDate').textContent = ticket.invoice_date ? formatDateShort(ticket.invoice_date) : '–';
    document.getElementById('mPurchasedFrom').textContent = safe(ticket.purchased_from);

    // Store name conditional
    const storeRow = document.getElementById('mStoreRow');
    if (ticket.purchased_from === 'Other Store' && ticket.store_name) {
        document.getElementById('mStoreName').textContent = ticket.store_name;
        storeRow.style.display = 'flex';
    } else {
        storeRow.style.display = 'none';
    }

    // Request
    document.getElementById('mRequestType').textContent = safe(ticket.request_type);
    document.getElementById('mIssueDesc').textContent   = ticket.issue_description?.trim() || '(No additional details)';

    // Invoice image
    loadInvoicePreview(ticket.invoice_image_url);

    // Status & Assigned To
    document.getElementById('statusSelect').value    = ticket.status || 'Open';
    document.getElementById('assignedToInput').value = ticket.assigned_to || '';

    // Clear feedback and form fields
    setFeedback('updateFeedback', '');
    document.getElementById('commentText').value    = '';
    document.getElementById('commentAddedBy').value = '';

    // Load comments
    loadComments(ticket.ticket_number);

    // Show modal
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    currentTicket = null;
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});


// ─── Invoice Preview (Public URL) ────────────────────────────────────────────
function loadInvoicePreview(filePath) {
    const previewLoading   = document.getElementById('previewLoading');
    const invoiceImg       = document.getElementById('invoiceImg');
    const invoicePdfLink   = document.getElementById('invoicePdfLink');
    const invoiceNoPreview = document.getElementById('invoiceNoPreview');

    // Reset all elements
    previewLoading.style.display   = 'flex';
    invoiceImg.style.display       = 'none';
    invoicePdfLink.style.display   = 'none';
    invoiceNoPreview.style.display = 'none';
    invoiceImg.src                 = '';
    invoiceImg.onclick             = null;

    if (!filePath) {
        previewLoading.style.display   = 'none';
        invoiceNoPreview.style.display = 'block';
        invoiceNoPreview.textContent   = 'No invoice image uploaded.';
        return;
    }

    console.log('Invoice path:', filePath);

    // Generate public URL (synchronous — no await needed)
    const { data } = supabaseClient.storage
        .from('invoice')
        .getPublicUrl(filePath);

    const generatedUrl = data?.publicUrl;
    console.log('Generated image URL:', generatedUrl);

    previewLoading.style.display = 'none';

    if (!generatedUrl) {
        invoiceNoPreview.style.display = 'block';
        invoiceNoPreview.textContent   = 'Invoice image unavailable.';
        return;
    }

    const ext = filePath.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf';

    if (isPdf) {
        invoicePdfLink.href          = generatedUrl;
        invoicePdfLink.style.display = 'flex';
    } else {
        invoiceImg.src           = generatedUrl;
        invoiceImg.style.display = 'block';
        invoiceImg.style.cursor  = 'zoom-in';

        // Error handler
        invoiceImg.onerror = () => {
            invoiceImg.style.display       = 'none';
            invoiceNoPreview.style.display = 'block';
            invoiceNoPreview.textContent   = 'Invoice image unavailable.';
        };

        // Click to open fullscreen viewer
        invoiceImg.onclick = () => openImageViewer(generatedUrl);
    }
}

// ─── Fullscreen Image Viewer ──────────────────────────────────────────────────
let viewerScale      = 1;
let viewerTranslateX = 0;
let viewerTranslateY = 0;

const imgViewerOverlay = document.getElementById('imgViewerOverlay');
const imgViewerImage   = document.getElementById('imgViewerImage');
const imgViewerStage   = document.getElementById('imgViewerStage');
const imgViewerClose   = document.getElementById('imgViewerClose');

function openImageViewer(src) {
    viewerScale      = 1;
    viewerTranslateX = 0;
    viewerTranslateY = 0;
    imgViewerImage.src = src;
    applyViewerTransform();
    imgViewerOverlay.classList.add('active');
    // Don't change body overflow — ticket modal already manages it
}

function closeImageViewer() {
    imgViewerOverlay.classList.remove('active');
    imgViewerImage.src = '';
}

function applyViewerTransform() {
    imgViewerImage.style.transform =
        `translate(${viewerTranslateX}px, ${viewerTranslateY}px) scale(${viewerScale})`;
}

imgViewerClose?.addEventListener('click', closeImageViewer);

imgViewerOverlay?.addEventListener('click', (e) => {
    if (e.target === imgViewerOverlay || e.target === imgViewerStage) closeImageViewer();
});

// ESC key — close viewer first if open, else close ticket modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (imgViewerOverlay?.classList.contains('active')) {
            closeImageViewer();
        } else if (modalOverlay?.classList.contains('active')) {
            closeModal();
        }
    }
});

// Mouse wheel zoom
imgViewerStage?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomStep = e.deltaY > 0 ? -0.15 : 0.15;
    viewerScale = Math.min(5, Math.max(0.3, viewerScale + zoomStep));
    applyViewerTransform();
}, { passive: false });

// Double-click: toggle between fit-screen and 2.5× zoom
imgViewerStage?.addEventListener('dblclick', () => {
    if (viewerScale !== 1) {
        viewerScale      = 1;
        viewerTranslateX = 0;
        viewerTranslateY = 0;
    } else {
        viewerScale = 2.5;
    }
    applyViewerTransform();
});

// ─── Update Ticket (+ optional comment in one action) ─────────────────────────
const updateTicketBtn = document.getElementById('updateTicketBtn');
const updateBtnText   = document.getElementById('updateBtnText');
const updateSpinner   = document.getElementById('updateSpinner');

updateTicketBtn.addEventListener('click', async () => {
    if (!currentTicket) return;

    const newStatus     = document.getElementById('statusSelect').value;
    const newAssignedTo = document.getElementById('assignedToInput').value.trim() || null;
    const commentText   = document.getElementById('commentText').value.trim();
    const addedBy       = document.getElementById('commentAddedBy').value.trim() || 'Admin';

    // Capture previous status BEFORE any update
    const previousStatus = currentTicket.status;

    updateTicketBtn.disabled     = true;
    updateBtnText.textContent    = 'Updating…';
    updateSpinner.style.display  = 'inline-block';
    setFeedback('updateFeedback', '');

    try {
        // 1. Build ticket update payload
        const updatePayload = {
            status:      newStatus,
            assigned_to: newAssignedTo
        };

        // Auto-set completed_at when marking as Completed
        if (newStatus === 'Completed' && currentTicket.status !== 'Completed') {
            updatePayload.completed_at = new Date().toISOString();
        }
        // Clear completed_at if reverting from Completed
        if (newStatus !== 'Completed' && currentTicket.status === 'Completed') {
            updatePayload.completed_at = null;
        }

        const { error: ticketError } = await supabaseClient
            .from('tickets')
            .update(updatePayload)
            .eq('id', currentTicket.id);

        if (ticketError) throw ticketError;

        // Update local state
        currentTicket = { ...currentTicket, ...updatePayload };
        const idx = allTickets.findIndex(t => t.id === currentTicket.id);
        if (idx !== -1) allTickets[idx] = currentTicket;

        // Send status update email only when status actually changed (fire-and-forget)
        if (newStatus !== previousStatus) {
            sendStatusUpdatedEmail(currentTicket, previousStatus, addedBy, newAssignedTo);
        }

        // 2. Insert comment if provided
        if (commentText) {
            const { error: commentError } = await supabaseClient
                .from('comments')
                .insert([{
                    ticket_number: currentTicket.ticket_number,
                    comment:       commentText,
                    added_by:      addedBy
                }]);

            if (commentError) throw commentError;

            // Send comment notification email (fire-and-forget)
            sendCommentAddedEmail(currentTicket, commentText, addedBy);

            // Clear comment field and reload history
            document.getElementById('commentText').value = '';
            await loadComments(currentTicket.ticket_number);
        }

        // Refresh stats + table
        updateStats(allTickets);
        applyFilters();

        showToast('Ticket updated successfully');
        console.log('Ticket updated:', currentTicket.ticket_number);

        // Close modal — return user to dashboard list
        closeModal();

    } catch (err) {
        console.error('Ticket update error:', err);
        setFeedback('updateFeedback', '✗ Update failed. Try again.', 'error');
        showToast('Update failed', true);
    } finally {
        updateTicketBtn.disabled    = false;
        updateBtnText.textContent   = 'Update Ticket';
        updateSpinner.style.display = 'none';
    }
});

// ─── Load Comments ────────────────────────────────────────────────────────────
async function loadComments(ticketNumber) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = `<div class="loading-row small"><div class="loading-spinner small"></div> Loading comments…</div>`;

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
            commentsList.innerHTML = `<p class="no-comments">Failed to load comments: ${error.message}</p>`;
            return;
        }

        console.log('Comments found:', commentsData);
        console.log('Comment count:', commentsData ? commentsData.length : 0);

        renderComments(commentsData || []);
        console.log('Comment render complete');

    } catch (err) {
        console.error('Load comments unexpected error:', err);
        commentsList.innerHTML = `<p class="no-comments">Failed to load comments.</p>`;
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');

    if (!comments.length) {
        commentsList.innerHTML = `<p class="no-comments">No comments yet.</p>`;
        return;
    }

    commentsList.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-meta">
                <span class="comment-author"><i class="fas fa-user-circle"></i> ${safe(c.added_by)}</span>
                <span class="comment-date">${formatDate(c.created_at)}</span>
            </div>
            <p class="comment-text">${c.comment || '–'}</p>
        </div>
    `).join('');

    // Scroll to bottom of comments list
    commentsList.scrollTop = commentsList.scrollHeight;
}


// ─── Feedback Helper ─────────────────────────────────────────────────────────
function setFeedback(elId, message, type = '') {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.className   = 'update-feedback' + (type ? ' ' + type : '');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadTickets();

// ─── Sidebar Navigation ─────────────────────────────────────────────────────────
document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        const target = item.getAttribute('data-target');
        if (!target) return; // Prevent errors if clicking something without data-target

        // Remove active class from all nav items
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Hide all views
        document.getElementById('ticketsView').style.display = 'none';
        document.getElementById('optionsView').style.display = 'none';

        // Show target view
        document.getElementById(target).style.display = 'block';

        if (window.innerWidth <= 768) {
            closeSidebar();
        }

        // If switching to options view, load the options
        if (target === 'optionsView') {
            loadOptions();
        }
    });
});

// ─── Options Management ───────────────────────────────────────────────────────
const categoryList = document.getElementById('categoryList');
const brandList = document.getElementById('brandList');
const newCategoryInput = document.getElementById('newCategoryInput');
const newBrandInput = document.getElementById('newBrandInput');
const categoryError = document.getElementById('categoryError');
const brandError = document.getElementById('brandError');

document.getElementById('addCategoryBtn')?.addEventListener('click', () => addOption('categories', newCategoryInput, categoryError, loadCategories));
document.getElementById('addBrandBtn')?.addEventListener('click', () => addOption('brands', newBrandInput, brandError, loadBrands));

async function loadOptions() {
    loadCategories();
    loadBrands();
}

async function loadCategories() {
    if(!categoryList) return;
    categoryList.innerHTML = '<li class="options-loading"><div class="mini-spinner"></div> Loading categories...</li>';
    try {
        const { data, error } = await supabaseClient.from('categories').select('*').order('name');
        if (error) throw error;
        renderOptionsList(data, categoryList, 'categories', loadCategories);
    } catch (err) {
        console.error('Error loading categories:', err);
        categoryList.innerHTML = '<li><span style="color:var(--error);">Failed to load categories</span></li>';
    }
}

async function loadBrands() {
    if(!brandList) return;
    brandList.innerHTML = '<li class="options-loading"><div class="mini-spinner"></div> Loading brands...</li>';
    try {
        const { data, error } = await supabaseClient.from('brands').select('*').order('name');
        if (error) throw error;
        renderOptionsList(data, brandList, 'brands', loadBrands);
    } catch (err) {
        console.error('Error loading brands:', err);
        brandList.innerHTML = '<li><span style="color:var(--error);">Failed to load brands</span></li>';
    }
}

function renderOptionsList(items, container, table, reloadCallback) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<li><span style="color:var(--text-muted);">No options found.</span></li>';
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-option';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.title = 'Delete';
        delBtn.onclick = () => deleteOption(table, item.id, item.name, reloadCallback);

        li.appendChild(nameSpan);
        li.appendChild(delBtn);
        container.appendChild(li);
    });
}

async function addOption(table, inputEl, errorEl, reloadCallback) {
    const name = inputEl.value.trim();
    errorEl.textContent = '';
    
    if (!name) {
        errorEl.textContent = 'Please enter a name.';
        return;
    }

    try {
        // Disable input while submitting
        inputEl.disabled = true;
        const { data, error } = await supabaseClient.from(table).insert([{ name }]);
        
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('This option already exists.');
            }
            throw error;
        }

        inputEl.value = '';
        showToast('Successfully added new option.');
        reloadCallback();
    } catch (err) {
        console.error('Error adding option:', err);
        errorEl.textContent = err.message || 'Failed to add option.';
    } finally {
        inputEl.disabled = false;
        inputEl.focus();
    }
}

async function deleteOption(table, id, name, reloadCallback) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const { error } = await supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;

        showToast(`Deleted "${name}".`);
        reloadCallback();
    } catch (err) {
        console.error('Error deleting option:', err);
        showToast('Failed to delete option.', true);
    }
}
