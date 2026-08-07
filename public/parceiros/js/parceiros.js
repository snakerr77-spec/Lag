(() => {
  "use strict";

  const META_KEY = "lag-partner-file-library-v1";
  const DB_NAME = "lag-partner-files-v1";
  const STORE = "files";
  const CITIES = ["Cerquilho", "Tatuí", "Embu das Artes", "Itapeva"];
  const SWITCH_ROLES = new Set(["admin", "administrador", "gerente", "gestor", "financeiro"]);
  const $ = id => document.getElementById(id);
  const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
  const state = { data: loadMeta(), city:"Cerquilho", partner:"", folder:"", type:"", query:"" };

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    initSidebarState();
    configureCity();
    seedDefaults();
    bind();
    render();
  }

  function loadMeta(){
    try {
      const data = JSON.parse(localStorage.getItem(META_KEY) || "null");
      if (data?.partners && data?.folders && data?.files) return data;
    } catch (_) {}
    return { partners:[], folders:[], files:[], updatedAt:null };
  }
  function saveMeta(){ state.data.updatedAt=new Date().toISOString(); localStorage.setItem(META_KEY,JSON.stringify(state.data)); }
  function seedDefaults(){
    if (!state.data.partners.length) {
      state.data.partners.push({id:"partner-tec-cerquilho",name:"Tec Imagem Cerquilho",city:"Cerquilho",contact:"Contato a confirmar",note:"Parceiro de exames de imagem",createdAt:new Date().toISOString()});
    }
    if (!state.data.folders.length) {
      state.data.folders.push(
        {id:"folder-contracts",name:"Contratos",city:"Cerquilho",partnerId:"partner-tec-cerquilho",description:"Contratos e termos da parceria",createdAt:new Date().toISOString()},
        {id:"folder-spreadsheets",name:"Planilhas",city:"Cerquilho",partnerId:"partner-tec-cerquilho",description:"Planilhas e relatórios enviados pelo parceiro",createdAt:new Date().toISOString()},
        {id:"folder-documents",name:"Documentos gerais",city:"Cerquilho",partnerId:"partner-tec-cerquilho",description:"Outros documentos da parceria",createdAt:new Date().toISOString()}
      );
    }
    saveMeta();
  }

  function configureCity(){
    const settings=window.LAGSettings;
    const user=settings?.getCurrentUser?.() || {role:"admin",unit:"Cerquilho"};
    const role=settings?.normalizeRole?.(user.role) || normalize(user.role);
    const active=settings?.getActiveCity?.() || user.unit || "Cerquilho";
    state.city=CITIES.includes(active)?active:(CITIES.includes(user.unit)?user.unit:"Cerquilho");
    const options=`<option value="Todas as cidades">Todas as cidades</option>${CITIES.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("")}`;
    $("partnerCity").innerHTML=options;
    $("partnerCity").value=state.city;
    $("partnerCity").disabled=!SWITCH_ROLES.has(role);
    ["partnerFormCity","folderCity","uploadCity"].forEach(id=>{ $(id).innerHTML=CITIES.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join(""); $(id).value=state.city; });
  }

  function bind(){
    $("menuButton")?.addEventListener("click",toggleSidebar);
    $("mobileOverlay")?.addEventListener("click",closeMobileSidebar);
    $("partnerCity").addEventListener("change",()=>{state.city=$("partnerCity").value; state.partner=""; state.folder=""; window.LAGSettings?.setActiveCity?.(state.city,false); render();});
    $("partnerFilter").addEventListener("change",()=>{state.partner=$("partnerFilter").value; state.folder=""; render();});
    $("fileTypeFilter").addEventListener("change",()=>{state.type=$("fileTypeFilter").value; renderFiles();});
    $("partnerSearch").addEventListener("input",e=>{state.query=normalize(e.target.value); renderFiles();});
    $("newPartner").addEventListener("click",()=>openModal("partnerModal"));
    $("newFolder").addEventListener("click",()=>openFolderModal());
    $("newFolderInline").addEventListener("click",()=>openFolderModal());
    ["uploadFile","uploadFileInline","emptyUpload"].forEach(id=>$(id)?.addEventListener("click",openUploadModal));
    $("refreshLibrary").addEventListener("click",()=>{render();toast("Biblioteca atualizada.");});
    $("partnerForm").addEventListener("submit",savePartner);
    $("folderForm").addEventListener("submit",saveFolder);
    $("uploadForm").addEventListener("submit",saveFiles);
    qsa("[data-close-modal]").forEach(btn=>btn.addEventListener("click",closeModals));
    qsa(".partner-modal").forEach(modal=>modal.addEventListener("click",e=>{if(e.target===modal)closeModals();}));
    $("folderList").addEventListener("click",handleFolderClick);
    document.querySelector("[data-folder-id='']")?.addEventListener("click",()=>{state.folder="";renderFolders();renderFiles();});
    $("fileGrid").addEventListener("click",handleFileAction);
    $("fileInput").addEventListener("change",()=>{const n=$("fileInput").files.length;const text=document.querySelector(".upload-zone small");if(text)text.textContent=n?`${n} arquivo(s) selecionado(s)`:"PDF, Excel, Word, imagens ou outros documentos";});
    $("folderCity").addEventListener("change",renderFolderPartnerOptions);
    $("uploadCity").addEventListener("change",()=>{renderUploadPartnerOptions();renderUploadFolderOptions();});
    $("uploadPartner").addEventListener("change",renderUploadFolderOptions);
    window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("partnerSearch").focus();}if(e.key==="Escape")closeModals();});
  }

  function visiblePartners(){return state.data.partners.filter(p=>state.city==="Todas as cidades"||p.city===state.city);}
  function filteredPartners(){return visiblePartners().filter(p=>!state.partner||p.id===state.partner);}
  function visibleFolders(){return state.data.folders.filter(f=>(state.city==="Todas as cidades"||f.city===state.city)&&(!state.partner||f.partnerId===state.partner));}
  function visibleFiles(){
    return state.data.files.filter(f=>{
      const folder=state.data.folders.find(x=>x.id===f.folderId);
      const partner=state.data.partners.find(x=>x.id===f.partnerId);
      const cityOk=state.city==="Todas as cidades"||f.city===state.city;
      const partnerOk=!state.partner||f.partnerId===state.partner;
      const folderOk=!state.folder||f.folderId===state.folder;
      const typeOk=!state.type||fileKind(f)===state.type;
      const hay=normalize(`${f.name} ${f.category} ${f.note} ${folder?.name||""} ${partner?.name||""} ${f.city}`);
      return cityOk&&partnerOk&&folderOk&&typeOk&&(!state.query||hay.includes(state.query));
    }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }

  function render(){renderPartnerOptions();renderFolders();renderFiles();renderMetrics();}
  function renderPartnerOptions(){
    const partners=visiblePartners();
    const current=state.partner;
    $("partnerFilter").innerHTML=`<option value="">Todos os parceiros</option>${partners.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("")}`;
    if(partners.some(p=>p.id===current))$("partnerFilter").value=current;else state.partner="";
  }
  function renderFolders(){
    const folders=visibleFolders();
    document.querySelector("[data-folder-id='']")?.classList.toggle("active",!state.folder);
    $("folderList").innerHTML=folders.map(folder=>{
      const partner=state.data.partners.find(p=>p.id===folder.partnerId);
      const count=state.data.files.filter(f=>f.folderId===folder.id).length;
      return `<div class="folder-row ${state.folder===folder.id?"active":""}" data-folder-id="${folder.id}"><span><i class="fa-solid fa-folder"></i></span><div><strong>${escapeHTML(folder.name)}</strong><small>${escapeHTML(partner?.name||"Sem parceiro")} · ${count} arquivo(s)</small></div><div class="folder-actions"><button class="folder-delete" data-delete-folder="${folder.id}" title="Excluir pasta"><i class="fa-solid fa-trash"></i></button><i class="fa-solid fa-chevron-right"></i></div></div>`;
    }).join("");
    const all=visibleFiles().length;
    $("allFilesLabel").textContent=`${all} ${all===1?"arquivo":"arquivos"}`;
    const active=state.data.folders.find(f=>f.id===state.folder);
    $("activeFolderTitle").textContent=active?.name||"Todos os arquivos";
    $("activeFolderSubtitle").textContent=active?.description||"Arquivos de todos os parceiros permitidos.";
  }
  function renderFiles(){
    const files=visibleFiles();
    $("fileGrid").hidden=!files.length;
    $("libraryEmpty").hidden=Boolean(files.length);
    $("fileGrid").innerHTML=files.map(file=>{
      const folder=state.data.folders.find(f=>f.id===file.folderId);
      const partner=state.data.partners.find(p=>p.id===file.partnerId);
      return `<article class="file-card"><span class="file-icon"><i class="fa-solid ${fileIcon(file)}"></i></span><h3 title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</h3><p>${escapeHTML(file.note||"Arquivo da parceria")}</p><div class="file-meta"><span>${escapeHTML(partner?.name||"Parceiro")}</span><span>${escapeHTML(folder?.name||"Pasta")}</span><span>${escapeHTML(file.city)}</span></div><footer><small>${formatBytes(file.size)} · ${formatDate(file.createdAt)}</small><div class="file-actions"><button data-file-action="open" data-file-id="${file.id}" title="Abrir"><i class="fa-solid fa-eye"></i></button><button data-file-action="download" data-file-id="${file.id}" title="Baixar"><i class="fa-solid fa-download"></i></button><button class="delete" data-file-action="delete" data-file-id="${file.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button></div></footer></article>`;
    }).join("");
  }
  function renderMetrics(){
    const partners=filteredPartners();const folders=visibleFolders();const files=visibleFiles();
    $("partnerCount").textContent=partners.length;$("folderCount").textContent=folders.length;$("fileCount").textContent=files.length;
    const latest=files[0]?.createdAt||state.data.updatedAt;$("lastUpdate").textContent=latest?formatDate(latest):"—";
  }

  function openFolderModal(){
    $("folderForm").reset();$("folderCity").value=state.city==="Todas as cidades"?"Cerquilho":state.city;renderFolderPartnerOptions();openModal("folderModal");
  }
  function renderFolderPartnerOptions(){const city=$("folderCity").value;const list=state.data.partners.filter(p=>p.city===city);$("folderPartner").innerHTML=list.length?list.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join(""):`<option value="">Cadastre um parceiro primeiro</option>`;}
  function openUploadModal(){
    $("uploadForm").reset();$("uploadCity").value=state.city==="Todas as cidades"?"Cerquilho":state.city;renderUploadPartnerOptions();renderUploadFolderOptions();openModal("uploadModal");
  }
  function renderUploadPartnerOptions(){const city=$("uploadCity").value;const list=state.data.partners.filter(p=>p.city===city);$("uploadPartner").innerHTML=list.length?list.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join(""):`<option value="">Cadastre um parceiro primeiro</option>`;}
  function renderUploadFolderOptions(){const city=$("uploadCity").value;const partner=$("uploadPartner").value;const list=state.data.folders.filter(f=>f.city===city&&f.partnerId===partner);$("uploadFolder").innerHTML=list.length?list.map(f=>`<option value="${f.id}">${escapeHTML(f.name)}</option>`).join(""):`<option value="">Crie uma pasta primeiro</option>`;}

  function savePartner(event){event.preventDefault();const name=$("partnerName").value.trim();if(!name)return;const item={id:id("partner"),name,city:$("partnerFormCity").value,contact:$("partnerContact").value.trim(),note:$("partnerNote").value.trim(),createdAt:new Date().toISOString()};state.data.partners.push(item);saveMeta();closeModals();render();toast("Parceiro cadastrado.");}
  function saveFolder(event){event.preventDefault();if(!$("folderPartner").value){toast("Cadastre um parceiro antes de criar a pasta.");return;}const item={id:id("folder"),name:$("folderName").value.trim(),city:$("folderCity").value,partnerId:$("folderPartner").value,description:$("folderDescription").value.trim(),createdAt:new Date().toISOString()};state.data.folders.push(item);saveMeta();closeModals();render();toast("Pasta criada.");}
  async function saveFiles(event){
    event.preventDefault();const files=[...$("fileInput").files];const partnerId=$("uploadPartner").value;const folderId=$("uploadFolder").value;if(!files.length||!partnerId||!folderId){toast("Selecione parceiro, pasta e arquivos.");return;}
    for(const file of files){const meta={id:id("file"),name:file.name,size:file.size,mime:file.type,city:$("uploadCity").value,partnerId,folderId,category:$("uploadCategory").value,note:$("uploadNote").value.trim(),createdAt:new Date().toISOString()};await putBlob(meta.id,file);state.data.files.push(meta);}
    saveMeta();closeModals();render();toast(`${files.length} arquivo(s) adicionado(s).`);
  }

  function handleFolderClick(event){
    const deleteBtn=event.target.closest("[data-delete-folder]");if(deleteBtn){event.stopPropagation();deleteFolder(deleteBtn.dataset.deleteFolder);return;}
    const row=event.target.closest("[data-folder-id]");if(!row)return;state.folder=row.dataset.folderId;renderFolders();renderFiles();
  }
  async function deleteFolder(folderId){const folder=state.data.folders.find(f=>f.id===folderId);if(!folder)return;const files=state.data.files.filter(f=>f.folderId===folderId);if(!confirm(`Excluir a pasta “${folder.name}” e ${files.length} arquivo(s)?`))return;for(const file of files)await deleteBlob(file.id);state.data.files=state.data.files.filter(f=>f.folderId!==folderId);state.data.folders=state.data.folders.filter(f=>f.id!==folderId);if(state.folder===folderId)state.folder="";saveMeta();render();toast("Pasta excluída.");}
  async function handleFileAction(event){const btn=event.target.closest("[data-file-action]");if(!btn)return;const meta=state.data.files.find(f=>f.id===btn.dataset.fileId);if(!meta)return;if(btn.dataset.fileAction==="delete"){if(!confirm(`Excluir “${meta.name}”?`))return;await deleteBlob(meta.id);state.data.files=state.data.files.filter(f=>f.id!==meta.id);saveMeta();render();toast("Arquivo excluído.");return;}const blob=await getBlob(meta.id);if(!blob){toast("O arquivo não foi encontrado neste navegador.");return;}const url=URL.createObjectURL(blob);if(btn.dataset.fileAction==="open")window.open(url,"_blank","noopener");else{const a=document.createElement("a");a.href=url;a.download=meta.name;document.body.appendChild(a);a.click();a.remove();}setTimeout(()=>URL.revokeObjectURL(url),30000);}

  function openModal(id){$(id).hidden=false;document.body.style.overflow="hidden";}
  function closeModals(){qsa(".partner-modal").forEach(m=>m.hidden=true);document.body.style.overflow="";}
  function initSidebarState(){
    const mobile=matchMedia("(max-width:980px)").matches;
    if(mobile){document.body.classList.remove("sidebar-hidden");$("menuButton")?.setAttribute("aria-expanded","false");return;}
    const hidden=localStorage.getItem("lag-sidebar-hidden")==="true";
    document.body.classList.toggle("sidebar-hidden",hidden);
    $("menuButton")?.setAttribute("aria-expanded",String(!hidden));
  }
  function toggleSidebar(){
    const mobile=matchMedia("(max-width:980px)").matches;
    if(mobile){const open=!$("sidebar").classList.contains("open");$("sidebar").classList.toggle("open",open);$("mobileOverlay").classList.toggle("show",open);$("menuButton")?.setAttribute("aria-expanded",String(open));return;}
    const hidden=document.body.classList.toggle("sidebar-hidden");
    localStorage.setItem("lag-sidebar-hidden",String(hidden));
    $("menuButton")?.setAttribute("aria-expanded",String(!hidden));
  }
  function closeMobileSidebar(){$("sidebar").classList.remove("open");$("mobileOverlay").classList.remove("show");$("menuButton")?.setAttribute("aria-expanded","false");}

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function putBlob(key,blob){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}
  async function getBlob(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>reject(req.error);});}
  async function deleteBlob(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}

  function fileKind(file){const mime=String(file.mime||"").toLowerCase();const name=String(file.name||"").toLowerCase();if(mime.includes("pdf")||name.endsWith(".pdf"))return"pdf";if(mime.includes("spreadsheet")||mime.includes("excel")||/\.(xlsx?|csv)$/.test(name))return"spreadsheet";if(mime.startsWith("image/")||/\.(png|jpe?g|webp|gif)$/.test(name))return"image";if(mime.includes("word")||mime.includes("document")||/\.(docx?|txt|rtf)$/.test(name))return"document";return"other";}
  function fileIcon(file){return({pdf:"fa-file-pdf",spreadsheet:"fa-file-excel",image:"fa-file-image",document:"fa-file-word",other:"fa-file"})[fileKind(file)];}
  function id(prefix){return`${prefix}-${crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}`;}
  function normalize(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
  function escapeHTML(value){return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function formatBytes(bytes){const n=Number(bytes||0);if(!n)return"0 KB";const units=["B","KB","MB","GB"];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),units.length-1);return`${(n/1024**i).toFixed(i?1:0)} ${units[i]}`;}
  function formatDate(value){if(!value)return"—";return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(value));}
  function toast(message){const item=document.createElement("div");item.className="partner-toast-item";item.textContent=message;$("partnerToast").appendChild(item);setTimeout(()=>item.remove(),2800);}
})();


// partnerSidebarCloseFix
document.addEventListener("DOMContentLoaded",()=>{const menu=document.getElementById("menuButton");const sidebar=document.getElementById("sidebar");const overlay=document.getElementById("mobileOverlay");function close(){sidebar?.classList.remove("open");overlay?.classList.remove("show");}document.querySelectorAll(".sidebar .nav-item, .sidebar .brand").forEach(link=>link.addEventListener("click",()=>{if(matchMedia("(max-width:980px)").matches)close();}));menu?.addEventListener("click",()=>{if(!matchMedia("(max-width:980px)").matches)return;setTimeout(()=>{const open=sidebar?.classList.contains("open");overlay?.classList.toggle("show",!!open);},20);});overlay?.addEventListener("click",close);});
