/**
 * Sri Prasannanjaneya Home Needs - Service Request Form Script
 * Includes real-time input validation, file uploads checks, dynamic field logic,
 * loading spinner handlers, and Supabase integration.
 */

// Supabase Configuration
const SUPABASE_URL = 'https://kzjfquajbdkyexxxfsem.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amZxdWFqYmRreWV4eHhmc2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDkxNDIsImV4cCI6MjA5NjU4NTE0Mn0.KXlAMFFUGBHL6TCO-jchQV22ptDCrCOaTL7nz_xMstQ';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Load dynamic categories and brands
    loadDynamicOptions();

    // Core Containers
    const form = document.getElementById('serviceRequestForm');
    const requestCard = document.getElementById('requestCard');
    const successCard = document.getElementById('successCard');

    // Button and Loading indicators
    const submitBtn = document.getElementById('submitRequestBtn');
    const resetBtn = document.getElementById('resetBtn');
    const submitSpinner = document.getElementById('submitSpinner');
    const submitBtnText = document.getElementById('submitBtnText');

    // Dynamic Visibility Field Configurations
    const dynamicFields = [
        {
            trigger: document.getElementById('brand'),
            group: document.getElementById('otherBrandGroup'),
            input: document.getElementById('enterBrandName'),
            triggerValue: 'Other'
        },
        {
            trigger: document.getElementById('productCategory'),
            group: document.getElementById('otherCategoryGroup'),
            input: document.getElementById('enterProductCategory'),
            triggerValue: 'Other'
        },
        {
            trigger: document.getElementById('purchasedFrom'),
            group: document.getElementById('storeNameGroup'),
            input: document.getElementById('storeName'),
            triggerValue: 'Other Store'
        }
    ];

    // File Upload Elements
    const fileInput = document.getElementById('invoiceImage');
    const fileBox = document.getElementById('fileUploadBox');
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadText = document.getElementById('uploadText');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileNameText = document.getElementById('fileNameText');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const invoiceImageError = document.getElementById('invoiceImageError');

    // Constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes in bytes
    const ALLOWED_EXTENSIONS = /(\.jpg|\.jpeg|\.png|\.pdf)$/i;

    // Issue Description Textarea Character Counter
    const issueDescription = document.getElementById('issueDescription');
    const charCounter = document.getElementById('charCounter');

    // --- Dynamic Fields Setup ---
    dynamicFields.forEach(cfg => {
        if (cfg.trigger && cfg.group && cfg.input) {
            cfg.trigger.addEventListener('change', () => {
                validateField(cfg.trigger);
                if (cfg.trigger.value === cfg.triggerValue) {
                    cfg.group.style.display = 'flex';
                    cfg.input.setAttribute('required', 'required');
                    cfg.input.focus();
                } else {
                    cfg.group.style.display = 'none';
                    cfg.input.removeAttribute('required');
                    cfg.input.value = '';
                    clearFieldError(cfg.input);
                }
            });
            cfg.input.addEventListener('input', () => validateField(cfg.input));
        }
    });

    // --- Realtime Input Formatting and Validation Hooks ---
    const mobileInput = document.getElementById('mobileNumber');
    if (mobileInput) {
        // Only allow typing numbers and cap it at 10 digits
        mobileInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            validateField(mobileInput);
        });
    }

    // Name field validation
    const nameInput = document.getElementById('customerName');
    if (nameInput) {
        nameInput.addEventListener('input', () => validateField(nameInput));
    }

    // Service Address field validation
    const addressInput = document.getElementById('serviceAddress');
    if (addressInput) {
        addressInput.addEventListener('input', () => validateField(addressInput));
    }

    // Email address validation
    const emailInput = document.getElementById('emailAddress');
    if (emailInput) {
        emailInput.addEventListener('input', () => validateField(emailInput));
    }

    // Invoice Number validation
    const invoiceNumInput = document.getElementById('invoiceNumber');
    if (invoiceNumInput) {
        invoiceNumInput.addEventListener('input', () => validateField(invoiceNumInput));
    }

    // Invoice Date validation — restrict to today or earlier (no future dates)
    const invoiceDateInput = document.getElementById('invoiceDate');
    if (invoiceDateInput) {
        // Set max to today's date so the calendar picker greys out future dates
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        invoiceDateInput.setAttribute('max', todayStr);

        invoiceDateInput.addEventListener('change', () => validateField(invoiceDateInput));
    }

    // Product Model validation
    const modelInput = document.getElementById('modelNumber');
    if (modelInput) {
        modelInput.addEventListener('input', () => validateField(modelInput));
    }

    // Request Type validation
    const requestTypeSelect = document.getElementById('requestType');
    const issueReqStar = document.getElementById('issueDescriptionRequired');
    if (requestTypeSelect) {
        requestTypeSelect.addEventListener('change', () => {
            validateField(requestTypeSelect);
            updateIssueDescriptionValidation();
        });
        // Run once on load to establish correct validation rule configuration
        updateIssueDescriptionValidation();
    }

    function updateIssueDescriptionValidation() {
        if (!issueDescription) return;
        const isDemo = requestTypeSelect.value === 'Demo and Installation';
        if (isDemo) {
            if (issueReqStar) issueReqStar.style.display = 'none';
            issueDescription.placeholder = 'Any additional information (Optional)';
            issueDescription.removeAttribute('required');
            const currentLength = issueDescription.value.length;
            charCounter.textContent = `${currentLength} characters (Optional)`;
            charCounter.style.color = 'var(--text-muted)';
            clearFieldError(issueDescription);
        } else {
            if (issueReqStar) issueReqStar.style.display = 'inline';
            issueDescription.placeholder = 'Please describe the issue in detail';
            issueDescription.setAttribute('required', 'required');
            const currentLength = issueDescription.value.length;
            charCounter.textContent = `${currentLength} / 20 minimum characters`;
            if (currentLength < 20) {
                charCounter.style.color = '#ff4d4d';
            } else {
                charCounter.style.color = 'var(--primary-color)';
            }
            if (issueDescription.value.length > 0 || issueDescription.classList.contains('is-invalid') || issueDescription.classList.contains('is-valid')) {
                validateField(issueDescription);
            }
        }
    }

    // Preferred Contact Method Radio Buttons
    const contactMethods = document.querySelectorAll('input[name="preferredContact"]');
    contactMethods.forEach(radio => {
        radio.addEventListener('change', () => {
            // Radio triggers can revalidate mobile/email requirements if needed
            if (mobileInput.value) validateField(mobileInput);
            if (emailInput.value) validateField(emailInput);
        });
    });

    // Issue Description validator and counter update
    if (issueDescription) {
        issueDescription.addEventListener('input', () => {
            const currentLength = issueDescription.value.length;
            const isDemo = requestTypeSelect ? (requestTypeSelect.value === 'Demo and Installation') : false;
            
            if (isDemo) {
                charCounter.textContent = `${currentLength} characters (Optional)`;
                charCounter.style.color = 'var(--text-muted)';
                validateField(issueDescription);
            } else {
                charCounter.textContent = `${currentLength} / 20 minimum characters`;
                if (currentLength < 20) {
                    charCounter.style.color = '#ff4d4d'; // Red alert text
                } else {
                    charCounter.style.color = 'var(--primary-color)'; // Gold success text
                }
                validateField(issueDescription);
            }
        });
    }

    // --- Drag and Drop File Upload Mechanics ---
    if (fileBox && fileInput) {
        // Prevent default browser file opens on drag events
        ['dragenter', 'dragover'].forEach(eventName => {
            fileBox.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileBox.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileBox.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileBox.classList.remove('dragover');
            }, false);
        });

        fileBox.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop triggers of parent box click
            clearFileSelection();
        });
    }

    function handleFileSelection(file) {
        // 1. Validate Extension
        if (!ALLOWED_EXTENSIONS.exec(file.name)) {
            showFieldError(fileInput, 'Please upload a valid file (JPG, JPEG, PNG, or PDF only).');
            clearFileSelection(false);
            return;
        }

        // 2. Validate File Size
        if (file.size > MAX_FILE_SIZE) {
            showFieldError(fileInput, 'File size must be less than 10 MB.');
            clearFileSelection(false);
            return;
        }

        // Hide prompt graphics
        uploadIcon.style.display = 'none';
        uploadText.style.display = 'none';
        
        // Match Extension Icon
        const fileIcon = fileNameDisplay.querySelector('i');
        if (file.name.toLowerCase().endsWith('.pdf')) {
            fileIcon.className = 'fas fa-file-pdf';
            fileIcon.style.color = '#ff4d4d';
        } else {
            fileIcon.className = 'fas fa-file-image';
            fileIcon.style.color = 'var(--primary-color)';
        }

        // Display filename block
        fileNameText.textContent = file.name;
        fileNameDisplay.style.display = 'flex';
        
        validateFileField();
    }

    function clearFileSelection(triggerValidation = true) {
        fileInput.value = '';
        uploadIcon.style.display = 'block';
        uploadText.style.display = 'block';
        fileNameDisplay.style.display = 'none';
        
        if (triggerValidation) {
            validateFileField();
        }
    }

    // --- Validation Output Helpers ---
    function showFieldError(inputEl, msg) {
        inputEl.classList.add('is-invalid');
        inputEl.classList.remove('is-valid');
        
        const errorBlock = document.getElementById(`${inputEl.id}Error`);
        if (errorBlock) {
            errorBlock.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
            errorBlock.style.display = 'flex';
        }
    }

    function clearFieldError(inputEl) {
        inputEl.classList.remove('is-invalid');
        inputEl.classList.remove('is-valid');
        
        const errorBlock = document.getElementById(`${inputEl.id}Error`);
        if (errorBlock) {
            errorBlock.textContent = '';
            errorBlock.style.display = 'none';
        }
    }

    function setFieldValid(inputEl) {
        inputEl.classList.remove('is-invalid');
        inputEl.classList.add('is-valid');
        
        const errorBlock = document.getElementById(`${inputEl.id}Error`);
        if (errorBlock) {
            errorBlock.textContent = '';
            errorBlock.style.display = 'none';
        }
    }

    function validateFileField() {
        if (fileInput.files.length === 0) {
            fileBox.classList.add('is-invalid');
            fileBox.classList.remove('is-valid');
            invoiceImageError.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invoice image upload is required.`;
            invoiceImageError.style.display = 'flex';
            return false;
        }

        const file = fileInput.files[0];
        
        if (!ALLOWED_EXTENSIONS.exec(file.name)) {
            fileBox.classList.add('is-invalid');
            fileBox.classList.remove('is-valid');
            invoiceImageError.innerHTML = `<i class="fas fa-exclamation-circle"></i> Invalid format. Upload JPG, JPEG, PNG, or PDF.`;
            invoiceImageError.style.display = 'flex';
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            fileBox.classList.add('is-invalid');
            fileBox.classList.remove('is-valid');
            invoiceImageError.innerHTML = `<i class="fas fa-exclamation-circle"></i> File size must be less than 10 MB.`;
            invoiceImageError.style.display = 'flex';
            return false;
        }

        fileBox.classList.remove('is-invalid');
        fileBox.classList.add('is-valid');
        invoiceImageError.textContent = '';
        invoiceImageError.style.display = 'none';
        return true;
    }

    function validateField(inputEl) {
        const val = inputEl.value.trim();
        
        // 1. Required Field Checks
        if (inputEl.hasAttribute('required') && val === '') {
            showFieldError(inputEl, `This field is required.`);
            return false;
        }

        // Invoice Date — no future dates allowed
        // Use string comparison (YYYY-MM-DD is lexicographically sortable)
        // to avoid UTC vs local timezone bugs that occur with new Date('YYYY-MM-DD').
        if (inputEl.id === 'invoiceDate' && val !== '') {
            const todayStr = new Date().toLocaleDateString('en-CA'); // gives YYYY-MM-DD in local time
            if (val > todayStr) {
                showFieldError(inputEl, 'Invoice date cannot be a future date.');
                return false;
            }
        }

        // 2. Mobile 10 Digits Check
        if (inputEl.id === 'mobileNumber') {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(val)) {
                showFieldError(inputEl, 'Mobile number must be exactly 10 digits.');
                return false;
            }
        }

        // 3. Email Pattern Check
        if (inputEl.id === 'emailAddress') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                showFieldError(inputEl, 'Please enter a valid email address.');
                return false;
            }
        }

        // Service Address check (Min 10 characters)
        if (inputEl.id === 'serviceAddress') {
            if (val.length < 10) {
                showFieldError(inputEl, 'Service / Installation Address must be at least 10 characters long.');
                return false;
            }
        }

        // 4. Issue Description Min Characters Check
        if (inputEl.id === 'issueDescription') {
            const isDemo = requestTypeSelect ? (requestTypeSelect.value === 'Demo and Installation') : false;
            if (isDemo) {
                clearFieldError(inputEl);
                if (val !== '') {
                    setFieldValid(inputEl);
                }
                return true;
            } else {
                if (val.length < 20) {
                    showFieldError(inputEl, 'Issue description must be at least 20 characters long.');
                    return false;
                }
            }
        }

        setFieldValid(inputEl);
        return true;
    }

    // --- Reset Form Handler with Prompt Confirmation ---
    if (form) {
        form.addEventListener('reset', (e) => {
            // Confirm with user before erasing values
            const confirmReset = confirm("Are you sure you want to clear all entered details?");
            if (!confirmReset) {
                e.preventDefault(); // Retain form contents
                return;
            }

            // User clicked OK: Clear all custom styling validation states
            const inputs = form.querySelectorAll('.input-control');
            inputs.forEach(input => clearFieldError(input));
            
            if (fileBox) {
                fileBox.classList.remove('is-invalid');
                fileBox.classList.remove('is-valid');
            }
            if (invoiceImageError) {
                invoiceImageError.style.display = 'none';
            }
            
            clearFileSelection(false);
            
            // Hide conditional elements
            dynamicFields.forEach(cfg => {
                if (cfg.group && cfg.input) {
                    cfg.group.style.display = 'none';
                    cfg.input.removeAttribute('required');
                    clearFieldError(cfg.input);
                }
            });

            // Reset character counter to default state
            if (charCounter) {
                charCounter.textContent = '0 / 20 minimum characters';
                charCounter.style.color = 'var(--text-muted)';
            }
            if (issueReqStar) issueReqStar.style.display = 'inline';
            if (issueDescription) {
                issueDescription.placeholder = 'Please describe the issue in detail';
                issueDescription.setAttribute('required', 'required');
            }
        });
    }

    // --- Submit Form Handler ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let isFormValid = true;

            // Validate all visible text/dropdown elements
            const inputControls = form.querySelectorAll('.input-control');
            inputControls.forEach(control => {
                const parentGroup = control.closest('.form-group');
                const isFieldVisible = parentGroup ? (parentGroup.style.display !== 'none') : true;

                if (isFieldVisible) {
                    const isValid = validateField(control);
                    if (!isValid) {
                        isFormValid = false;
                    }
                }
            });

            // Validate Invoice Image
            const isFileValid = validateFileField();
            if (!isFileValid) {
                isFormValid = false;
            }

            if (!isFormValid) {
                // Scroll & Focus the first invalid element to assist UX
                const firstInvalidInput = form.querySelector('.is-invalid');
                if (firstInvalidInput) {
                    firstInvalidInput.focus();
                    firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // Gather and structure form data for future backend (Supabase) API calls
            const selectedContactMethod = form.querySelector('input[name="preferredContact"]:checked')?.value || 'Mobile Call';
            
            const formData = {
                customerName: document.getElementById('customerName').value.trim(),
                mobileNumber: document.getElementById('mobileNumber').value.trim(),
                emailAddress: document.getElementById('emailAddress').value.trim(),
                preferredContact: selectedContactMethod,
                serviceAddress: document.getElementById('serviceAddress').value.trim(),
                invoiceNumber: document.getElementById('invoiceNumber').value.trim(),
                invoiceDate: document.getElementById('invoiceDate').value,
                invoiceImageFile: fileInput.files[0], // Direct file handle for storage uploads
                purchasedFrom: document.getElementById('purchasedFrom').value,
                storeName: document.getElementById('storeName').value.trim() || 'Sri Prasannanjaneya Home Needs',
                brandName: document.getElementById('brand').value === 'Other' ? document.getElementById('enterBrandName').value.trim() : document.getElementById('brand').value,
                productCategory: document.getElementById('productCategory').value === 'Other' ? document.getElementById('enterProductCategory').value.trim() : document.getElementById('productCategory').value,
                modelNumber: document.getElementById('modelNumber').value.trim(),
                serialNumber: document.getElementById('serialNumber').value.trim() || null,
                requestType: document.getElementById('requestType').value,
                issueDescription: document.getElementById('issueDescription').value.trim()
            };

            // Call backend handler
            executeFormSubmission(formData);
        });
    }

    /**
     * Helper to generate ticket numbers in the format SPHN-YYYYMMDD-HHMMSS-XXX.
     * The XXX suffix is a random 3-digit number to prevent collisions within
     * the same second when multiple requests are submitted simultaneously.
     * @returns {string} Generated ticket number
     */
    function generateTicketNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const randomPart = Math.floor(100 + Math.random() * 900);
        
        const ticketNum = `SPHN-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
        console.log('Ticket generation:', ticketNum);
        return ticketNum;
    }

    /**
     * Handles visual submit sequence and integrates backend connection.
     * Ready for future Supabase integration.
     * @param {Object} data Packed form inputs
     */
    async function executeFormSubmission(data) {
        // Toggle buttons states to prevent duplicate submits
        submitBtn.disabled = true;
        resetBtn.disabled = true;
        
        // Show Spinner loading indicators
        submitSpinner.style.display = 'inline-block';
        submitBtnText.textContent = 'Submitting Request...';

        try {
            // 1. Generate Ticket Number
            const ticketNum = generateTicketNumber();

            // 2. Upload File to Storage
            console.log('File upload started');
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const timestamp = now.getTime();
            
            const originalFileName = data.invoiceImageFile.name;
            const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `invoices/${year}/${month}/${day}/${timestamp}_${cleanFileName}`;

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('invoice')
                .upload(filePath, data.invoiceImageFile);

            if (uploadError) {
                console.error('Upload error details:', uploadError);
                alert('Invoice upload failed. Please try again.');
                throw uploadError;
            }
            console.log('File upload completed');

            // 3. Database Insertion
            const { data: ticketData, error: ticketError } = await supabaseClient
                .from('tickets')
                .insert([{
                    ticket_number: ticketNum,
                    customer_name: data.customerName,
                    mobile: data.mobileNumber,
                    email: data.emailAddress,
                    invoice_number: data.invoiceNumber,
                    invoice_image_url: filePath,
                    brand: data.brandName,
                    product_type: data.productCategory,
                    model_number: data.modelNumber,
                    request_type: data.requestType,
                    issue_description: data.issueDescription,
                    status: 'Open',
                    preferred_contact: data.preferredContact,
                    invoice_date: data.invoiceDate,
                    purchased_from: data.purchasedFrom,
                    store_name: data.storeName,
                    serial_number: data.serialNumber,
                    service_address: data.serviceAddress
                }]);

            if (ticketError) {
                console.error('Database error details:', ticketError);
                alert('Unable to create ticket. Please try again.');
                throw ticketError;
            }
            console.log('Ticket created successfully:', ticketNum);
            console.log('Database insert response:', ticketData);

            // 4. Send confirmation email via EmailJS (fire-and-forget — never blocks submission)
            console.log("EMAILJS: Sending email...");
            console.log("EMAILJS: Customer =", data.emailAddress);
            console.log("EMAILJS: Ticket =", ticketNum);
            sendTicketCreatedEmail({
                email:         data.emailAddress,
                customer_name: data.customerName,
                ticket_number: ticketNum,
                status:        'Open',
                created_at:    new Date().toISOString(),
            });

            // 4. Update Success Screen Display
            const successTicketId = document.getElementById('successTicketId');
            if (successTicketId) {
                successTicketId.textContent = ticketNum;
            }
            const successStatus = document.getElementById('successStatus');
            if (successStatus) {
                successStatus.textContent = 'Open';
            }

            // Successful Submission — keep submit button permanently disabled
            // to prevent re-submission of the same request.
            submitBtn.disabled = true;
            submitSpinner.style.display = 'none';
            submitBtnText.textContent = 'Request Submitted';

            // Successful Submission sequence
            requestCard.style.display = 'none';
            successCard.style.display = 'flex';

            // Show email notification info card
            const emailNotifyCard = document.getElementById('emailNotifyCard');
            if (emailNotifyCard) emailNotifyCard.style.display = 'block';

            // Smoothly align viewport on success display
            window.scrollTo({
                top: successCard.offsetTop - 120,
                behavior: 'smooth'
            });

        } catch (error) {
            console.error('Submission failed:', error);
            
            // Restore button visual states on exception
            submitBtn.disabled = false;
            resetBtn.disabled = false;
            submitSpinner.style.display = 'none';
            submitBtnText.textContent = 'Submit Request';
        }
    }

    // --- Success Card Trigger Actions ---
    const fileAnotherBtn = document.getElementById('fileAnotherBtn');
    if (fileAnotherBtn) {
        fileAnotherBtn.addEventListener('click', () => {
            // Restore form cards
            successCard.style.display = 'none';
            requestCard.style.display = 'block';

            // Hide email notification info card
            const emailNotifyCard = document.getElementById('emailNotifyCard');
            if (emailNotifyCard) emailNotifyCard.style.display = 'none';

            // Enable action inputs
            submitBtn.disabled = false;
            resetBtn.disabled = false;
            submitSpinner.style.display = 'none';
            submitBtnText.textContent = 'Submit Request';

            // Clear values safely (bypass confirmation dialog)
            // To bypass reset dialog confirmation on success redirect,
            // we clear value content of all fields programmatically.
            form.querySelectorAll('input:not([type="radio"]):not([type="submit"]):not([type="reset"])').forEach(input => {
                input.value = '';
                clearFieldError(input);
            });
            form.querySelectorAll('select').forEach(sel => {
                sel.selectedIndex = 0;
                clearFieldError(sel);
            });
            if (issueDescription) {
                issueDescription.value = '';
                clearFieldError(issueDescription);
                if (charCounter) {
                    charCounter.textContent = '0 / 20 minimum characters';
                    charCounter.style.color = 'var(--text-muted)';
                }
                if (issueReqStar) issueReqStar.style.display = 'inline';
                issueDescription.placeholder = 'Please describe the issue in detail';
                issueDescription.setAttribute('required', 'required');
            }
            if (addressInput) {
                addressInput.value = '';
                clearFieldError(addressInput);
            }
            if (fileBox) {
                fileBox.classList.remove('is-invalid', 'is-valid');
            }
            
            clearFileSelection(false);

            // Hide conditional elements
            dynamicFields.forEach(cfg => {
                if (cfg.group && cfg.input) {
                    cfg.group.style.display = 'none';
                    cfg.input.removeAttribute('required');
                }
            });

            // Set default radio selection
            const defaultRadio = document.getElementById('contactMobile');
            if (defaultRadio) defaultRadio.checked = true;

            // Scroll card back to window
            window.scrollTo({
                top: requestCard.offsetTop - 120,
                behavior: 'smooth'
            });
        });
    }
});

// --- Dynamic Options Loading ---
async function loadDynamicOptions() {
    const categorySelect = document.getElementById('productCategory');
    const brandSelect = document.getElementById('brand');

    if (!categorySelect || !brandSelect) return;

    try {
        // Fetch categories
        const { data: categories, error: catError } = await supabaseClient.from('categories').select('name').order('name');
        if (catError) throw catError;

        if (categories) {
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = cat.name;
                categorySelect.appendChild(opt);
            });
            // Append 'Other' option
            const otherOpt = document.createElement('option');
            otherOpt.value = 'Other';
            otherOpt.textContent = 'Other';
            categorySelect.appendChild(otherOpt);
        }

        // Fetch brands
        const { data: brands, error: brandError } = await supabaseClient.from('brands').select('name').order('name');
        if (brandError) throw brandError;

        if (brands) {
            brands.forEach(brand => {
                const opt = document.createElement('option');
                opt.value = brand.name;
                opt.textContent = brand.name;
                brandSelect.appendChild(opt);
            });
            // Append 'Other' option
            const otherOpt = document.createElement('option');
            otherOpt.value = 'Other';
            otherOpt.textContent = 'Other';
            brandSelect.appendChild(otherOpt);
        }
    } catch (err) {
        console.error('Error loading dynamic options:', err);
    }
}
