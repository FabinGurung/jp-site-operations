"use strict";
/* Public read-only projection: never merge raw provider messages into this page. */
if (location.hash === "#progress")
  location.replace("./progress.html" + location.search);
if (location.hash === "#sources")
  location.replace("./sources.html" + location.search);
const byId = id => document.getElementById(id);
const siteSlug = name => String(name || "site").toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const siteQuery = pid => encodeURIComponent(siteSlug(dataset?.projects.find(p => p.id === pid)?.name));
const make = (tag, content = "", className = "") => {
  const e = document.createElement(tag);
  e.textContent = content;
  if (className) e.className = className;
  return e;
};
const withChildren = (parent, ...children) => {
  parent.append(...children);
  return parent;
};
const safeList = (target, elements, empty) => {
  byId(target).replaceChildren(...(elements.length ? elements : [make("p", empty, "help")]));
};
let dataset = null;
let map = null;
let markerLayer = null;
let mapMode = "activities";
let statusFilter = "all";
let noticeCategory = "Work";
let viewMode = "map";
let resourceTab = "materials";
const mobileField = () => matchMedia("(max-width:900px)").matches;
const fieldCategories = ["Work","Materials"];
const fieldNotice = n => fieldCategories.includes(n.category);
const preferredCategory = pid => dataset?.notices.some(n=> (!pid||n.project_id===pid)&&n.category==="Work") ? "Work" : dataset?.notices.some(n=>(!pid||n.project_id===pid)&&n.category==="Materials") ? "Materials" : "Work";
let activeSiteId = "";
let showAllNotices = false;
let lastMapSignature = "";
// Exact public Sheets Status values. No completion inference from work reports.
const statusKeys = ["Construction", "Completed", "Approval", "Maintenance"];
const publishedStatus = p => statusKeys.includes(p.status) ? p.status : "unpublished";
const statusLabel = key => ({
  all:"Current sites", Construction:"Under construction",
  Completed:"Completed", Approval:"Approval", Maintenance:"Maintenance",
  unpublished:"Not stated / other"
})[key] || "Not stated / other";
const matchesStatus = p => statusFilter === "all" ? (publishedStatus(p)!=="Completed" || p.id===selectedProject()) : publishedStatus(p)===statusFilter;
function syncStatusControls() {
  byId("status-filter").value = statusFilter;
  for (const b of document.querySelectorAll("[data-project-status]"))
    b.setAttribute("aria-pressed", b.dataset.projectStatus === statusFilter ? "true" : "false");
}
function setStatusFilter(value) {
  statusFilter = value;
  // Avoid contradictory site + status selections and a misleading empty map.
  activeSiteId = "";
  showAllNotices = false;
  byId("project-filter").value = "";
  byId("notice-site").value = "";
  syncStatusControls();
  render();
}

const modeNotes = {
  projects: "Location and source-record status. An approved map pin does not certify completed work.",
  work: "Numbers count published work-report entries only. No approved complete remaining-task backlog is connected.",
  resources: "Material and equipment shortage requests are NOT YET CONNECTED. “?” is unknown, never zero.",
  manpower: "Approved site crew-demand figures are NOT YET CONNECTED. Individual worker records are not published.",
  activities: "Numbers count reviewed instructions, not confirmed outstanding tasks. Open/closed status is not in this view."
};
const projectRecords = pid => ({
  work: dataset.progress.filter(r => r.project_id === pid),
  notices: dataset.notices.filter(r => r.project_id === pid),
});
const mapReading = p => {
  const r = projectRecords(p.id);
  if (mapMode === "work") return {badge: r.work.length ? String(r.work.length) : "–",
    note: r.work.length + " work reports", kind: "report"};
  if (mapMode === "activities") {const count=r.notices.filter(fieldNotice).length;return {badge:count?String(count):"",note:count?count+" notifications":"No notifications",kind:count?"review notice-highlight":"location notice-quiet"};}
  if (mapMode === "resources") return {badge:"?", note:"Material/equipment demand not connected", kind:"unknown"};
  if (mapMode === "manpower") return {badge:"?", note:"Crew-demand source not connected", kind:"unknown"};
  return {badge:"•", note:p.status || "", kind:"location"};
};
const hasPin = p => Number.isFinite(p.lat) && Number.isFinite(p.lng);
// Colours describe the public executing organization, independently of map layer.
// Company identity/labels still come only from the approved Sheets projection.
const companyColour = p => {
  if (!p.company_id || !p.company) return "#667775";
  const known = {"ORG-000001":"#246b9a", "ORG-000002":"#a94b10"};
  if (known[p.company_id]) return known[p.company_id];
  let hash = 0;
  for (const c of p.company_id) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return "hsl(" + Math.round(((hash % 360) * 137.508) % 360) + " 62% 32%)";
};
function renderCompanyLegend(projects) {
  const groups = new Map();
  for (const p of projects.filter(hasPin)) {
    const key = p.company_id && p.company ? p.company_id : "";
    if (!groups.has(key)) groups.set(key, {project:p, count:0});
    groups.get(key).count++;
  }
  const items = [...groups.values()]
    .sort((a, b) => (a.project.company || "").localeCompare(b.project.company || ""))
    .map(({project:p, count}) => {
      const item = make("li", "", "company-legend-item");
      const swatch = make("span", "", "company-swatch");
      swatch.style.backgroundColor = companyColour(p);
      swatch.setAttribute("aria-hidden", "true");
      return withChildren(item, swatch, make("span", (p.company || "Organization not public") +
        " · " + count + (count === 1 ? " mapped site" : " mapped sites")));
    });
  byId("company-legend").replaceChildren(...items);
}
const readable = value => String(value || "").replaceAll("_", " ").trim();
const projectName = id => (dataset.projects.find(p => p.id === id) || {}).name || "Selected site";
const selectedProject = () => activeSiteId || byId("project-filter").value;
const selectedCompany = () => byId("company-filter").value;
const filteredProjects = () => dataset.projects.filter(p =>
  (!byId("project-filter").value || p.id === byId("project-filter").value) &&
  (!selectedCompany() || p.company_id === selectedCompany()) && matchesStatus(p));
const filterByProject = r => filteredProjects().some(p => p.id === r.project_id);
const filteredProgress = () => dataset.progress.filter(filterByProject);
const filteredNotices = () => dataset.notices.filter(r =>
  filterByProject(r) && (!activeSiteId || r.project_id === activeSiteId));

function chooseProject(id, focusMap = false, fromMap = false) {
  activeSiteId = id;
  showAllNotices = false;
  if (!fromMap) statusFilter = "all";
  // Marker interaction retains all pins and the map camera.
  if (!fromMap) byId("project-filter").value = id;
  byId("notice-site").value = id;
  noticeCategory = mobileField() ? preferredCategory(id) : "all";
  syncStatusControls();
  render();
  const p = dataset.projects.find(project => project.id === id);
  if (focusMap && p && hasPin(p) && map)
    map.setView([p.lat, p.lng], Math.max(map.getZoom(), 14));
  byId("notifications").scrollIntoView({behavior:"smooth",block:"start"});
}

function clearSiteSelection(goToMap = true, allSites = false) {
  activeSiteId = "";
  showAllNotices = false;
  noticeCategory = mobileField() ? preferredCategory("") : "all";
  byId("project-filter").value = "";
  byId("notice-site").value = "";
  if (allSites) {
    statusFilter = "all";
    byId("company-filter").value = "";
  }
  syncStatusControls();
  render();
  if (goToMap) byId("map").scrollIntoView({behavior:"smooth",block:"start"});
}

function drawMap(projects) {
  renderCompanyLegend(projects);
  if(viewMode==="resources") return;
  if (!window.L) {
    byId("map-fallback").hidden = false;
    return;
  }
  if (!map) {
    map = L.map("map-canvas", {scrollWheelZoom: false}).setView([28.21, 83.99], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    markerLayer = L.featureGroup().addTo(map);
    map.on("click", () => {
      if (activeSiteId || showAllNotices) clearSiteSelection(false);
    });
  }
  const signature = mapMode + ":" + projects.map(p => p.id).join(",");
  markerLayer.clearLayers();
  for (const p of projects.filter(hasPin)) {
    const info = mapReading(p);
    const badge = make("span", info.badge, "site-map-badge " + info.kind);
    badge.style.setProperty("--company-colour", companyColour(p));
    const company = p.company || "Organization not public";
    const marker = L.marker([p.lat, p.lng], {
      zIndexOffset: info.kind.includes("notice-highlight") ? 500 : 0,
      title: p.name + " — " + company + " — " + info.note,
      alt: p.name + " — " + company + " — " + info.note,
      icon: L.divIcon({html: badge.outerHTML, className: "site-map-pin", iconSize: [44, 44], iconAnchor:[22, 22]})
    });
    const popup = make("div", "", "site-map-popup");
    withChildren(popup, make("strong", p.name), make("p", company), make("p", info.note));
    const entries = projectRecords(p.id);

    const select = make("button", "Notifications", "quiet");
    select.type = "button";
    select.addEventListener("click", () => chooseProject(p.id));
    popup.append(select);
    marker.bindPopup(popup);
    marker.on("click", () => {
      // Keep the map usable while making the related notices immediately available.
      chooseProject(p.id, false, true);
    });
    marker.addTo(markerLayer);
  }
  if (markerLayer.getLayers().length && signature !== lastMapSignature)
    map.fitBounds(markerLayer.getBounds(), {padding:[35,35],maxZoom:15});
  lastMapSignature = signature;
  map.invalidateSize();
}

function materialDetails(n){
  const details=make("details","","resource-row-details");
  details.append(make("summary","Details"));
  details.append(make("p","Date: "+(n.date||"Date not published")));
  if(n.due_date) details.append(make("p","Due: "+n.due_date));
  
  const link=make("a",n.source_doc_url?"Original note":"Site records");
  link.href=n.source_doc_url||("./extraction.html?site="+siteQuery(n.project_id));details.append(link);
  return details;
}
function renderResourceDesk(projects) {
  const selector=byId("resource-site");
  const prior=selector.value;
  selector.replaceChildren(new Option("All sites",""),...projects.map(p=>new Option(p.name,p.id)));
  if(projects.some(p=>p.id===prior)) selector.value=prior;
  const selected=selector.value;
  const chosen=projects.filter(p=>!selected||p.id===selected);
  for(const b of document.querySelectorAll("[data-resource-tab]")) b.setAttribute("aria-pressed",String(b.dataset.resourceTab===resourceTab));
  const root=byId("resource-rows");
  if(resourceTab!=="materials"){
    root.replaceChildren(make("p",resourceTab==="stock"?"Stock not recorded":"Labour not recorded","resource-empty"));
    return;
  }
  const ids=new Set(chosen.map(p=>p.id));
  const rows=dataset.notices.filter(n=>n.category==="Materials"&&ids.has(n.project_id));
  if(!rows.length){root.replaceChildren(make("p","No material entries","resource-empty"));return;}
  const table=make("table","","resource-table");
  const head=make("thead");const h=make("tr");
  for(const label of ["Site","Material","Quantity","Details"]){const th=make("th",label);th.scope="col";h.append(th);}
  head.append(h);table.append(head);
  const body=make("tbody");
  for(const n of rows){
    const tr=make("tr");
    const site=make("td",projectName(n.project_id),"resource-site-cell");
    const instruction=make("td",n.instruction,"resource-instruction");
    const qty=make("td",[n.quantity,n.unit].filter(x=>x!==null&&x!==undefined&&String(x).trim()!=="").join(" · ")||"Not recorded","resource-quantity");
    const detail=make("td");detail.append(materialDetails(n));
    tr.append(site,instruction,qty,detail);body.append(tr);
  }
  table.append(body);root.replaceChildren(table);
}
function setView(mode){
  viewMode=mode;
  byId("map-title").textContent=mode==="resources"?"Materials & Labour":"Project map";
  byId("geo-view").setAttribute("aria-pressed",String(mode==="map"));
  byId("resource-view").setAttribute("aria-pressed",String(mode==="resources"));
  byId("map-canvas").hidden=mode==="resources";
  byId("resource-desk").hidden=mode!=="resources";
  byId("map-fallback").hidden=true;
  document.body.classList.toggle("resource-mode",mode==="resources");
  if(mode==="resources"){activeSiteId="";showAllNotices=false;resourceTab="materials";}
  render();
}
function updateProjectIndex(projects) {
  byId("project-count").textContent = String(projects.length);
  const nodes = projects.map(p => {
    const button = make("button", "", "project-entry");
    button.type = "button";
    button.setAttribute("aria-pressed", selectedProject() === p.id ? "true" : "false");
    if (selectedProject() === p.id) button.classList.add("active");
    withChildren(button, make("strong", p.name),
      make("span", projectRecords(p.id).notices.filter(fieldNotice).length ? projectRecords(p.id).notices.filter(fieldNotice).length+" notifications" : ""));
    button.addEventListener("click", () => chooseProject(p.id, true));
    return button;
  });
  safeList("project-list", nodes, "No sites");
}

function noticeCard(n) {
  const wrapper = make("article", "", "card notice-item");
  const head = make("div", "", "notice-item-head");
  head.append(make("span", readable(n.category || "Other"), "notice-type " + String(n.category || "").toLowerCase()));
  if(!selectedProject())head.append(make("span",projectName(n.project_id),"card-meta"));
  const title = make("h3", n.instruction || "");
  if(n.category==="Materials"&&(n.quantity||n.unit))wrapper.append(head,title,make("p",[n.quantity,n.unit].filter(Boolean).join(" · "),"resource-quantity"),materialDetails(n));
  else wrapper.append(head,title,materialDetails(n));
  return wrapper;
}

function renderNotifications() {
  const eligible = filteredNotices();
  if(mobileField() && !fieldCategories.includes(noticeCategory)) noticeCategory=preferredCategory(selectedProject());
  const counts = {all:eligible.length, Work:0, Materials:0, Supervision:0};
  for (const n of eligible) if (Object.hasOwn(counts, n.category)) counts[n.category] += 1;
  for (const badge of document.querySelectorAll("[data-notice-count]"))
    badge.textContent = String(counts[badge.dataset.noticeCount] ?? 0);
  for (const button of document.querySelectorAll("[data-notice-category]"))
    button.setAttribute("aria-pressed", button.dataset.noticeCategory === noticeCategory ? "true" : "false");
  const items = eligible.filter(n => noticeCategory === "all" || n.category === noticeCategory);
  byId("notice-total").textContent = String(items.length);
  const site = dataset.projects.find(p => p.id === selectedProject());
  byId("notice-focus-title").textContent = site ? site.name : "All sites";
  byId("notice-site").value = selectedProject();
  const details = byId("notifications");
  details.hidden = viewMode==="resources" || (!activeSiteId && !showAllNotices);
  byId("clear-map-selection").hidden = !activeSiteId;
  safeList("notice-list", items.map(noticeCard),
    "No notifications");
}

function render() {
  if (!dataset) return;
  const projects = filteredProjects();
  const progress = filteredProgress();
  const notices = filteredNotices();
  const eligible = dataset.projects.filter(p => !selectedCompany() || p.company_id === selectedCompany());
  const tally = {"all":eligible.filter(p=>publishedStatus(p)!=="Completed").length,"Construction":0,"Completed":0,"Approval":0,"Maintenance":0,"unpublished":0};
  for (const p of eligible) tally[publishedStatus(p)] += 1;
  for (const e of document.querySelectorAll("[data-status-count]"))
    e.textContent = String(tally[e.dataset.statusCount] ?? 0);
  for (const option of byId("status-filter").options) {
    if (option.value === "all") option.textContent = "Current sites (" + tally.all + ")";
    else option.textContent = statusLabel(option.value) + " (" + (tally[option.value] || 0) + ")";
  }
  byId("status-filter-summary").textContent=statusLabel(statusFilter)+" · "+projects.length+" sites";

  updateProjectIndex(projects);
  drawMap(projects);
  if(viewMode==="resources") renderResourceDesk(projects);
  renderNotifications();
  const active = dataset.notices.filter(n=>fieldNotice(n)&&filterByProject(n));
  byId("attention-count").textContent = new Set(active.map(n => n.project_id)).size + " sites · " + active.length + " notifications";
  byId("attention-count").setAttribute("data-notice-sites", String(new Set(active.map(n => n.project_id)).size));
}

function load(payload) {
  if (!payload || !Array.isArray(payload.projects) || !Array.isArray(payload.progress) ||
      !Array.isArray(payload.notices)) throw Error("Invalid Operations projection");
  dataset = payload;
  noticeCategory=mobileField()?preferredCategory(""):"all";
  const companyLabels = new Map();
  for (const p of dataset.projects) if (p.company_id && p.company) companyLabels.set(p.company_id, p.company);
  for (const [id, name] of [...companyLabels].sort((a, b) => a[1].localeCompare(b[1])))
    byId("company-filter").append(new Option(name, id));
  for (const p of dataset.projects) {
    byId("project-filter").append(new Option(p.name, p.id));
    byId("notice-site").append(new Option(p.name, p.id));
  }
  const params = new URLSearchParams(location.search);
  const requested = params.get("site") || params.get("project");
  const p = dataset.projects.find(item => item.id === requested || item.site === requested ||
                                         siteSlug(item.name) === requested);
  if (p) {
    byId("project-filter").value = p.id;
    byId("notice-site").value = p.id;
  }
  byId("receipt").textContent = payload.refreshed_at_npt || "Read time not supplied";
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)byId("scout-motion").textContent="Play Scout";
  activeSiteId = p?.id || "";
  if(mobileField()) noticeCategory=preferredCategory(activeSiteId);
  showAllNotices = location.hash === "#notifications" && !activeSiteId;
  render();
}
for (const control of document.querySelectorAll("[data-map-mode]")) {
  control.addEventListener("click", () => {
    mapMode = control.dataset.mapMode;
    for (const button of document.querySelectorAll("[data-map-mode]"))
      button.setAttribute("aria-pressed", button === control ? "true" : "false");
    render();
  });
}
for (const button of document.querySelectorAll("[data-project-status]"))
  button.addEventListener("click", () => setStatusFilter(button.dataset.projectStatus));
byId("status-filter").addEventListener("change", () => setStatusFilter(byId("status-filter").value));
byId("project-filter").addEventListener("change", () => {
  statusFilter = "all";
  activeSiteId = byId("project-filter").value;
  noticeCategory=mobileField()?preferredCategory(activeSiteId):"all";
  showAllNotices = false;
  syncStatusControls();
  byId("notice-site").value = activeSiteId;
  render();
});
byId("notice-site").addEventListener("change", () => {
  activeSiteId = byId("notice-site").value;
  noticeCategory=mobileField()?preferredCategory(activeSiteId):"all";
  statusFilter = "all";
  showAllNotices = !activeSiteId;
  byId("project-filter").value = activeSiteId;
  syncStatusControls();
  render();
});
for (const button of document.querySelectorAll("[data-notice-category]"))
  button.addEventListener("click", () => {
    noticeCategory = button.dataset.noticeCategory;
    render();
  });
byId("company-filter").addEventListener("change", () => {
  activeSiteId = "";
  showAllNotices = false;
  render();
});
byId("back-to-sites").addEventListener("click", () => clearSiteSelection(true,true));
byId("clear-map-selection").addEventListener("click", () => clearSiteSelection(false,true));
byId("geo-view").addEventListener("click",()=>setView("map"));
for(const link of document.querySelectorAll('a[href="./#map"]'))link.addEventListener("click",()=>{if(viewMode!=="map")setView("map");});
byId("resource-view").addEventListener("click",()=>setView("resources"));
for(const b of document.querySelectorAll("[data-resource-tab]"))b.addEventListener("click",()=>{resourceTab=b.dataset.resourceTab;renderResourceDesk(filteredProjects());});
byId("resource-site").addEventListener("change",()=>renderResourceDesk(filteredProjects()));
byId("field-filter-toggle").addEventListener("click",()=>{
  const open=document.body.classList.toggle("field-filters-open");
  byId("field-filter-toggle").setAttribute("aria-expanded",String(open));
});
byId("scout-motion").addEventListener("click", () => {
  const scout=byId("site-scout");
  if(matchMedia("(prefers-reduced-motion:reduce)").matches&&!scout.classList.contains("scout-force-motion")){scout.classList.add("scout-force-motion");scout.classList.remove("scout-paused");byId("scout-motion").textContent="Pause Scout";byId("scout-motion").setAttribute("aria-pressed","false");return;}
  const paused = scout.classList.toggle("scout-paused");
  byId("scout-motion").setAttribute("aria-pressed", String(paused));
  byId("scout-motion").textContent = paused ? "Resume Scout" : "Pause Scout";
});
byId("directory-toggle").addEventListener("click", () => {
  const open = byId("navigation-panel").classList.toggle("directory-open");
  byId("directory-toggle").setAttribute("aria-expanded",String(open));
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && (activeSiteId || showAllNotices)) clearSiteSelection();
});
for (const link of document.querySelectorAll('a[href="./#notifications"]'))
  link.addEventListener("click", () => {
    if(viewMode==="resources")setView("map");
    showAllNotices = !activeSiteId;
    render();
    const menu = link.closest(".phone-menu");
    if (menu) menu.removeAttribute("open");
    requestAnimationFrame(() => byId("notifications").scrollIntoView({block:"start"}));
  });

byId("reset-filters").addEventListener("click", () => {
  byId("project-filter").value = "";
  byId("company-filter").value = "";
  byId("notice-site").value = "";
  activeSiteId = "";
  showAllNotices = false;
  noticeCategory = mobileField()?preferredCategory(""):"all";
  statusFilter = "all";
  syncStatusControls();
  render();
});
fetch("./operations.json", {cache: "no-cache"})
  .then(response => {if (!response.ok) throw Error("Published projection unavailable");return response.json();})
  .then(load)
  .catch(() => {
    byId("receipt").textContent = "Snapshot unavailable";
    byId("project-list").textContent = "Unavailable";
    byId("notice-list").textContent = "Unavailable";
    byId("map-fallback").hidden = false;
  });
