const $ = s => document.querySelector(s);
const state = { kind: "publications", items: [] };
const names = { publications:"出版物", conferences:"会议", software:"软件", articles:"文章", news:"新闻" };
async function api(path, options={}) {
  const r = await fetch(`/api/${path}`, { credentials:"same-origin", ...options, headers:{ ...(options.body instanceof FormData?{}:{"content-type":"application/json"}), ...(options.headers||{}) } });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "操作失败");
  return data;
}
async function checkSession(){
  try { await api("session"); $("#login-view").classList.add("hidden"); $("#admin-view").classList.remove("hidden"); load(); } catch {}
}
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault(); const f=new FormData(e.currentTarget);
  try { await api("login",{method:"POST",body:JSON.stringify(Object.fromEntries(f))}); $("#login-view").classList.add("hidden"); $("#admin-view").classList.remove("hidden"); load(); }
  catch(err){ $("#login-message").textContent=err.message; }
});
$("#logout").addEventListener("click",async()=>{await api("logout",{method:"POST",body:"{}"});location.reload()});
document.querySelectorAll("aside nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("aside nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.kind=b.dataset.kind;$("#section-title").textContent=names[state.kind];load()}));
async function load(){
  const [zh,en]=await Promise.all([api(`content?kind=${state.kind}&locale=zh`),api(`content?kind=${state.kind}&locale=en`)]);
  state.items=[...zh.items,...en.items]; draw();
}
function draw(){
  const q=$("#admin-search").value.toLowerCase(); const items=state.items.filter(x=>!q||`${x.title}${x.authors}`.toLowerCase().includes(q));
  $("#count").textContent=`${items.length} 条记录`;
  $("#records").innerHTML=items.length?items.map(x=>`<article class="row"><span class="year">${x.year||"—"}</span><div><h3>${x.title}</h3><p>${x.locale.toUpperCase()} · ${x.type} · ${x.authors||"未填写作者"}</p></div><div class="actions"><button data-edit="${x.id}">编辑</button><button class="danger" data-delete="${x.id}">删除</button></div></article>`).join(""):`<div class="row"><p>该栏目暂无后台数据。</p></div>`;
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEditor(state.items.find(x=>x.id==b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("确定删除这条内容？")){await api(`content/${b.dataset.delete}`,{method:"DELETE",body:"{}"});load()}});
}
$("#admin-search").addEventListener("input",draw);
$("#new-item").onclick=()=>openEditor();
function openEditor(item={}){
  const f=$("#editor-form");f.reset();f.id.value=item.id||"";f.locale.value=item.locale||"zh";f.year.value=item.year||new Date().getFullYear();f.type.value=item.type||"";f.title.value=item.title||"";f.authors.value=item.authors||"";f.venue.value=item.venue||"";f.date.value=item.date||"";f.sort_order.value=item.sort_order||0;f.abstract.value=item.abstract||"";f.image_url.value=item.image_url||"";f.links.value=JSON.stringify(item.links||[],null,2);f.featured.checked=Boolean(item.featured);$("#editor-message").textContent="";$("#editor").showModal();
}
$("#editor-form").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget); const body=Object.fromEntries(f);body.kind=state.kind;body.featured=f.get("featured")==="on";body.links=f.get("links")||"[]";
  try{await api(body.id?`content/${body.id}`:"content",{method:body.id?"PUT":"POST",body:JSON.stringify(body)});$("#editor").close();load()}catch(err){$("#editor-message").textContent=err.message}
});
$("#upload").onclick=async()=>{
  const file=$("#file-input").files[0];if(!file)return;const form=new FormData();form.append("file",file);
  try{const d=await api("upload",{method:"POST",body:form});$("#editor-form").image_url.value=d.url}catch(err){$("#editor-message").textContent=err.message}
};
checkSession();
