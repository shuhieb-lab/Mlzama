// لوحة إدارة ملزمة — إصدار الطلبات 4
const SUPABASE_URL='https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let config=null;
let promoImageUrl=null;
let knownOrderIds=null;
let audioContext=null;
const arNum=value=>String(value??'').replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const statusLabels={new:'جديد',printing:'قيد الطباعة',ready:'جاهز',completed:'مكتمل',cancelled:'ملغي'};

function status(id,message,type=''){const el=$(id);el.textContent=message;el.style.color=type==='error'?'#c84242':type==='success'?'#08745f':''}
async function callAdmin(body){const {data,error}=await client.functions.invoke('admin-config',{body});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'تعذر تنفيذ العملية.');return data}

async function loadPanel(){
  try{config=await callAdmin({action:'get'});$('loginCard').hidden=true;$('adminPanel').hidden=false;document.querySelectorAll('[data-price]').forEach(input=>input.value=config.pricing[input.dataset.price]??0);renderPromoForm();renderDiscounts();renderOrders();if(knownOrderIds===null)knownOrderIds=new Set((config.orders||[]).map(order=>order.id));updateNotificationButton()}
  catch(error){$('loginCard').hidden=false;$('adminPanel').hidden=true;status('loginStatus',error.message||'تعذر الدخول.','error')}
}
function renderPromoForm(){
  const promo=config?.promo||{};
  $('promoActive').checked=promo.active===true;
  $('promoLabel').value=promo.label||'';
  $('promoTitle').value=promo.title||'';
  $('promoLink').value=promo.link_url||'';
  promoImageUrl=promo.image_url||null;
  $('promoPreview').src=promoImageUrl||'';
  $('promoPreview').hidden=!promoImageUrl;
  $('clearPromoImage').hidden=!promoImageUrl;
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
function updateNotificationButton(){
  const supported='Notification' in window;
  const granted=supported&&Notification.permission==='granted'&&localStorage.getItem('mlzama-notifications')==='on';
  $('enableNotifications').textContent=granted?'التنبيه مفعّل ✓':'تفعيل التنبيه';
  $('enableNotifications').disabled=!supported||Notification.permission==='denied';
}
function showToast(message){const el=$('newOrderToast');el.textContent=message;el.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{el.hidden=true},7000)}
function beep(){
  try{if(!audioContext)return;const oscillator=audioContext.createOscillator();const gain=audioContext.createGain();oscillator.frequency.value=880;gain.gain.setValueAtTime(.12,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.35);oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.35)}catch(_){}
}
function notifyNewOrders(orders){
  if(knownOrderIds===null){knownOrderIds=new Set(orders.map(order=>order.id));return}
  const fresh=orders.filter(order=>!knownOrderIds.has(order.id));
  orders.forEach(order=>knownOrderIds.add(order.id));
  if(!fresh.length)return;
  const latest=fresh[0];
  const message=`${latest.customer_name} • ${Number(latest.total_amount||0).toFixed(2)} ر.س`;
  showToast(`طلب جديد: ${message}`);beep();
  if('Notification' in window&&Notification.permission==='granted'&&localStorage.getItem('mlzama-notifications')==='on'){
    try{new Notification('طلب طباعة جديد',{body:message,icon:'logo.jpeg',tag:latest.id})}catch(_){}
  }
}
async function refreshData(shouldNotify=false){
  const next=await callAdmin({action:'get'});
  if(shouldNotify)notifyNewOrders(next.orders||[]);
  config=next;renderOrders();
}
$('sendLink').addEventListener('click',async()=>{const email=$('adminEmail').value.trim().toLowerCase();if(!email)return status('loginStatus','أدخل البريد الإلكتروني.','error');$('sendLink').disabled=true;const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('sendLink').disabled=false;if(error)return status('loginStatus',error.message,'error');status('loginStatus','تم إرسال رابط الدخول إلى بريدك.','success')});
$('savePricing').addEventListener('click',async()=>{try{const pricing={};document.querySelectorAll('[data-price]').forEach(input=>pricing[input.dataset.price]=Number(input.value));await callAdmin({action:'updatePricing',pricing});status('pricingStatus','تم حفظ الأسعار.','success')}catch(e){status('pricingStatus',e.message,'error')}});
$('promoImageFile').addEventListener('change',()=>{const file=$('promoImageFile').files[0];if(!file)return;$('promoPreview').src=URL.createObjectURL(file);$('promoPreview').hidden=false;$('clearPromoImage').hidden=false;status('promoStatus','الصورة جاهزة للحفظ.')});
$('clearPromoImage').addEventListener('click',()=>{promoImageUrl=null;$('promoImageFile').value='';$('promoPreview').src='';$('promoPreview').hidden=true;$('clearPromoImage').hidden=true;status('promoStatus','سيتم حذف الصورة عند الحفظ.')});
$('savePromo').addEventListener('click',async()=>{const button=$('savePromo');try{button.disabled=true;status('promoStatus','جاري حفظ البنر…');const file=$('promoImageFile').files[0];if(file){const upload=await callAdmin({action:'createPromoUpload',file:{name:file.name,size:file.size,type:file.type}});const {error}=await client.storage.from('site-assets').uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type,upsert:false});if(error)throw error;promoImageUrl=upload.publicUrl}const result=await callAdmin({action:'updatePromo',promo:{active:$('promoActive').checked,label:$('promoLabel').value,title:$('promoTitle').value,link_url:$('promoLink').value,image_url:promoImageUrl}});config.promo=result.promo;$('promoImageFile').value='';renderPromoForm();status('promoStatus','تم حفظ البنر وظهر في الموقع.','success')}catch(e){status('promoStatus',e.message||'تعذر حفظ البنر.','error')}finally{button.disabled=false}});
$('saveDiscount').addEventListener('click',async()=>{try{await callAdmin({action:'saveDiscount',discount:{code:$('code').value,discount_type:$('discountType').value,discount_value:Number($('discountValue').value),minimum_order:Number($('minimumOrder').value),expires_at:$('expiresAt').value?new Date($('expiresAt').value+'T23:59:59').toISOString():null,usage_limit:$('usageLimit').value?Number($('usageLimit').value):null,active:true}});status('discountStatus','تم حفظ كود الخصم.','success');config=await callAdmin({action:'get'});renderDiscounts()}catch(e){status('discountStatus',e.message,'error')}});
$('discounts').addEventListener('click',async event=>{const button=event.target.closest('[data-delete]');if(!button)return;if(!confirm(`حذف الكود ${button.dataset.delete}؟`))return;await callAdmin({action:'deleteDiscount',code:button.dataset.delete});config=await callAdmin({action:'get'});renderDiscounts()});
$('orders').addEventListener('change',async event=>{if(!event.target.matches('[data-order-status]'))return;const orderId=event.target.closest('[data-order]').dataset.order;event.target.disabled=true;try{await callAdmin({action:'updateOrderStatus',orderId,status:event.target.value});config=await callAdmin({action:'get'});renderOrders()}catch(e){alert(e.message)}finally{event.target.disabled=false}});
$('enableNotifications').addEventListener('click',async()=>{if(!('Notification' in window))return;try{const AudioCtor=window.AudioContext||window.webkitAudioContext;if(AudioCtor){audioContext=audioContext||new AudioCtor();await audioContext.resume()}const permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem('mlzama-notifications','on');showToast('تم تفعيل تنبيه الطلبات الجديدة.')}updateNotificationButton()}catch(_){showToast('تعذر تفعيل التنبيه في هذا المتصفح.')}});
$('refreshOrders').addEventListener('click',async()=>{try{await refreshData(false)}catch(e){alert(e.message)}});
$('logout').addEventListener('click',async()=>{await client.auth.signOut();location.reload()});
client.auth.onAuthStateChange((_event,session)=>{if(session)loadPanel()});
client.auth.getSession().then(({data})=>{if(data.session)loadPanel()});
setInterval(async()=>{if(!$('adminPanel').hidden){try{await refreshData(true)}catch(_){}}},15000);
