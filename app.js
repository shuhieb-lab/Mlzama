const SUPABASE_URL = 'https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

let selectedFiles = [];
let isSubmitting = false;

const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const mimeByExtension = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

function getFileMime(file) {
  if (file.type) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return mimeByExtension[ext] || 'application/octet-stream';
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
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function setStatus(message = '', type = '') {
  submitStatus.textContent = message;
  submitStatus.className = `submit-status ${type}`.trim();
}

function addFiles(files) {
  const incoming = Array.from(files);
  const allowed = ['pdf','doc','docx','ppt','pptx','jpg','jpeg','png'];
  const rejected = [];
  const valid = incoming.filter(f => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const ok = allowed.includes(ext) && f.size > 0 && f.size <= 50 * 1024 * 1024;
    if (!ok) rejected.push(f.name);
    return ok;
  });
  selectedFiles = [...selectedFiles, ...valid].slice(0, 10);
  renderFiles();
  if (rejected.length) setStatus('بعض الملفات لم تُضف. الأنواع المدعومة فقط وبحد أقصى 50MB للملف.', 'error');
  else setStatus('');
}

fileInput.addEventListener('change', e => addFiles(e.target.files));
fileList.addEventListener('click', e => {
  const btn = e.target.closest('[data-remove]');
  if (!btn || isSubmitting) return;
  selectedFiles.splice(Number(btn.dataset.remove), 1);
  renderFiles();
});

['dragenter','dragover'].forEach(evt => uploadZone.addEventListener(evt, e => { e.preventDefault(); uploadZone.classList.add('drag'); }));
['dragleave','drop'].forEach(evt => uploadZone.addEventListener(evt, e => { e.preventDefault(); uploadZone.classList.remove('drag'); }));
uploadZone.addEventListener('drop', e => addFiles(e.dataTransfer.files));

pagesMode.addEventListener('change', () => {
  pageRangeField.hidden = pagesMode.value !== 'custom';
});

function updateSummary() {
  const data = new FormData(form);
  const color = data.get('color') === 'color' ? 'ملون' : 'أسود وأبيض';
  const size = data.get('size');
  const sides = data.get('sides') === 'double' ? 'وجهين' : 'وجه واحد';
  document.getElementById('summaryPrint').textContent = `${color} • ${size} • ${sides}`;
  document.getElementById('summaryCopies').textContent = arNum(data.get('copies') || 1);
  const bindingMap = {none:'بدون تجليد',spiral:'سلك',staple:'تدبيس ولزق',lamination:'تغليف حراري'};
  document.getElementById('summaryBinding').textContent = bindingMap[data.get('binding')] || 'بدون تجليد';
}
form.addEventListener('input', updateSummary);
form.addEventListener('change', updateSummary);
updateSummary();

async function uploadAllFiles(uploads) {
  for (let i = 0; i < uploads.length; i++) {
    const upload = uploads[i];
    const file = selectedFiles[i];
    const percent = Math.round((i / uploads.length) * 100);
    setStatus(`جاري رفع الملفات… ${arNum(percent)}٪ — ${arNum(i + 1)} من ${arNum(uploads.length)}`, 'working');
    const { error } = await supabaseClient.storage
      .from('print-files')
      .uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: getFileMime(file),
        upsert: false
      });
    if (error) throw new Error(`تعذر رفع الملف: ${file.name}`);
  }
  setStatus('تم رفع جميع الملفات بنجاح ✓', 'success');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (isSubmitting) return;
  if (!selectedFiles.length) {
    uploadZone.scrollIntoView({behavior:'smooth', block:'center'});
    uploadZone.style.borderColor = '#ef4444';
    setTimeout(() => uploadZone.style.borderColor = '', 1500);
    setStatus('أضف ملفًا واحدًا على الأقل.', 'error');
    return;
  }
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const payload = {
    customerName: data.get('customerName'),
    phone: data.get('phone'),
    delivery: data.get('delivery'),
    color: data.get('color'),
    size: data.get('size'),
    sides: data.get('sides'),
    copies: Number(data.get('copies') || 1),
    pagesMode: data.get('pagesMode'),
    pageRange: data.get('pageRange') || '',
    binding: data.get('binding'),
    notes: data.get('notes') || '',
    files: selectedFiles.map(f => ({ name: f.name, size: f.size, type: getFileMime(f) }))
  };

  try {
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري تجهيز الطلب…';
    setStatus('جاري إنشاء طلبك الآمن…', 'working');

    const { data: created, error: createError } = await supabaseClient.functions.invoke('create-print-order', { body: payload });
    if (createError) throw createError;
    if (!created?.ok || !Array.isArray(created.uploads)) throw new Error(created?.error || 'تعذر إنشاء الطلب.');

    await uploadAllFiles(created.uploads);

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
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch (_) {}
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
});
