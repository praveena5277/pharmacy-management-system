async function checkAuth(){
  try{
    const res=await fetch("/api/auth");
    const data=await res.json();
    if(data.logged_in) showApp(); else showLogin();
  }catch(e){ showLogin(); }
}
function showLogin(){document.getElementById("loginPage").style.display="flex";document.getElementById("appPage").style.display="none";}
function showApp(){document.getElementById("loginPage").style.display="none";document.getElementById("appPage").style.display="block";showSection("dashboard");}
document.getElementById("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const res=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:username.value,password:password.value})});
  const data=await res.json(); loginMsg.textContent=data.message||data.error; if(res.ok) showApp();
});
async function logout(){await fetch("/api/logout",{method:"POST"});showLogin();}
let medicines=[],cart=[],members=[];
function showSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id==="medicines"||id==="dashboard"||id==="sale"||id==="members") loadData();
}
async function loadData(){await Promise.all([loadMedicines(),loadMembers()]);}
async function loadMedicines(){
  const res=await fetch("/api/medicines"); medicines=await res.json();
  updateDashboard();renderMedicines();renderShop();
}
async function loadMembers(){
  const res=await fetch("/api/members"); members=await res.json();
  document.getElementById("memberTotal").textContent=members.length;
  renderMembers();
  const select=document.getElementById("memberSelect");
  select.innerHTML=members.map(m=>`<option value="${m.member_id}">${m.member_id} - ${m.name} (${m.phone})</option>`).join("");
}
function updateDashboard(){
  const now=new Date(),soon=new Date();soon.setDate(now.getDate()+30);
  total.textContent=medicines.length;
  low.textContent=medicines.filter(m=>Number(m.quantity)<=10).length;
  expired.textContent=medicines.filter(m=>new Date(m.expiry)<now).length;
  document.getElementById("soon").textContent=medicines.filter(m=>{let d=new Date(m.expiry);return d>=now&&d<=soon;}).length;
}
function renderMedicines(){
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  const list=medicines.filter(m=>m.name.toLowerCase().includes(q));
  medicineList.innerHTML=list.map(m=>`<div class="medicine"><div><h3>${m.name}</h3>Batch: ${m.batch} | Expiry: ${m.expiry} | Qty: ${m.quantity} | Price: ₹${m.price}</div><button onclick="deleteMedicine('${m._id}')">Delete</button></div>`).join("");
}
async function deleteMedicine(id){if(!confirm("Delete this medicine?"))return;await fetch("/api/medicines/"+id,{method:"DELETE"});loadMedicines();}
document.getElementById("medicineForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,btn=form.querySelector("button[type=submit]"),data=Object.fromEntries(new FormData(form));
 btn.disabled=true;btn.textContent="Adding...";
 try{const res=await fetch("/api/medicines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const r=await res.json();formMsg.textContent=r.message||r.error;if(res.ok){form.reset();await loadMedicines();formMsg.textContent=r.message+" You can add another medicine.";}}
 catch(err){formMsg.textContent="Unable to connect to server. Make sure python app.py is running."}
 finally{btn.disabled=false;btn.textContent="Add Medicine";}
});
function renderMembers(){memberList.innerHTML=members.map(m=>`<div class="medicine"><div><h3>${m.member_id} - ${m.name}</h3>Phone: ${m.phone} | Email: ${m.email||"-"}</div></div>`).join("");}
document.getElementById("memberForm").addEventListener("submit",async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
 const res=await fetch("/api/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 const r=await res.json();memberMsg.textContent=r.message||r.error;
 if(res.ok){e.target.reset();await loadMembers();}
});
function renderShop(){
 shop.innerHTML=medicines.filter(m=>Number(m.quantity)>0).map(m=>`<div class="shopitem"><b>${m.name}</b> — ₹${m.price} <small>(Stock: ${m.quantity})</small><button onclick="addCart('${m._id}')">Add to Cart</button></div>`).join("");updateCart();
}
function addCart(id){const m=medicines.find(x=>x._id===id),existing=cart.find(x=>x.id===id);if(existing){if(existing.quantity<Number(m.quantity))existing.quantity++;}else cart.push({id:m._id,name:m.name,price:Number(m.price),quantity:1});updateCart();}
function updateCart(){cartTotal.textContent=cart.reduce((s,x)=>s+x.price*x.quantity,0).toFixed(2);}
document.getElementById("orderForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length){orderMsg.textContent="Cart is empty";return;}
 const f=Object.fromEntries(new FormData(e.target)),memberId=memberSelect.value;
 const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({member_id:memberId,customer:f,items:cart})});
 const r=await res.json();orderMsg.textContent=r.message||r.error;if(res.ok){cart=[];e.target.reset();loadMedicines();}
});
checkAuth();