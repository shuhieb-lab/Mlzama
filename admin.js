const ordersEl = document.getElementById('orders');
const searchEl = document.getElementById('search');
const clearAll = document.getElementById('clearAll');
const countLabel = document.getElementById('countLabel');
const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const bindingMap = {none:'بدون تجليد',spiral:'سلك',staple:'تدبيس ولزق',lamination:'تغليف حراري'};
const statusMap = {new:'جديد',printing:'جاري الطباعة',ready:'جاهز للاستلام',completed:'تم التسليم'};
const statusClass = {new:'status-new',printing:'status-printing',ready:'status-ready',completed:'status-completed'};

function getOrders(){ return JSON.parse(localStorage.getItem('mulzamaOrders') || '[]'); }
function saveOrders(orders){ localStorage.setItem('mulzamaOrders', JSON.stringify(orders)); }
function fmtDate(iso){ return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)); }
function updateStats(orders){ ['new','printing','ready','completed'].forEach(s => document.getElementById(`stat${s[0].toUpperCase()+s.slice(1)}`).textContent = arNum(orders.filter(o=>o.status===s).length)); }

function render(){
  const all = getOrders();
  const q = searchEl.value.trim().toLowerCase();
  const orders = !q ? all : all.filter(o => [o.id,o.customerName,o.phone].some(v => String(v||'').toLowerCase().includes(q)));
  updateStats(all);
  countLabel.textContent = `${arNum(orders.length)} طلب`;
  if(!orders.length){ ordersEl.innerHTML = `<div class="empty">لا توجد طلبات لعرضها حاليًا.</div>`; return; }
  ordersEl.innerHTML = orders.map(o => `
    <article class="order" data-id="${o.id}">
      <div class="order-head"><div><div class="order-id">${o.id}</div><strong>${o.customerName}</strong><div style="color:var(--muted);font-size:.9rem">${o.phone} • ${fmtDate(o.createdAt)}</div></div><span class="status ${statusClass[o.status]}">${statusMap[o.status]}</span></div>
      <div class="order-grid">
        <div><span>الطباعة</span><strong>${o.color==='color'?'ملون':'أسود وأبيض'} • ${o.size}</strong></div>
        <div><span>الوجه</span><strong>${o.sides==='double'?'وجهين':'وجه واحد'}</strong></div>
        <div><span>عدد النسخ</span><strong>${arNum(o.copies)}</strong></div>
        <div><span>التجليد</span><strong>${bindingMap[o.binding]||'-'}</strong></div>
      </div>
      <div class="file-chips">${o.files.map(f=>`<span class="chip">📄 ${f.name}</span>`).join('')}</div>
      ${o.notes ? `<p style="margin:12px 0 0"><strong>ملاحظة:</strong> ${o.notes}</p>`:''}
      <div class="order-actions"><label>تحديث الحالة: <select data-status><option value="new" ${o.status==='new'?'selected':''}>جديد</option><option value="printing" ${o.status==='printing'?'selected':''}>جاري الطباعة</option><option value="ready" ${o.status==='ready'?'selected':''}>جاهز للاستلام</option><option value="completed" ${o.status==='completed'?'selected':''}>تم التسليم</option></select></label><button class="btn btn-ghost btn-small" data-delete>حذف</button></div>
    </article>`).join('');
}

ordersEl.addEventListener('change', e => {
  if(!e.target.matches('[data-status]')) return;
  const id = e.target.closest('[data-id]').dataset.id;
  const orders = getOrders();
  const order = orders.find(o=>o.id===id); if(order) order.status = e.target.value;
  saveOrders(orders); render();
});
ordersEl.addEventListener('click', e => {
  if(!e.target.matches('[data-delete]')) return;
  const id = e.target.closest('[data-id]').dataset.id;
  saveOrders(getOrders().filter(o=>o.id!==id)); render();
});
searchEl.addEventListener('input', render);
clearAll.addEventListener('click', ()=>{ if(confirm('مسح جميع الطلبات التجريبية؟')){ localStorage.removeItem('mulzamaOrders'); render(); } });
render();
