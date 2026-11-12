/* Global Heights — RWA Care
   Front-end preview. Data is stored in this browser only.
   Connect Supabase + server-side policies before real society-wide use. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const seedComplaints = [
  { id: "GH-1024", title: "Water leakage near Block A parking", category: "Water", description: "Water leakage has been noticed near the Block A parking area.", status: "Pending", date: "20 Oct 2026" },
  { id: "GH-1018", title: "Street light not working", category: "Electricity", description: "The street light near the main gate needs attention.", status: "Resolved", date: "17 Oct 2026" }
];
const seedNotices = [
  { title: "Monthly maintenance reminder", body: "November maintenance dues are available in the resident portal. Please check your bill and contact the RWA office if you have a query.", date: "05 Nov 2026", tag: "FINANCE" },
  { title: "Community cleanliness drive", body: "Residents are invited to participate in the community cleanliness initiative. Details and timings will be shared by management.", date: "02 Nov 2026", tag: "COMMUNITY" },
  { title: "Visitor entry advisory", body: "Please cooperate with the security team and ensure that your visitors follow the society entry process.", date: "29 Oct 2026", tag: "SECURITY" }
];
const readStore = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
let complaints = [];
let notices = [];
let currentRole = "resident";
let toastTimer;

async function saveData() { /* Shared data is persisted directly through Supabase actions below. */ }
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
}
function showPage(pageName) {
  const target = document.getElementById(pageName);
  if (!target) return;
  $$(".page").forEach(page => page.classList.toggle("active", page === target));
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === pageName));
  $("#pageCrumb").textContent = target.querySelector("h1")?.textContent || "Overview";
  $("#sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector("input,textarea")?.focus();
}
function closeModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}
function statusClass(status) {
  return status === "Resolved" ? "success" : status === "In progress" ? "info" : "warning";
}
function renderComplaints() {
  const list = $("#complaintList");
  const query = ($("#complaintSearch")?.value || "").toLowerCase();
  const filter = $("#complaintFilter")?.value || "all";
  const filtered = complaints.filter(item => {
    const matchesText = `${item.title} ${item.description} ${item.category} ${item.id}`.toLowerCase().includes(query);
    return matchesText && (filter === "all" || item.status === filter);
  });
  list.innerHTML = "";
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">No complaints match your search.</div>';
  } else {
    filtered.forEach(item => {
      const row = document.createElement("article");
      row.className = "complaint-row";
      const symbol = document.createElement("div");
      symbol.className = "complaint-symbol";
      symbol.textContent = item.category === "Water" ? "♒" : item.category === "Electricity" ? "ϟ" : "▧";
      const main = document.createElement("div");
      main.className = "complaint-main";
      const title = document.createElement("h3"); title.textContent = item.title;
      const desc = document.createElement("p"); desc.textContent = item.description;
      const meta = document.createElement("small"); meta.textContent = `${item.id} · ${item.category} · Submitted ${item.date}`;
      main.append(title, desc, meta);
      const status = document.createElement("span");
      status.className = `status-pill ${statusClass(item.status)}`;
      status.textContent = item.status;
      row.append(symbol, main, status);
      if (currentRole === "admin" && item.status !== "Resolved") {
        const action = document.createElement("button");
        action.className = "text-action";
        action.textContent = item.status === "Pending" ? "Start" : "Resolve";
        action.addEventListener("click", () => {
          const nextStatus = item.status === "Pending" ? "In progress" : "Resolved";
          window.rwaSupabase.from("complaints").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("ticket_no", item.id)
            .then(async ({ error }) => { if (error) toast(error.message); else { await loadSharedData(); toast(`Complaint ${item.id} updated.`); } });
        });
        row.append(action);
      }
      list.append(row);
    });
  }
  const total = complaints.length;
  const pending = complaints.filter(c => c.status !== "Resolved").length;
  $("#totalComplaints").textContent = total;
  $("#pendingComplaints").textContent = complaints.filter(c => c.status === "Pending").length;
  $("#resolvedComplaints").textContent = complaints.filter(c => c.status === "Resolved").length;
  $("#navComplaintCount").textContent = pending;
  $("#openStat").textContent = pending;
}
function renderNotices() {
  const dashboard = $("#dashboardAnnouncements");
  const full = $("#announcementList");
  dashboard.innerHTML = "";
  full.innerHTML = "";
  notices.slice(0, 3).forEach((notice, index) => {
    const item = document.createElement("article"); item.className = "announcement-item";
    const date = document.createElement("div"); date.className = "date-tile";
    const parsed = new Date(notice.date);
    date.innerHTML = `<b>${Number.isNaN(parsed.getTime()) ? "—" : parsed.getDate()}</b>${Number.isNaN(parsed.getTime()) ? "UPDATE" : parsed.toLocaleString("en", { month: "short" }).toUpperCase()}`;
    const content = document.createElement("div");
    const h = document.createElement("h3"); h.textContent = notice.title;
    const p = document.createElement("p"); p.textContent = notice.body;
    content.append(h, p); item.append(date, content); dashboard.append(item);
  });
  notices.forEach(notice => {
    const card = document.createElement("article"); card.className = "notice-card";
    const icon = document.createElement("div"); icon.className = "notice-icon"; icon.textContent = "▤";
    const content = document.createElement("div");
    const h = document.createElement("h3"); h.textContent = notice.title;
    const p = document.createElement("p"); p.textContent = notice.body;
    const meta = document.createElement("small"); meta.textContent = `${notice.tag || "NOTICE"} · ${notice.date}`;
    content.append(h, p, meta); card.append(icon, content); full.append(card);
  });
}
function renderAll() { renderComplaints(); renderNotices(); }
async function loadSharedData() {
  const db = window.rwaSupabase, user = window.rwaCurrentUser;
  if (!db || !user) { complaints = []; notices = []; renderAll(); return; }
  const [{ data: cRows, error: cError }, { data: nRows, error: nError }] = await Promise.all([
    db.from("complaints").select("ticket_no,title,category,description,status,created_at").order("created_at", { ascending: false }),
    db.from("notices").select("id,title,body,tag,created_at").order("created_at", { ascending: false })
  ]);
  if (cError) console.error(cError); if (nError) console.error(nError);
  complaints = (cRows || []).map(c => ({ id: c.ticket_no, title: c.title, category: c.category, description: c.description, status: c.status, date: new Date(c.created_at).toLocaleDateString("en-IN") }));
  notices = (nRows || []).map(n => ({ id: n.id, title: n.title, body: n.body, tag: n.tag, date: new Date(n.created_at).toLocaleDateString("en-IN") }));
  renderAll();
}
let rwaRealtimeChannel = null;
async function refreshAuthState() {
  const db = window.rwaSupabase; if (!db) return;
  if (rwaRealtimeChannel) { await db.removeChannel(rwaRealtimeChannel); rwaRealtimeChannel = null; }
  const { data: { session } } = await db.auth.getSession(); window.rwaCurrentUser = session?.user || null;
  const signedIn = !!window.rwaCurrentUser; $("#authBtn").hidden = signedIn; $("#logoutBtn").hidden = !signedIn;
  if (signedIn) {
    const { data: profile } = await db.from("profiles").select("full_name,flat_number,block,role,is_verified").eq("id", window.rwaCurrentUser.id).maybeSingle();
    window.rwaProfile = profile || null; currentRole = profile?.role === "admin" ? "admin" : "resident";
    document.body.classList.toggle("is-admin", currentRole === "admin");
    $("#roleLabel").textContent = `${currentRole === "admin" ? "Admin" : "Resident"} · ${profile?.flat_number || "Flat pending verification"}`;
    $("#profileName").textContent = profile?.full_name || window.rwaCurrentUser.email || "Resident account";
    await loadSharedData();
    rwaRealtimeChannel = db.channel("global-heights-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, loadSharedData)
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, loadSharedData)
      .subscribe();
  } else { window.rwaProfile = null; currentRole = "resident"; document.body.classList.remove("is-admin"); $("#roleLabel").textContent = "Not signed in"; $("#profileName").textContent = "Guest account"; complaints = []; notices = []; renderAll(); }
}

function setRole(role) {
  currentRole = role;
  document.body.classList.toggle("is-admin", role === "admin");
  $("#roleLabel").textContent = role === "admin" ? "Admin preview" : "Resident · A-204";
  toast(role === "admin" ? "Admin preview enabled. This is not secure authentication." : "Resident preview enabled.");
  renderComplaints();
}

$$("[data-page]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
$$("[data-action='new-complaint']").forEach(button => button.addEventListener("click", () => openModal("complaintModal")));
$("#newComplaintBtn").addEventListener("click", () => openModal("complaintModal"));
$$("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
$$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(backdrop); }));
document.addEventListener("keydown", event => { if (event.key === "Escape") $$(".modal-backdrop.show").forEach(closeModal); });
$("#complaintForm").addEventListener("submit", async event => {
  event.preventDefault();
  const db = window.rwaSupabase, user = window.rwaCurrentUser;
  if (!db || !user) { toast("Please sign in after configuring the society database."); return; }
  const title = $("#complaintTitle").value.trim();
  const description = $("#complaintDescription").value.trim();
  if (!window.rwaProfile?.is_verified) { toast("Your account is awaiting RWA verification. Contact the society office."); return; }
  const { error } = await db.from("complaints").insert({ user_id: user.id, title, description, category: $("#complaintCategory").value, status: "Pending" });
  if (error) { toast(`Could not submit: ${error.message}`); return; }
  await loadSharedData(); event.target.reset(); closeModal($("#complaintModal")); toast("Complaint saved to the shared society database.");
});
$("#complaintSearch").addEventListener("input", renderComplaints);
$("#complaintFilter").addEventListener("change", renderComplaints);

$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#themeToggle").addEventListener("click", () => document.body.classList.toggle("dark-mode"));
$("#noticeBell").addEventListener("click", () => { showPage("announcements"); toast("Showing the latest community announcements."); });
$("#paymentInfoBtn").addEventListener("click", () => toast("Ask the RWA office for verified payment details. No payment has been made."));
$("#addNoticeBtn").addEventListener("click", () => openModal("noticeModal"));
$("#noticeForm").addEventListener("submit", async event => {
  event.preventDefault();
  const db = window.rwaSupabase, user = window.rwaCurrentUser;
  if (!db || !user || currentRole !== "admin") { toast("Only an authenticated RWA admin can publish notices."); return; }
  const { error } = await db.from("notices").insert({ title: $("#noticeTitle").value.trim(), body: $("#noticeBody").value.trim(), tag: "MANAGEMENT", created_by: user.id });
  if (error) { toast(`Could not publish: ${error.message}`); return; }
  await loadSharedData(); event.target.reset(); closeModal($("#noticeModal")); toast("Announcement published for residents.");
});
$("#residentSearch").addEventListener("input", event => {
  const q = event.target.value.toLowerCase();
  $$("#residentRows tr").forEach(row => row.hidden = !row.textContent.toLowerCase().includes(q));
});
let authMode = "signin";
$("#authBtn").addEventListener("click", () => openModal("authModal"));
$("#authModeBtn").addEventListener("click", () => {
  authMode = authMode === "signin" ? "signup" : "signin";
  $("#registerFields").hidden = authMode !== "signup";
  $("#authHeading").textContent = authMode === "signup" ? "Create resident account" : "Resident sign in";
  $("#authSubmit").textContent = authMode === "signup" ? "Create account" : "Sign in";
  $("#authModeBtn").textContent = authMode === "signup" ? "Already registered? Sign in" : "Create resident account";
});
$("#authForm").addEventListener("submit", async event => {
  event.preventDefault(); const db = window.rwaSupabase;
  if (!db) { toast("Add your Supabase URL and anon key in supabase-config.js first."); return; }
  const email = $("#authEmail").value.trim(), password = $("#authPassword").value; let result;
  if (authMode === "signup") result = await db.auth.signUp({ email, password, options: { data: { full_name: $("#authName").value.trim(), flat_number: $("#authFlat").value.trim(), block: $("#authBlock").value.trim() } } });
  else result = await db.auth.signInWithPassword({ email, password });
  if (result.error) { toast(result.error.message); return; }
  if (authMode === "signup" && !result.data.session) toast("Account created. Verify your email, then sign in."); else toast("Signed in successfully.");
  closeModal($("#authModal")); await refreshAuthState();
});
$("#logoutBtn").addEventListener("click", async () => { if (window.rwaSupabase) await window.rwaSupabase.auth.signOut(); await refreshAuthState(); toast("Signed out."); });
window.addEventListener("rwa-db-ready", refreshAuthState);
$("#todayDate").textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
renderAll();
