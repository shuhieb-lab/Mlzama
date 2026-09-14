// لوحة إدارة ملزمة — إصدار الطلبات 4
const SUPABASE_URL='https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let config=null;
const arNum=value=>String(value??'').replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const statusLabels={new:'جديد',printing:'قيد الطباعة',ready:'جاهز',completed:'مكتمل',cancelled:'ملغي'};

function status(id,message,type=''){const el=$(id);el.textContent=message;el.style.color=type==='error'?'#c84242':type==='success'?'#08745f':''}
async function callAdmin(body){const {data,error}=await client.functions.invoke('admin-config',{body});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'تعذر تنفيذ العملية.');return data}

async function loadPanel(){
  try{config=await callAdmin({action:'get'});$('loginCard').hidden=true;$('adminPanel').hidden=false;document.querySelectorAll('[data-price]').forEach(input=>input.value=config.pricing[input.dataset.price]??0);renderDiscounts();renderOrders()}
  catch(error){$('loginCard').hidden=false;$('adminPanel').hidden=true;status('loginStatus',error.message||'تعذر الدخول.','error')}
}
function renderDiscounts(){
  const list=config?.discounts||[];$('discounts').innerHTML=list.length?list.map(d=>`<div class="discount"><div><strong>${d.code}</strong><small>${d.discount_type==='percent'?d.discount_value+'٪':d.discount_value+' ر.س'} • استُخدم ${d.used_count}${d.usage_limit?' من '+d.usage_limit:''}</small></div><button class="btn danger" data-delete="${d.code}">حذف</button></div>`).join(''):'<p class="status">لا توجد أكواد خصم حتى الآن.</p>'
}
function renderOrders(){
  const orders=config?.orders||[];
  $('allOrders').textContent=arNum(orders.length);
  $('newOrders').textContent=arNum(orders.filter(o=>o.status==='new').length);
  $('printingOrders').textContent=arNum(orders.filter(o=>o.status==='printing').length);
  $('orders').innerHTML=orders.length?orders.map(o=>{
    const phone=String(o.phone||'').replace(/\D/g,'').replace(/^0/,'966');
    const files=(o.order_files||[]).map(f=>f.download_url?`<a class="file-link" target="_blank" rel="noopener" href="${escapeHtml(f.download_url)}">📄 ${escapeHtml(f.original_name)}</a>`:`<span class="file-link" style="color:#c84242;background:#fff0f0">لم يكتمل: ${escapeHtml(f.original_name)}</span>`).join('');
    const date=new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(o.created_at));
    return `<article class="order" data-order="${o.id}"><div class="order-head"><div><div class="order-number">${escapeHtml(o.order_number)}</div><strong>${escapeHtml(o.customer_name)}</strong><small>${escapeHtml(o.phone)} • ${date}</small></div><div><span class="status">${statusLabels[o.status]||o.status}</span><div class="order-total">${arNum(Number(o.total_amount||0).toFixed(2))} ر.س</div></div></div><div class="order-grid"><div><span>الصفحات</span><strong>${arNum(o.total_pages||0)} صفحة</strong></div><div><span>الطباعة</span><strong>${o.print_color==='color'?'ملون':'أسود وأبيض'} • ${escapeHtml(o.paper_size)}</strong></div><div><span>النسخ</span><strong>${arNum(o.copies)}</strong></div><div><span>التوصيل</span><strong>${arNum(Number(o.delivery_fee||0).toFixed(2))} ر.س</strong></div><div><span>العنوان</span><strong>${escapeHtml(o.address||'—')}</strong></div><div><span>الخصم</span><strong>${arNum(Number(o.discount_amount||0).toFixed(2))} ر.س</strong></div></div><div class="files">${files||'<span class="status">لا يوجد ملف</span>'}</div>${o.notes?`<p class="status">ملاحظة: ${escapeHtml(o.notes)}</p>`:''}<div class="order-actions"><select data-order-status><option value="new" ${o.status==='new'?'selected':''}>جديد</option><option value="printing" ${o.status==='printing'?'selected':''}>قيد الطباعة</option><option value="ready" ${o.status==='ready'?'selected':''}>جاهز</option><option value="completed" ${o.status==='completed'?'selected':''}>مكتمل</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>ملغي</option></select><a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/${phone}">واتساب</a></div></article>`;
  }).join(''):'<div class="empty">لا توجد طلبات حتى الآن.</div>';
}
$('sendLink').addEventListener('click',async()=>{const email=$('adminEmail').value.trim().toLowerCase();if(!email)return status('loginStatus','أدخل البريد الإلكتروني.','error');$('sendLink').disabled=true;const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('sendLink').disabled=false;if(error)return status('loginStatus',error.message,'error');status('loginStatus','تم إرسال رابط الدخول إلى بريدك.','success')});
$('savePricing').addEventListener('click',async()=>{try{const pricing={};document.querySelectorAll('[data-price]').forEach(input=>pricing[input.dataset.price]=Number(input.value));await callAdmin({action:'updatePricing',pricing});status('pricingStatus','تم حفظ الأسعار.','success')}catch(e){status('pricingStatus',e.message,'error')}});
$('saveDiscount').addEventListener('click',async()=>{try{await callAdmin({action:'saveDiscount',discount:{code:$('code').value,discount_type:$('discountType').value,discount_value:Number($('discountValue').value),minimum_order:Number($('minimumOrder').value),expires_at:$('expiresAt').value?new Date($('expiresAt').value+'T23:59:59').toISOString():null,usage_limit:$('usageLimit').value?Number($('usageLimit').value):null,active:true}});status('discountStatus','تم حفظ كود الخصم.','success');config=await callAdmin({action:'get'});renderDiscounts()}catch(e){status('discountStatus',e.message,'error')}});
$('discounts').addEventListener('click',async event=>{const button=event.target.closest('[data-delete]');if(!button)return;if(!confirm(`حذف الكود ${button.dataset.delete}؟`))return;await callAdmin({action:'deleteDiscount',code:button.dataset.delete});config=await callAdmin({action:'get'});renderDiscounts()});
$('orders').addEventListener('change',async event=>{if(!event.target.matches('[data-order-status]'))return;const orderId=event.target.closest('[data-order]').dataset.order;event.target.disabled=true;try{await callAdmin({action:'updateOrderStatus',orderId,status:event.target.value});config=await callAdmin({action:'get'});renderOrders()}catch(e){alert(e.message)}finally{event.target.disabled=false}});
$('refreshOrders').addEventListener('click',async()=>{config=await callAdmin({action:'get'});renderOrders()});
$('logout').addEventListener('click',async()=>{await client.auth.signOut();location.reload()});
client.auth.onAuthStateChange((_event,session)=>{if(session)loadPanel()});
client.auth.getSession().then(({data})=>{if(data.session)loadPanel()});
setInterval(async()=>{if(!$('adminPanel').hidden){try{config=await callAdmin({action:'get'});renderOrders()}catch(_){}}},15000);
