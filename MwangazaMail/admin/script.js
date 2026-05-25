const fallbackData = {
  incidents: [
    { incident_key: 1, incident_ref: "#2333", category: "Autre", institution: "243999000001", city: "Matadi", severity: "moyen", status: "nouveau", occurred_on: "2026-05-18" },
    { incident_key: 2, incident_ref: "#2891", category: "Corruption", institution: "Douanes - Matadi", city: "Matadi", severity: "eleve", status: "nouveau", occurred_on: "2026-05-21" },
    { incident_key: 3, incident_ref: "#2890", category: "Surfacturation", institution: "Mairie - Goma", city: "Goma", severity: "moyen", status: "en_cours", occurred_on: "2026-05-20" },
    { incident_key: 4, incident_ref: "#2889", category: "Abus d'autorite", institution: "Police - Kinshasa", city: "Kinshasa", severity: "critique", status: "resolu", occurred_on: "2026-05-19" },
    { incident_key: 5, incident_ref: "#2888", category: "Detournement", institution: "Mairie - Lubumbashi", city: "Lubumbashi", severity: "critique", status: "en_cours", occurred_on: "2026-05-17" }
  ],
  users: [
    { full_name: "Amina Kabeya", email: "amina.kabeya@mwangaza.cd", role: "admin", city: "Kinshasa" },
    { full_name: "Joel Mutombo", email: "joel.mutombo@mwangaza.cd", role: "agent", city: "Lubumbashi" },
    { full_name: "Sarah Lufuma", email: "sarah.lufuma@mwangaza.cd", role: "viewer", city: "Goma" },
    { full_name: "Patrick Nlandu", email: "patrick.nlandu@mwangaza.cd", role: "agent", city: "Bukavu" },
    { full_name: "Grace Mbuyi", email: "grace.mbuyi@mwangaza.cd", role: "viewer", city: "Kisangani" }
  ],
  subscriptions: [
    { institution: "DGI", plan: "Pilote", amount: 499, start_date: "2026-01-01", renewal_date: "2026-06-01", state: "Actif" },
    { institution: "Mairie de Goma", plan: "Standard", amount: 1500, start_date: "2025-12-12", renewal_date: "2026-06-12", state: "Actif" },
    { institution: "Police Nationale", plan: "Premium", amount: 7500, start_date: "2026-02-15", renewal_date: "2026-06-15", state: "Actif" }
  ],
  analytics: {
    monthly: [{ month: "Jan", incidents: 38 }, { month: "Fev", incidents: 46 }, { month: "Mar", incidents: 61 }, { month: "Avr", incidents: 72 }, { month: "Mai", incidents: 84 }],
    categories: [{ category: "Corruption", volume: 142 }, { category: "Surfacturation", volume: 89 }, { category: "Abus d'autorite", volume: 74 }, { category: "Detournement", volume: 53 }]
  },
  seo: [],
  audit: []
};

const featureModules = [
  ["Bot WhatsApp", "Reception et qualification automatique des signalements.", true],
  ["Moteur IA", "Scoring de credibilite et priorisation des dossiers.", true],
  ["Alertes SMS", "Notification instantanee des cas critiques.", true],
  ["Export PDF", "Generation de rapports institutionnels periodiques.", true],
  ["Connecteur ERP", "Connexion directe avec systemes tiers de l'institution.", false],
  ["Cartographie live", "Carte de chaleur geographique en temps reel.", true]
];

const tagClass = {
  Autre: "tag-gray",
  Corruption: "tag-red",
  Surfacturation: "tag-orange",
  "Abus d'autorite": "tag-violet",
  Detournement: "tag-cyan"
};

const severityClass = {
  faible: "sev-low",
  moyen: "sev-medium",
  eleve: "sev-high",
  critique: "sev-critical"
};

const statusClass = {
  nouveau: "status-new",
  en_cours: "status-progress",
  resolu: "status-resolved"
};

const sectionMeta = {
  dashboard: ["Dashboard Admin", "Vue d'ensemble de la plateforme", "/admin/dashboard"],
  utilisateurs: ["Utilisateurs", "Gestion des comptes et des roles", "/admin/utilisateurs"],
  abonnements: ["Abonnements", "Suivi des plans et renouvellements", "/admin/abonnements"],
  analytics: ["Analytics", "Analyse des performances et tendances", "/admin/analytics"],
  fonctionnalites: ["Fonctionnalites", "Activation des modules metier", "/admin/fonctionnalites"],
  seo: ["SEO & Audit", "Trafic, acces, geolocalisation et historique des revisions", "/admin/seo"]
};

const severityOptions = ["faible", "moyen", "eleve", "critique"];
const statusOptions = ["nouveau", "en_cours", "resolu"];

const state = {
  incidents: [],
  users: [],
  subscriptions: [],
  analytics: fallbackData.analytics,
  seo: [],
  audit: [],
  source: "api",
  userDraft: null,
  userEditKey: null,
  confirmAction: null
};

const apiCandidates = (() => {
  if (window.location.hostname === "localhost" && window.location.port === "5500") {
    return ["http://localhost:4000/api/admin"];
  }
  return ["/api/admin", "http://localhost:4000/api/admin"];
})();

async function fetchJson(path, options) {
  for (const base of apiCandidates) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (response.ok) {
        state.source = "api";
        return await response.json();
      }
    } catch (_error) {
      // Try next endpoint candidate.
    }
  }
  throw new Error("API unavailable");
}

function fillRows(id, html) {
  const target = document.getElementById(id);
  if (target) target.innerHTML = html;
}

function renderIncidents(rows) {
  fillRows(
    "reportRows",
    rows
      .map(
        (row) => `
      <tr>
        <td>${row.incident_ref}</td>
        <td><span class="tag ${tagClass[row.category] || "tag-gray"}">${row.category}</span></td>
        <td>${row.institution}</td>
        <td>${row.city}</td>
        <td>
          <select class="revision-select" data-field="severity" data-key="${row.incident_key}">
            ${severityOptions.map((item) => `<option value="${item}" ${item === row.severity ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </td>
        <td>
          <select class="revision-select" data-field="status" data-key="${row.incident_key}">
            ${statusOptions.map((item) => `<option value="${item}" ${item === row.status ? "selected" : ""}>${item.replace("_", " ")}</option>`).join("")}
          </select>
        </td>
        <td><button class="save-revision" data-key="${row.incident_key}" type="button">Sauver</button></td>
      </tr>
    `
      )
      .join("")
  );
}

function renderUsers(rows) {
  fillRows(
    "usersRows",
    rows
      .map(
        (row) => `
      <tr>
        <td>${row.full_name}</td>
        <td>${row.email}</td>
        <td><span class="role role-${row.role}">${row.role}</span></td>
        <td>${row.city || "-"}</td>
        <td>${row.status || "Actif"}</td>
        <td>${row.last_activity || "-"}</td>
        <td><button class="edit-user" type="button" data-user-key="${row.user_key}">Modifier</button></td>
      </tr>
    `
      )
      .join("")
  );
}

function openUserDrawer(mode, row = null) {
  const drawer = document.getElementById("userDrawer");
  const backdrop = document.getElementById("userDrawerBackdrop");
  const title = document.getElementById("userDrawerTitle");
  const submit = document.getElementById("submitUserFormBtn");
  const form = document.getElementById("userForm");

  if (!drawer || !backdrop || !title || !submit || !form) return;

  if (mode === "edit" && row) {
    state.userEditKey = row.user_key;
    title.textContent = "Mettre a jour utilisateur";
    submit.textContent = "Mettre a jour";
    form.fullName.value = row.full_name || "";
    form.email.value = row.email || "";
    form.role.value = row.role || "viewer";
    form.city.value = row.city || "";
    form.dataset.originalEmail = row.email || "";
  } else {
    state.userEditKey = null;
    title.textContent = "Ajouter un utilisateur";
    submit.textContent = "Sauvegarder";
    form.reset();
    form.role.value = "viewer";
    form.dataset.originalEmail = "";
  }

  backdrop.hidden = false;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeUserDrawer() {
  const drawer = document.getElementById("userDrawer");
  const backdrop = document.getElementById("userDrawerBackdrop");
  if (!drawer || !backdrop) return;
  backdrop.hidden = true;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  state.userEditKey = null;
}

function openConfirmModal(message, action) {
  const modal = document.getElementById("confirmModal");
  const backdrop = document.getElementById("confirmBackdrop");
  const text = document.getElementById("confirmMessage");
  if (!modal || !backdrop || !text) return;
  text.textContent = message;
  state.confirmAction = action;
  backdrop.hidden = false;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  const backdrop = document.getElementById("confirmBackdrop");
  if (!modal || !backdrop) return;
  backdrop.hidden = true;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  state.confirmAction = null;
}

async function saveUserDraft() {
  if (!state.userDraft) return;
  const payload = state.userDraft;
  const userKey = state.userEditKey;
  try {
    await fetchJson(userKey ? `/users/${userKey}` : "/users", {
      method: userKey ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": "admin@mwangaza.cd"
      },
      body: JSON.stringify(payload)
    });
    closeConfirmModal();
    closeUserDrawer();
    await loadUsers();
    await loadSeoTab();
  } catch (_error) {
    closeConfirmModal();
    alert("Sauvegarde utilisateur impossible sans API active.");
  } finally {
    state.userDraft = null;
  }
}

function renderSubscriptions(rows) {
  fillRows(
    "subscriptionRows",
    rows
      .map(
        (row) => `
      <tr>
        <td>${row.institution}</td>
        <td><span class="plan plan-${String(row.plan).toLowerCase()}">${row.plan}</span></td>
        <td>$${Number(row.amount).toLocaleString()}</td>
        <td>${String(row.start_date).slice(0, 10)}</td>
        <td>${String(row.renewal_date).slice(0, 10)}</td>
        <td>${row.state}</td>
      </tr>
    `
      )
      .join("")
  );
}

function renderAnalytics(data) {
  const bars = document.getElementById("analyticsBars");
  if (bars) {
    const max = Math.max(1, ...data.monthly.map((entry) => Number(entry.incidents || 0)));
    bars.innerHTML = data.monthly
      .map(
        (entry) => `
      <div class="hbar-row">
        <strong>${entry.month}</strong>
        <div class="hbar-track"><span style="width:${Math.round((Number(entry.incidents || 0) / max) * 100)}%"></span></div>
        <span>${entry.incidents}</span>
      </div>
    `
      )
      .join("");
  }

  fillRows(
    "categoryRows",
    data.categories
      .map(
        (row) => `
      <tr>
        <td>${row.category}</td>
        <td>${row.volume}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `
      )
      .join("")
  );
}

function renderFeatures() {
  const featureList = document.getElementById("featureList");
  if (!featureList) return;
  featureList.innerHTML = featureModules
    .map(
      ([name, desc, enabled]) => `
      <article class="feature-item">
        <div>
          <h4>${name}</h4>
          <p>${desc}</p>
        </div>
        <span class="feature-state ${enabled ? "enabled" : "disabled"}">${enabled ? "active" : "desactive"}</span>
      </article>
    `
    )
    .join("");
}

function renderPlanCards(rows) {
  const planCards = document.getElementById("planCards");
  if (!planCards) return;
  const byPlan = rows.reduce((acc, row) => {
    if (!acc[row.plan]) acc[row.plan] = { revenue: 0, count: 0 };
    acc[row.plan].revenue += Number(row.amount || 0);
    acc[row.plan].count += 1;
    return acc;
  }, {});

  const css = { Pilote: "plan-pilote", Standard: "plan-standard", Premium: "plan-premium" };
  planCards.innerHTML = Object.entries(byPlan)
    .map(
      ([plan, values]) => `
      <article class="plan-card">
        <h3>${plan}</h3>
        <p>Revenu mensuel</p>
        <strong>$${values.revenue.toLocaleString()}</strong>
        <p><span class="plan ${css[plan] || "plan-pilote"}">${values.count} comptes</span></p>
      </article>
    `
    )
    .join("");
}

function renderSeo(seoRows, auditRows) {
  fillRows(
    "seoRows",
    seoRows
      .map(
        (row) => `
      <tr>
        <td>${new Date(row.event_time).toLocaleString()}</td>
        <td>${row.route}</td>
        <td>${row.user_email || "anonymous"}</td>
        <td>${row.location_text || "unknown"}</td>
        <td>${row.ip_address || "-"}</td>
        <td title="${row.user_agent || ""}">${(row.user_agent || "").slice(0, 65)}</td>
      </tr>
    `
      )
      .join("")
  );

  fillRows(
    "auditRows",
    auditRows
      .map(
        (row) => `
      <tr>
        <td>${new Date(row.changed_at).toLocaleString()}</td>
        <td>${row.table_name}</td>
        <td>${row.record_id}</td>
        <td>${row.action_type}</td>
        <td>${row.changed_by}</td>
        <td title='${row.old_value || ""}'>${(row.old_value || "").slice(0, 60)}</td>
        <td title='${row.new_value || ""}'>${(row.new_value || "").slice(0, 60)}</td>
      </tr>
    `
      )
      .join("")
  );

  document.getElementById("seoEventsCount").textContent = String(seoRows.length);
  document.getElementById("seoRouteCount").textContent = String(new Set(seoRows.map((row) => row.route)).size);
  document.getElementById("seoUserCount").textContent = String(new Set(seoRows.map((row) => row.user_email)).size);
  document.getElementById("seoLocationCount").textContent = String(new Set(seoRows.map((row) => row.location_text)).size);
}

function hydrateFilters(rows) {
  const categories = [...new Set(rows.map((row) => row.category))];
  const cities = [...new Set(rows.map((row) => row.city))];
  const fillSelect = (id, values) => {
    const select = document.getElementById(id);
    if (!select) return;
    const firstOption = select.querySelector("option");
    const first = firstOption ? firstOption.outerHTML : "<option value=''>-</option>";
    select.innerHTML = first + values.map((value) => `<option value="${value}">${value}</option>`).join("");
  };
  fillSelect("filterCategory", categories);
  fillSelect("filterCity", cities);
  fillSelect("filterSeverity", severityOptions);
  fillSelect("filterStatus", statusOptions);
}

async function loadIncidents() {
  const filters = {
    category: document.getElementById("filterCategory")?.value || "",
    city: document.getElementById("filterCity")?.value || "",
    severity: document.getElementById("filterSeverity")?.value || "",
    status: document.getElementById("filterStatus")?.value || "",
    q: document.getElementById("filterSearch")?.value?.trim() || ""
  };

  const queryText = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  try {
    const rows = await fetchJson(`/incidents${queryText ? `?${queryText}` : ""}`);
    state.incidents = rows;
  } catch (_error) {
    state.source = "fallback";
    state.incidents = fallbackData.incidents.filter((row) => {
      const qPass = !filters.q || row.incident_ref.includes(filters.q) || row.institution.toLowerCase().includes(filters.q.toLowerCase());
      const categoryPass = !filters.category || row.category === filters.category;
      const cityPass = !filters.city || row.city === filters.city;
      const severityPass = !filters.severity || row.severity === filters.severity;
      const statusPass = !filters.status || row.status === filters.status;
      return qPass && categoryPass && cityPass && severityPass && statusPass;
    });
  }

  renderIncidents(state.incidents);
  hydrateFilters(state.incidents.length ? state.incidents : fallbackData.incidents);
}

async function saveIncidentRevision(incidentKey) {
  const rowRoot = document.querySelector(`.save-revision[data-key="${incidentKey}"]`)?.closest("tr");
  if (!rowRoot) return;
  const status = rowRoot.querySelector('select[data-field="status"]')?.value;
  const severity = rowRoot.querySelector('select[data-field="severity"]')?.value;
  try {
    await fetchJson(`/incidents/${incidentKey}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": "admin@mwangaza.cd"
      },
      body: JSON.stringify({ status, severity })
    });
    await loadIncidents();
    await loadSeoTab();
  } catch (_error) {
    alert("Revision impossible sans API active.");
  }
}

async function loadUsers() {
  try {
    state.users = await fetchJson("/users");
  } catch (_error) {
    state.source = "fallback";
    state.users = fallbackData.users;
  }
  renderUsers(state.users);
}

async function loadSubscriptions() {
  try {
    state.subscriptions = await fetchJson("/subscriptions");
  } catch (_error) {
    state.source = "fallback";
    state.subscriptions = fallbackData.subscriptions;
  }
  renderSubscriptions(state.subscriptions);
  renderPlanCards(state.subscriptions);
}

async function loadAnalytics() {
  try {
    state.analytics = await fetchJson("/analytics");
  } catch (_error) {
    state.source = "fallback";
    state.analytics = fallbackData.analytics;
  }
  renderAnalytics(state.analytics);
}

async function loadSeoTab() {
  try {
    state.seo = await fetchJson("/seo");
    state.audit = await fetchJson("/audit-trail");
  } catch (_error) {
    state.source = "fallback";
    state.seo = fallbackData.seo;
    state.audit = fallbackData.audit;
  }
  renderSeo(state.seo, state.audit);
}

async function logPageAccess(route) {
  try {
    await fetchJson("/track-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route,
        locationText: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userEmail: "admin@mwangaza.cd",
        metadata: { locale: navigator.language }
      })
    });
  } catch (_error) {
    // Silent fallback.
  }
}

function registerEvents() {
  document.getElementById("applyIncidentFilters")?.addEventListener("click", loadIncidents);
  document.getElementById("resetIncidentFilters")?.addEventListener("click", () => {
    ["filterCategory", "filterCity", "filterSeverity", "filterStatus", "filterSearch"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    loadIncidents();
  });

  document.getElementById("reportRows")?.addEventListener("click", (event) => {
    const button = event.target.closest(".save-revision");
    if (!button) return;
    saveIncidentRevision(button.dataset.key);
  });

  document.getElementById("addUserBtn")?.addEventListener("click", () => openUserDrawer("add"));
  document.getElementById("openUserDrawerBtn")?.addEventListener("click", () => {
    switchTab("utilisateurs");
    openUserDrawer("add");
  });

  document.getElementById("usersRows")?.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-user");
    if (!button) return;
    const row = state.users.find((item) => String(item.user_key) === String(button.dataset.userKey));
    if (!row) return;
    openUserDrawer("edit", row);
  });

  document.getElementById("closeUserDrawerBtn")?.addEventListener("click", closeUserDrawer);
  document.getElementById("cancelUserFormBtn")?.addEventListener("click", closeUserDrawer);
  document.getElementById("userDrawerBackdrop")?.addEventListener("click", closeUserDrawer);

  document.getElementById("userForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      role: form.role.value,
      city: form.city.value.trim(),
      originalEmail: form.dataset.originalEmail || ""
    };
    if (!payload.fullName || !payload.email || !payload.role || !payload.city) {
      alert("Tous les champs utilisateur sont obligatoires.");
      return;
    }
    state.userDraft = payload;
    openConfirmModal(
      state.userEditKey ? "Confirmer la mise a jour de cet utilisateur ?" : "Confirmer la creation de cet utilisateur ?",
      saveUserDraft
    );
  });

  document.getElementById("confirmCancelBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("confirmBackdrop")?.addEventListener("click", closeConfirmModal);
  document.getElementById("confirmOkBtn")?.addEventListener("click", async () => {
    if (typeof state.confirmAction === "function") {
      await state.confirmAction();
    }
  });
}

const navItems = Array.from(document.querySelectorAll(".nav-item"));
const sections = {
  dashboard: document.getElementById("dashboardSection"),
  utilisateurs: document.getElementById("utilisateursSection"),
  abonnements: document.getElementById("abonnementsSection"),
  analytics: document.getElementById("analyticsSection"),
  fonctionnalites: document.getElementById("fonctionnalitesSection"),
  seo: document.getElementById("seoSection")
};

const title = document.getElementById("sectionTitle");
const subtitle = document.getElementById("sectionSubtitle");
const routePill = document.getElementById("routePill");

function switchTab(tab) {
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === tab));
  Object.entries(sections).forEach(([name, section]) => {
    if (section) section.classList.toggle("is-visible", name === tab);
  });

  const [newTitle, newSubtitle, route] = sectionMeta[tab] || sectionMeta.dashboard;
  title.textContent = newTitle;
  subtitle.textContent = newSubtitle;
  routePill.textContent = route;
  logPageAccess(route);

  if (tab === "seo") loadSeoTab();
}

async function bootstrap() {
  registerEvents();
  renderFeatures();
  await Promise.all([loadIncidents(), loadUsers(), loadSubscriptions(), loadAnalytics()]);
  await logPageAccess("/admin/dashboard");
}

navItems.forEach((item) => item.addEventListener("click", () => switchTab(item.dataset.tab)));

document.getElementById("refreshBtn")?.addEventListener("click", () => {
  const active = navItems.find((item) => item.classList.contains("is-active"));
  const tab = active?.dataset.tab || "dashboard";
  if (tab === "dashboard") loadIncidents();
  if (tab === "utilisateurs") loadUsers();
  if (tab === "abonnements") loadSubscriptions();
  if (tab === "analytics") loadAnalytics();
  if (tab === "seo") loadSeoTab();
  switchTab(tab);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("mwangaza_auth");
  window.location.href = "../";
});

bootstrap();
