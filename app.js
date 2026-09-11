const SUPABASE_URL = 'https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;

const form = document.getElementById('orderForm');
const fileInput = document.getElementById('files');
const uploadZone = document.getElementById('uploadZone');
const fileList = document.getElementById('fileList');
const pagesMode = document.getElementById('pagesMode');
const pageRangeField = document.getElementById('pageRangeField');
const modal = document.getElementById('successModal');
const orderNumberEl = document.getElementById('orderNumber');
const closeModal = document.getElementById('closeModal');
const submitBtn = form.querySelector('button[type="submit"]');
const submitStatus = document.getElementById('submitStatus');
const screens = [...document.querySelectorAll('[data-screen-panel]')];
const navItems = [...document.querySelectorAll('.bottom-nav [data-go]')];
const homeFileCount = document.getElementById('homeFileCount');
const homeOrderCount = document.getElementById('homeOrderCount');
const homeOrdersEmpty = document.getElementById('homeOrdersEmpty');
const homeRecentOrders = document.getElementById('homeRecentOrders');
const ordersEmpty = document.getElementById('ordersEmpty');
const ordersList = document.getElementById('ordersList');

const ORDERS_KEY = 'mlzama-customer-orders-v1';
const screenTitles = {home:'ملزمة',order:'طلب جديد | ملزمة',orders:'طلباتي | ملزمة',services:'الخدمات | ملزمة',more:'عن ملزمة'};
let selectedFiles = [];
let isSubmitting = false;

const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

const mimeByExtension = {
  pdf:'application/pdf', doc:'application/msword',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt:'application/vnd.ms-powerpoint',
  pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png'
};

function showScreen(name, smooth = true) {
  if (!screens.some(screen => screen.dataset.screenPanel === name)) name = 'home';
  screens.forEach(screen => {
    const active = screen.dataset.screenPanel === name;
    screen.hidden = !active;
    screen.classList.toggle('is-active', active);
  });
  navItems.forEach(item => {
    const active = item.dataset.go === name;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  document.title = screenTitles[name] || screenTitles.home;
  history.replaceState(null, '', name === 'home' ? '#home' : `#${name}`);
  window.scrollTo({top:0, behavior:smooth ? 'smooth' : 'auto'});
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-go]');
  if (!target) return;
  showScreen(target.dataset.go);
});

function getFileMime(file) {
  if (file.type) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return mimeByExtension[ext] || 'application/octet-stream';
}

function setStatus(message = '', type = '') {
  submitStatus.textContent = message;
  submitStatus.className = `submit-status ${type}`.trim();
}

function readOrders() {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 20) : [];
  } catch (_) {
    return [];
  }
}

function saveOrder(orderNumber, payload) {
  const orders = readOrders();
  orders.unshift({
    orderNumber,
    createdAt:new Date().toISOString(),
    filesCount:payload.files.length,
    color:payload.color,
    size:payload.size,
    copies:payload.copies,
    status:'تم الاستلام'
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders.slice(0, 20)));
  renderOrders();
}

function orderMarkup(order, compact = false) {
  const color = order.color === 'color' ? 'ملون' : 'أسود وأبيض';
  const date = new Intl.DateTimeFormat('ar-SA', {day:'numeric', month:'short', year:'numeric'}).format(new Date(order.createdAt));
  return `<article class="customer-order">
    <div class="customer-order-head"><strong class="customer-order-number">${escapeHtml(order.orderNumber)}</strong><span class="customer-order-status">${escapeHtml(order.status || 'تم الاستلام')}</span></div>
    <div class="customer-order-meta"><span>${arNum(order.filesCount || 0)} ملف</span><span>${escapeHtml(color)} • ${escapeHtml(order.size || 'A4')}</span>${compact ? '' : `<span>${arNum(order.copies || 1)} نسخة</span>`}<span>${date}</span></div>
  </article>`;
}

function renderOrders() {
  const orders = readOrders();
  homeOrderCount.textContent = arNum(orders.length);
  homeOrdersEmpty.hidden = orders.length > 0;
  homeRecentOrders.hidden = orders.length === 0;
  ordersEmpty.hidden = orders.length > 0;
  ordersList.hidden = orders.length === 0;
  homeRecentOrders.innerHTML = orders.slice(0, 2).map(order => orderMarkup(order, true)).join('');
  ordersList.innerHTML = orders.map(order => orderMarkup(order)).join('');
}

function renderFiles() {
  fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `<div><strong>${escapeHtml(file.name)}</strong><br><small>${formatSize(file.size)}</small></div><button type="button" class="btn btn-ghost btn-small" data-remove="${index}">حذف</button>`;
    fileList.appendChild(div);
  });
  document.getElementById('summaryFiles').querySelector('strong').textContent = selectedFiles.length ? `${arNum(selectedFiles.length)} ملف` : 'لم ترفع ملفات بعد';
  homeFileCount.textContent = arNum(selectedFiles.length);
}

function addFiles(files) {
  const incoming = Array.from(files);
  const allowed = ['pdf','doc','docx','ppt','pptx','jpg','jpeg','png'];
  const rejected = [];
  const valid = incoming.filter(file => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const ok = allowed.includes(ext) && file.size > 0 && file.size <= 50 * 1024 * 1024;
    if (!ok) rejected.push(file.name);
    return ok;
  });
  selectedFiles = [...selectedFiles, ...valid].slice(0, 10);
  renderFiles();
  setStatus(rejected.length ? 'بعض الملفات لم تُضف. الأنواع المدعومة فقط وبحد أقصى 50MB للملف.' : '', rejected.length ? 'error' : '');
}

fileInput.addEventListener('change', event => addFiles(event.target.files));
fileList.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button || isSubmitting) return;
  selectedFiles.splice(Number(button.dataset.remove), 1);
  renderFiles();
});

['dragenter','dragover'].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.add('drag'); }));
['dragleave','drop'].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.remove('drag'); }));
uploadZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
pagesMode.addEventListener('change', () => { pageRangeField.hidden = pagesMode.value !== 'custom'; });

function updateSummary() {
  const data = new FormData(form);
  const color = data.get('color') === 'color' ? 'ملون' : 'أسود وأبيض';
  const sides = data.get('sides') === 'double' ? 'وجهين' : 'وجه واحد';
  document.getElementById('summaryPrint').textContent = `${color} • ${data.get('size')} • ${sides}`;
  document.getElementById('summaryCopies').textContent = arNum(data.get('copies') || 1);
  const bindingMap = {none:'بدون تجليد',spiral:'سلك',staple:'تدبيس ولزق',lamination:'تغليف حراري'};
  document.getElementById('summaryBinding').textContent = bindingMap[data.get('binding')] || 'بدون تجليد';
}
form.addEventListener('input', updateSummary);
form.addEventListener('change', updateSummary);

async function uploadAllFiles(uploads) {
  for (let index = 0; index < uploads.length; index++) {
    const upload = uploads[index];
    const file = selectedFiles[index];
    const percent = Math.round((index / uploads.length) * 100);
    setStatus(`جاري رفع الملفات… ${arNum(percent)}٪ — ${arNum(index + 1)} من ${arNum(uploads.length)}`, 'working');
    const { error } = await supabaseClient.storage.from('print-files').uploadToSignedUrl(upload.path, upload.token, file, {contentType:getFileMime(file), upsert:false});
    if (error) throw new Error(`تعذر رفع الملف: ${file.name}`);
  }
  setStatus('تم رفع جميع الملفات بنجاح ✓', 'success');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (isSubmitting) return;
  if (!selectedFiles.length) {
    uploadZone.scrollIntoView({behavior:'smooth', block:'center'});
    uploadZone.style.borderColor = '#ef4444';
    setTimeout(() => { uploadZone.style.borderColor = ''; }, 1500);
    setStatus('أضف ملفًا واحدًا على الأقل.', 'error');
    return;
  }
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const payload = {
    customerName:data.get('customerName'), phone:data.get('phone'), delivery:data.get('delivery'),
    color:data.get('color'), size:data.get('size'), sides:data.get('sides'), copies:Number(data.get('copies') || 1),
    pagesMode:data.get('pagesMode'), pageRange:data.get('pageRange') || '', binding:data.get('binding'), notes:data.get('notes') || '',
    files:selectedFiles.map(file => ({name:file.name, size:file.size, type:getFileMime(file)}))
  };

  try {
    if (!supabaseClient) throw new Error('تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مجددًا.');
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري تجهيز الطلب…';
    setStatus('جاري إنشاء طلبك الآمن…', 'working');
    const { data:created, error:createError } = await supabaseClient.functions.invoke('create-print-order', {body:payload});
    if (createError) throw createError;
    if (!created?.ok || !Array.isArray(created.uploads)) throw new Error(created?.error || 'تعذر إنشاء الطلب.');
    await uploadAllFiles(created.uploads);
    saveOrder(created.orderNumber, payload);
    orderNumberEl.textContent = created.orderNumber;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    form.reset();
    selectedFiles = [];
    renderFiles();
    updateSummary();
    pagesMode.dispatchEvent(new Event('change'));
  } catch (error) {
    console.error(error);
    let message = error?.message || 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.';
    if (error?.context?.json) {
      try { const body = await error.context.json(); if (body?.error) message = body.error; } catch (_) {}
    }
    setStatus(message, 'error');
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد وإرسال الطلب';
  }
});

closeModal.addEventListener('click', () => {
  modal.hidden = true;
  document.body.style.overflow = '';
  setStatus('');
  showScreen('orders');
});

renderFiles();
renderOrders();
updateSummary();
const initialScreen = location.hash.replace('#', '');
showScreen(['home','order','orders','services','more'].includes(initialScreen) ? initialScreen : 'home', false);
