// ملزمة — إصدار الواجهة 3
const SUPABASE_URL = 'https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const form = document.getElementById('orderForm');
const fileInput = document.getElementById('files');
const uploadZone = document.getElementById('uploadZone');
const fileList = document.getElementById('fileList');
const modal = document.getElementById('successModal');
const orderNumberEl = document.getElementById('orderNumber');
const closeModal = document.getElementById('closeModal');
const submitBtn = form.querySelector('button[type="submit"]');
const submitStatus = document.getElementById('submitStatus');
const summaryFiles = document.getElementById('summaryFiles');
const summaryPrint = document.getElementById('summaryPrint');
const summaryQuantity = document.getElementById('summaryQuantity');
const summaryBinding = document.getElementById('summaryBinding');
const estimatedPrice = document.getElementById('estimatedPrice');
const subtotalPrice = document.getElementById('subtotalPrice');
const deliveryPrice = document.getElementById('deliveryPrice');
const discountPrice = document.getElementById('discountPrice');
const discountRow = document.getElementById('discountRow');
const discountCodeInput = document.getElementById('discountCode');
const applyDiscountButton = document.getElementById('applyDiscount');
const discountMessage = document.getElementById('discountMessage');

let selectedFiles = [];
let isSubmitting = false;
let isReadingFiles = false;
let currentQuote = null;
let activeDiscountCode = '';
let quoteTimer = null;
const bindingLabels = {
  none: 'بدون تجليد',
  spiral: 'سلك',
  staple: 'تدبيس ولزق',
  lamination: 'تغليف حراري'
};

const arNum = value => String(value)
  .replace(/\./g, '٫')
  .replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[digit]);

const formatSize = bytes => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function getFileMime(file) {
  return file.type || 'application/pdf';
}

function getTotalPages() {
  return selectedFiles.reduce((total, item) => total + item.pages, 0);
}

async function countPdfPages(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  const pages = document.numPages;
  await document.destroy();
  return pages;
}

function setStatus(message = '', type = '') {
  submitStatus.textContent = message;
  submitStatus.className = `submit-status ${type}`.trim();
}

function renderFiles() {
  fileList.innerHTML = '';
  selectedFiles.forEach((itemData, index) => {
    const file = itemData.file;
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(file.name)}</strong>
        <small>${formatSize(file.size)} • ${arNum(itemData.pages)} صفحة</small>
      </div>
      <button type="button" class="remove-file" data-remove="${index}">حذف</button>
    `;
    fileList.appendChild(item);
  });

  const totalPages = getTotalPages();
  summaryFiles.textContent = selectedFiles.length
    ? `${arNum(selectedFiles.length)} ملف • ${arNum(totalPages)} صفحة`
    : 'لم تُرفع بعد';
  updateSummary();
}

async function addFiles(files) {
  if (isReadingFiles || isSubmitting) return;
  const incoming = Array.from(files).slice(0, Math.max(0, 10 - selectedFiles.length));
  let rejected = false;
  let unreadable = false;
  isReadingFiles = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري حساب الصفحات…';
  setStatus('جاري قراءة عدد صفحات ملفات PDF…', 'working');

  for (const file of incoming) {
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const validType = !file.type || file.type === 'application/pdf';
    const isValid = extension === 'pdf'
      && validType
      && file.size > 0
      && file.size <= 50 * 1024 * 1024;

    if (!isValid) {
      rejected = true;
      continue;
    }

    try {
      const pages = await countPdfPages(file);
      if (!Number.isInteger(pages) || pages < 1) throw new Error('Invalid page count');
      selectedFiles.push({ file, pages });
    } catch (error) {
      console.error(error);
      unreadable = true;
    }
  }

  fileInput.value = '';
  renderFiles();

  if (unreadable) {
    setStatus('تعذر قراءة أحد الملفات. تأكد أنه PDF صالح وغير محمي بكلمة مرور.', 'error');
  } else if (rejected) {
    setStatus('يُسمح بملفات PDF فقط، وبحد أقصى ٥٠MB للملف.', 'error');
  } else {
    setStatus('');
  }
  isReadingFiles = false;
  submitBtn.disabled = false;
  submitBtn.innerHTML = 'إرسال طلب الطباعة <span>←</span>';
}

const formatMoney = value => `${arNum(Number(value).toFixed(2))} ر.س`;

async function requestQuote(showDiscountResult = false) {
  const data = new FormData(form);
  const payload = {
    pages: getTotalPages(),
    copies: Math.max(1, Number(data.get('copies')) || 1),
    color: data.get('color') || 'bw',
    size: data.get('size') || 'A4',
    binding: data.get('binding') || 'none',
    discountCode: activeDiscountCode
  };
  try {
    const { data: quote, error } = await supabaseClient.functions.invoke('print-quote', { body: payload });
    if (error || !quote?.ok) throw error || new Error('تعذر حساب السعر.');
    currentQuote = quote;
    subtotalPrice.textContent = payload.pages ? formatMoney(quote.subtotal) : '—';
    deliveryPrice.textContent = formatMoney(quote.deliveryFee);
    discountRow.hidden = !quote.discountAmount;
    discountPrice.textContent = quote.discountAmount ? `− ${formatMoney(quote.discountAmount)}` : '—';
    estimatedPrice.textContent = payload.pages ? formatMoney(quote.total) : '—';
    if (showDiscountResult) {
      discountMessage.textContent = quote.discountMessage || '';
      discountMessage.className = quote.discountCode ? 'success' : 'error';
      if (!quote.discountCode) activeDiscountCode = '';
    }
  } catch (error) {
    console.error(error);
    currentQuote = null;
    deliveryPrice.textContent = 'تعذر التحميل';
    if (showDiscountResult) {
      discountMessage.textContent = 'تعذر التحقق من الكود الآن.';
      discountMessage.className = 'error';
    }
  }
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(() => requestQuote(false), 250);
}

function updateSummary() {
  const data = new FormData(form);
  const colorLabel = data.get('color') === 'color' ? 'ملون' : 'أسود وأبيض';
  const size = data.get('size') || 'A4';
  const sidesLabel = data.get('sides') === 'double' ? 'وجهين' : 'وجه واحد';
  const pageCount = getTotalPages();
  const copies = Math.max(1, Number(data.get('copies')) || 1);
  const binding = data.get('binding') || 'none';
  summaryPrint.textContent = `${colorLabel} • ${size} • ${sidesLabel}`;
  summaryQuantity.textContent = pageCount
    ? `${arNum(pageCount)} صفحة • ${arNum(copies)} نسخة`
    : 'ارفع الملف لحساب الصفحات';
  summaryBinding.textContent = bindingLabels[binding] || 'بدون تجليد';
  scheduleQuote();
}

applyDiscountButton.addEventListener('click', async () => {
  activeDiscountCode = discountCodeInput.value.trim().toUpperCase();
  discountCodeInput.value = activeDiscountCode;
  if (!activeDiscountCode) {
    discountMessage.textContent = 'أدخل كود الخصم أولًا.';
    discountMessage.className = 'error';
    return;
  }
  applyDiscountButton.disabled = true;
  applyDiscountButton.textContent = 'جارٍ…';
  await requestQuote(true);
  applyDiscountButton.disabled = false;
  applyDiscountButton.textContent = 'تطبيق';
});

async function uploadAllFiles(uploads) {
  for (let index = 0; index < uploads.length; index += 1) {
    const upload = uploads[index];
    const file = selectedFiles[index].file;
    const percentage = Math.round((index / uploads.length) * 100);
    setStatus(
      `جاري رفع الملفات… ${arNum(percentage)}٪ — ${arNum(index + 1)} من ${arNum(uploads.length)}`,
      'working'
    );

    const { error } = await supabaseClient.storage
      .from('print-files')
      .uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: getFileMime(file),
        upsert: false
      });

    if (error) throw new Error(`تعذر رفع الملف: ${file.name}`);
  }
}

fileInput.addEventListener('change', event => addFiles(event.target.files));

fileList.addEventListener('click', event => {
  const removeButton = event.target.closest('[data-remove]');
  if (!removeButton || isSubmitting) return;
  selectedFiles.splice(Number(removeButton.dataset.remove), 1);
  renderFiles();
});

['dragenter', 'dragover'].forEach(eventName => {
  uploadZone.addEventListener(eventName, event => {
    event.preventDefault();
    uploadZone.classList.add('drag');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  uploadZone.addEventListener(eventName, event => {
    event.preventDefault();
    uploadZone.classList.remove('drag');
  });
});

uploadZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
form.addEventListener('input', updateSummary);
form.addEventListener('change', updateSummary);

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (isSubmitting || isReadingFiles) return;

  if (!selectedFiles.length) {
    uploadZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    uploadZone.style.borderColor = '#c93c36';
    setTimeout(() => { uploadZone.style.borderColor = ''; }, 1500);
    setStatus('أضف ملفًا واحدًا على الأقل.', 'error');
    return;
  }

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const pageCount = getTotalPages();
  const customerNotes = String(data.get('notes') || '').trim();
  const address = String(data.get('address') || '').trim();

  const payload = {
    customerName: data.get('customerName'),
    phone: data.get('phone'),
    address,
    delivery: 'delivery',
    color: data.get('color'),
    size: data.get('size'),
    sides: data.get('sides'),
    copies: Number(data.get('copies') || 1),
    pagesMode: 'all',
    pageRange: '',
    binding: data.get('binding'),
    notes: customerNotes,
    totalPages: pageCount,
    discountCode: currentQuote?.discountCode || null,
    files: selectedFiles.map(itemData => ({
      name: itemData.file.name,
      size: itemData.file.size,
      type: getFileMime(itemData.file)
    }))
  };

  try {
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري إرسال الطلب…';
    setStatus('جاري إنشاء طلبك ورفع الملفات…', 'working');

    const { data: created, error: createError } = await supabaseClient.functions
      .invoke('create-print-order', { body: payload });

    if (createError) throw createError;
    if (!created?.ok || !Array.isArray(created.uploads)) {
      throw new Error(created?.error || 'تعذر إنشاء الطلب.');
    }

    await uploadAllFiles(created.uploads);

    orderNumberEl.textContent = created.orderNumber;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    form.reset();
    selectedFiles = [];
    activeDiscountCode = '';
    currentQuote = null;
    discountCodeInput.value = '';
    discountMessage.textContent = '';
    renderFiles();
    updateSummary();
    setStatus('');
  } catch (error) {
    console.error(error);
    let message = error?.message || 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.';

    if (error?.context?.json) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch (_) {}
    }

    setStatus(message, 'error');
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'إرسال طلب الطباعة <span>←</span>';
  }
});

closeModal.addEventListener('click', () => {
  modal.hidden = true;
  document.body.style.overflow = '';
});

renderFiles();
updateSummary();
