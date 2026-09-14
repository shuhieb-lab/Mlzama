const SUPABASE_URL='https://wmrumefyczfzgepzdxnx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_dibsg7RAZFNTxZp7pDu0oQ_PSFm6o8o';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let config=null;

function status(id,message,type=''){const el=$(id);el.textContent=message;el.style.color=type==='error'?'#c84242':type==='success'?'#08745f':''}
async function callAdmin(body){const {data,error}=await client.functions.invoke('admin-config',{body});if(error)throw error;if(!data?.ok)throw new Error(data?.error||'تعذر تنفيذ العملية.');return data}

async function loadPanel(){
  try{config=await callAdmin({action:'get'});$('loginCard').hidden=true;$('adminPanel').hidden=false;document.querySelectorAll('[data-price]').forEach(input=>input.value=config.pricing[input.dataset.price]??0);renderDiscounts()}
  catch(error){$('loginCard').hidden=false;$('adminPanel').hidden=true;status('loginStatus',error.message||'تعذر الدخول.','error')}
}
function renderDiscounts(){
  const list=config?.discounts||[];$('discounts').innerHTML=list.length?list.map(d=>`<div class="discount"><div><strong>${d.code}</strong><small>${d.discount_type==='percent'?d.discount_value+'٪':d.discount_value+' ر.س'} • استُخدم ${d.used_count}${d.usage_limit?' من '+d.usage_limit:''}</small></div><button class="btn danger" data-delete="${d.code}">حذف</button></div>`).join(''):'<p class="status">لا توجد أكواد خصم حتى الآن.</p>'
}
$('sendLink').addEventListener('click',async()=>{const email=$('adminEmail').value.trim().toLowerCase();if(!email)return status('loginStatus','أدخل البريد الإلكتروني.','error');$('sendLink').disabled=true;const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('sendLink').disabled=false;if(error)return status('loginStatus',error.message,'error');status('loginStatus','تم إرسال رابط الدخول إلى بريدك.','success')});
$('savePricing').addEventListener('click',async()=>{try{const pricing={};document.querySelectorAll('[data-price]').forEach(input=>pricing[input.dataset.price]=Number(input.value));await callAdmin({action:'updatePricing',pricing});status('pricingStatus','تم حفظ الأسعار.','success')}catch(e){status('pricingStatus',e.message,'error')}});
$('saveDiscount').addEventListener('click',async()=>{try{await callAdmin({action:'saveDiscount',discount:{code:$('code').value,discount_type:$('discountType').value,discount_value:Number($('discountValue').value),minimum_order:Number($('minimumOrder').value),expires_at:$('expiresAt').value?new Date($('expiresAt').value+'T23:59:59').toISOString():null,usage_limit:$('usageLimit').value?Number($('usageLimit').value):null,active:true}});status('discountStatus','تم حفظ كود الخصم.','success');config=await callAdmin({action:'get'});renderDiscounts()}catch(e){status('discountStatus',e.message,'error')}});
$('discounts').addEventListener('click',async event=>{const button=event.target.closest('[data-delete]');if(!button)return;if(!confirm(`حذف الكود ${button.dataset.delete}؟`))return;await callAdmin({action:'deleteDiscount',code:button.dataset.delete});config=await callAdmin({action:'get'});renderDiscounts()});
$('logout').addEventListener('click',async()=>{await client.auth.signOut();location.reload()});
client.auth.onAuthStateChange((_event,session)=>{if(session)loadPanel()});
client.auth.getSession().then(({data})=>{if(data.session)loadPanel()});
