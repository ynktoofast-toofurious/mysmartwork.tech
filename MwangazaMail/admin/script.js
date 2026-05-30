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
  claimreports: ["Claim Report", "Vue detaillee et gestion des signalements", "/admin/claim-report"],
  utilisateurs: ["Utilisateurs", "Gestion des comptes et des roles", "/admin/utilisateurs"],
  abonnements: ["Abonnements", "Suivi des plans et renouvellements", "/admin/abonnements"],
  analytics: ["Analytics", "Analyse des performances et tendances", "/admin/analytics"],
  fonctionnalites: ["Fonctionnalites", "Activation des modules metier", "/admin/fonctionnalites"]
};

const severityOptions = ["faible", "moyen", "eleve", "critique"];
const statusOptions = ["nouveau", "en_cours", "resolu"];
const STRICT_LIVE_MODE = window.location.hostname !== "localhost";
const CACHE_KEY = "mwangaza_admin_live_cache_v1";
const API_BASE_KEY = "mwangaza_api_base";
const API_BASES_KEY = "mwangaza_api_bases";
const PRODUCTION_API_BASE = "https://api.mysmartwork.tech/api/admin";
const API_TIMEOUT_MS = 12000;
const API_HEALTH_TIMEOUT_MS = 5000;
const API_GET_RETRIES = 2;

const cachedSnapshot = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch (_error) {
    return null;
  }
})();

const state = {
  incidents: cachedSnapshot?.incidents || [],
  users: cachedSnapshot?.users || [],
  subscriptions: cachedSnapshot?.subscriptions || [],
  analytics: cachedSnapshot?.analytics || fallbackData.analytics,
  seo: cachedSnapshot?.seo || [],
  audit: cachedSnapshot?.audit || [],
  aiMessages: [
    {
      role: "assistant",
      content: "Bonjour. Je peux analyser les incidents, abonnements et KPI du tableau."
    }
  ],
  source: "api",
  userDraft: null,
  userEditKey: null,
  claimEditKey: null,
  confirmAction: null
};
let selectedClaimKeys = new Set();

const apiCandidates = (() => {
  const params = new URLSearchParams(window.location.search);
  const queryApiBase = (params.get("apiBase") || "").trim();
  const normalizedQueryBases = queryApiBase
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

  let savedApiBase = "";
  let savedApiBases = [];
  try {
    savedApiBase = (localStorage.getItem(API_BASE_KEY) || "").trim().replace(/\/$/, "");
    const parsed = JSON.parse(localStorage.getItem(API_BASES_KEY) || "[]");
    if (Array.isArray(parsed)) {
      savedApiBases = parsed.map((item) => String(item || "").trim().replace(/\/$/, "")).filter(Boolean);
    }
  } catch (_error) {
    savedApiBase = "";
    savedApiBases = [];
  }

  if (STRICT_LIVE_MODE && /localhost|127\.0\.0\.1/i.test(savedApiBase)) {
    savedApiBase = "";
    savedApiBases = savedApiBases.filter((item) => !/localhost|127\.0\.0\.1/i.test(item));
  }

  if (normalizedQueryBases.length) {
    try {
      localStorage.setItem(API_BASE_KEY, normalizedQueryBases[0]);
      localStorage.setItem(API_BASES_KEY, JSON.stringify(normalizedQueryBases));
    } catch (_error) {
      // Ignore localStorage unavailability.
    }
  }

  const candidates = [
    ...normalizedQueryBases,
    PRODUCTION_API_BASE,
    savedApiBase,
    ...savedApiBases
  ];

  if (window.location.hostname === "localhost" && window.location.port === "5500") {
    candidates.push("http://localhost:4000/api/admin");
  } else {
    candidates.push("/api/admin");
  }

  return [...new Set(candidates.filter(Boolean).map((item) => item.replace(/\/$/, "")))];
})();

let activeApiBase = apiCandidates[0] || "";

function rememberApiBase(base) {
  if (!base) return;
  activeApiBase = base;
  try {
    localStorage.setItem(API_BASE_KEY, base);
    const merged = [...new Set([base, ...apiCandidates])];
    localStorage.setItem(API_BASES_KEY, JSON.stringify(merged.slice(0, 8)));
  } catch (_error) {
    // Ignore localStorage unavailability.
  }
}

function getCandidateBases() {
  const ordered = [activeApiBase, ...apiCandidates].filter(Boolean);
  return [...new Set(ordered)];
}

function healthUrlForBase(base) {
  if (!base) return "/health";
  if (base.endsWith("/api/admin")) {
    return `${base.slice(0, -"/api/admin".length)}/health`;
  }
  return `${base}/health`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeApiBase(base) {
  try {
    const response = await fetchWithTimeout(healthUrlForBase(base), { method: "GET" }, API_HEALTH_TIMEOUT_MS);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function resolveApiBase() {
  const candidates = getCandidateBases();
  for (const base of candidates) {
    const healthy = await probeApiBase(base);
    if (healthy) {
      rememberApiBase(base);
      updateDataStatus("live", "Service disponible");
      return base;
    }
  }
  return activeApiBase || candidates[0] || "";
}

function updateDataStatus(kind, text) {
  const badge = document.getElementById("dataStatus");
  if (!badge) return;
  badge.classList.remove("live", "cache", "offline");
  if (kind) badge.classList.add(kind);
  badge.textContent = text;
}

function persistCache() {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        incidents: state.incidents,
        users: state.users,
        subscriptions: state.subscriptions,
        analytics: state.analytics,
        seo: state.seo,
        audit: state.audit,
        updatedAt: new Date().toISOString()
      })
    );
  } catch (_error) {
    // Ignore storage failures.
  }
}

async function fetchJson(path, options) {
  const request = options || {};
  const method = String(request.method || "GET").toUpperCase();
  const retries = method === "GET" ? API_GET_RETRIES : 0;
  const bases = getCandidateBases();
  let lastError = new Error("API unavailable");

  for (const base of bases) {
    try {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const response = await fetchWithTimeout(`${base}${path}`, request, API_TIMEOUT_MS);
        if (response.ok) {
          state.source = "api";
          rememberApiBase(base);
          updateDataStatus("live", "Service disponible");
          return await response.json();
        }

        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          const payload = await response.json().catch(() => ({}));
          const message = payload?.message || `HTTP ${response.status}`;
          throw new Error(message);
        }

        if (attempt === retries) {
          throw new Error(`HTTP ${response.status}`);
        }
      }
    } catch (error) {
      lastError = error;
      // Try next endpoint candidate.
    }
  }

  const recoveredBase = await resolveApiBase();
  if (recoveredBase && !bases.includes(recoveredBase)) {
    try {
      const response = await fetchWithTimeout(`${recoveredBase}${path}`, request, API_TIMEOUT_MS);
      if (response.ok) {
        state.source = "api";
        rememberApiBase(recoveredBase);
        updateDataStatus("live", "Service disponible");
        return await response.json();
      }
    } catch (_error) {
      // Keep offline/cache state.
    }
  }

  updateDataStatus(state.users.length || state.incidents.length ? "cache" : "offline", state.users.length || state.incidents.length ? "Donnees temporaires" : "Service indisponible");
  throw lastError;
}

function fillRows(id, html) {
  const target = document.getElementById(id);
  if (target) target.innerHTML = html;
}

function renderIncidents(rows) {
  const formatSource = (value) => {
    const clean = String(value || "").trim().toLowerCase();
    if (!clean) return "-";
    if (clean === "demo_ui") return "demo UI";
    if (clean === "whatsapp_number") return "whatsapp number";
    return clean.replace(/_/g, " ");
  };

  const formatTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  fillRows(
    "reportRows",
    rows
      .map(
        (row) => `
      <tr class="claim-row" data-key="${row.incident_key}" title="Ref: ${String(row.incident_ref || "-").replace(/"/g, "&quot;")} | Institution: ${String(row.institution || "-").replace(/"/g, "&quot;")} | Ville: ${String(row.city || "-").replace(/"/g, "&quot;")} | Tel: ${String(row.reporter_phone || "-").replace(/"/g, "&quot;")} | Description: ${String(row.description || "-").replace(/"/g, "&quot;")}">
        <td><input class="claim-select" type="checkbox" data-key="${row.incident_key}" ${selectedClaimKeys.has(Number(row.incident_key)) ? "checked" : ""} /></td>
        <td>${row.incident_ref}</td>
        <td><span class="tag ${tagClass[row.category] || "tag-gray"}">${row.category}</span></td>
        <td>${row.institution}</td>
        <td>${row.city}</td>
        <td>${row.reporter_phone || "-"}</td>
        <td>${formatSource(row.ingestion_source)}</td>
        <td>${formatTime(row.reported_at)}</td>
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
        <td class="desc-cell" title="${(row.description || "").replace(/"/g, "&quot;")}">${row.description || ""}</td>
        <td><button class="save-revision claim-delete-btn" data-key="${row.incident_key}" type="button">Supprimer</button></td>
      </tr>
    `
      )
      .join("")
  );

  const available = new Set(rows.map((row) => Number(row.incident_key)));
  selectedClaimKeys = new Set([...selectedClaimKeys].filter((key) => available.has(key)));
  syncClaimSelectionState();
}

function syncClaimSelectionState() {
  const checkboxes = Array.from(document.querySelectorAll(".claim-select"));
  const selectAll = document.getElementById("claimSelectAll");
  const selectedCount = selectedClaimKeys.size;
  const deleteBtn = document.getElementById("claimDeleteSelectedBtn");

  checkboxes.forEach((box) => {
    const key = Number(box.dataset.key);
    box.checked = selectedClaimKeys.has(key);
  });

  if (selectAll) {
    const total = checkboxes.length;
    selectAll.checked = total > 0 && selectedCount === total;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < total;
  }

  if (deleteBtn) {
    deleteBtn.disabled = selectedCount === 0;
    deleteBtn.textContent = selectedCount > 0 ? `Supprimer selection (${selectedCount})` : "Supprimer selection";
  }
}

function renderClaimInsights(rows) {
  const total = rows.length;
  const byCategory = rows.reduce((acc, row) => {
    const key = row.category || "Autre";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byCity = rows.reduce((acc, row) => {
    const key = row.city || "-";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const bySource = rows.reduce((acc, row) => {
    const key = row.ingestion_source || "-";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topCity = Object.entries(byCity).sort((a, b) => b[1] - a[1])[0];

  const insightRows = [
    ["Total claims", String(total), total ? "Flux actif" : "Aucun claim recu"],
    ["Categorie dominante", topCategory ? `${topCategory[0]} (${topCategory[1]})` : "-", "Prioriser les actions sur cette categorie"],
    ["Ville la plus touchee", topCity ? `${topCity[0]} (${topCity[1]})` : "-", "Verifier les institutions de cette zone"],
    [
      "Sources d'ingestion",
      Object.entries(bySource).map(([name, count]) => `${name}: ${count}`).join(" | ") || "-",
      "Suivre la part demo UI vs WhatsApp number"
    ]
  ];

  fillRows(
    "claimInsightRows",
    insightRows
      .map(([metric, value, insight]) => `
      <tr>
        <td>${metric}</td>
        <td>${value}</td>
        <td>${insight}</td>
      </tr>
    `)
      .join("")
  );
}

function openClaimDrawer(row) {
  const drawer = document.getElementById("claimDrawer");
  const backdrop = document.getElementById("claimDrawerBackdrop");
  const form = document.getElementById("claimForm");
  if (!drawer || !backdrop || !form || !row) return;

  state.claimEditKey = Number(row.incident_key);
  form.incidentRef.value = row.incident_ref || "";
  form.category.value = row.category || "Autre";
  form.institution.value = row.institution || "";
  form.city.value = row.city || "";
  form.reporterPhone.value = row.reporter_phone || "-";
  form.description.value = row.description || "";
  form.severity.value = row.severity || "moyen";
  form.status.value = row.status || "nouveau";

  backdrop.hidden = false;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeClaimDrawer() {
  const drawer = document.getElementById("claimDrawer");
  const backdrop = document.getElementById("claimDrawerBackdrop");
  if (!drawer || !backdrop) return;
  backdrop.hidden = true;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  state.claimEditKey = null;
}

async function saveClaimDetails() {
  const form = document.getElementById("claimForm");
  const incidentKey = Number(state.claimEditKey);
  if (!form || !Number.isFinite(incidentKey)) return;

  const payload = {
    category: form.category.value.trim(),
    institution: form.institution.value.trim(),
    city: form.city.value.trim(),
    description: form.description.value.trim(),
    severity: form.severity.value,
    status: form.status.value
  };

  await fetchJson(`/incidents/${incidentKey}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": "admin@mwangaza.cd"
    },
    body: JSON.stringify(payload)
  });

  closeClaimDrawer();
  await loadIncidents();
}

async function deleteIncidentClaim(incidentKey) {
  await fetchJson(`/incidents/${incidentKey}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": "admin@mwangaza.cd"
    }
  });
  selectedClaimKeys.delete(Number(incidentKey));
  await loadIncidents();
}

async function deleteSelectedClaims() {
  const incidentKeys = [...selectedClaimKeys];
  if (!incidentKeys.length) {
    return;
  }

  if (!window.confirm(`Supprimer ${incidentKeys.length} claim(s) selectionne(s) ?`)) {
    return;
  }

  await fetchJson("/incidents/bulk-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": "admin@mwangaza.cd"
    },
    body: JSON.stringify({ incidentKeys })
  });

  selectedClaimKeys = new Set();
  await loadIncidents();
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
    if (form.password) form.password.value = "";
  } else {
    state.userEditKey = null;
    title.textContent = "Ajouter un utilisateur";
    submit.textContent = "Sauvegarder";
    form.reset();
    form.role.value = "viewer";
    form.dataset.originalEmail = "";
    if (form.password) form.password.value = "";
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

function showGreeting() {
  try {
    const stored = localStorage.getItem("mwangaza_user");
    const parsed = stored ? JSON.parse(stored) : {};
    const rawName = parsed?.name || parsed?.full_name || parsed?.fullName || "";
    const emailName = String(parsed?.email || "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();
    const name = rawName || emailName || "Admin";
    const el = document.getElementById("userGreeting");
    if (el) el.textContent = `Bonjour, ${name}`;
  } catch (_err) {
    const el = document.getElementById("userGreeting");
    if (el) el.textContent = "Bonjour, Admin";
  }
}

function renderAiMessages() {
  const container = document.getElementById("aiChatMessages");
  if (!container) return;
  container.innerHTML = state.aiMessages
    .map((item) => `<div class="ai-message ${item.role}">${item.content}</div>`)
    .join("");
  container.scrollTop = container.scrollHeight;
}

function pushAiMessage(role, content) {
  const safeRole = role === "user" ? "user" : "assistant";
  state.aiMessages.push({ role: safeRole, content: String(content || "") });
  if (state.aiMessages.length > 40) {
    state.aiMessages = [state.aiMessages[0], ...state.aiMessages.slice(-39)];
  }
  renderAiMessages();
}

function openAiModal() {
  document.getElementById("aiBackdrop").hidden = false;
  const drawer = document.getElementById("aiDrawer");
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  renderAiMessages();
  document.getElementById("aiQuestion")?.focus();
}

function closeAiModal() {
  document.getElementById("aiBackdrop").hidden = true;
  const drawer = document.getElementById("aiDrawer");
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

async function sendAiQuestion() {
  const questionEl = document.getElementById("aiQuestion");
  const question = questionEl?.value?.trim();
  if (!question) return;
  pushAiMessage("user", question);
  if (questionEl) questionEl.value = "";
  const btn = document.getElementById("sendAiBtn");
  btn.disabled = true;
  btn.textContent = "Envoi...";
  const context = {
    incidents: state.incidents.slice(0, 50),
    subscriptions: state.subscriptions,
    analytics: state.analytics
  };
  try {
    const data = await fetchJson("/ai-analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        context,
        messages: state.aiMessages
          .filter((item) => item.content && (item.role === "user" || item.role === "assistant"))
          .slice(-12)
      })
    });
    pushAiMessage("assistant", data.answer || "Aucune reponse.");
  } catch (_err) {
    pushAiMessage("assistant", "Service IA indisponible. Verifiez que l'API est en ligne.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Envoyer";
  }
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
    const user = await fetchJson(userKey ? `/users/${userKey}` : "/users", {
      method: userKey ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": "admin@mwangaza.cd"
      },
      body: JSON.stringify(payload)
    });

    const password = String(payload.password || "").trim();
    let resolvedKey = userKey || user?.user_key || null;
    if (password && !resolvedKey) {
      const refreshedUsers = await fetchJson("/users").catch(() => []);
      const targetEmail = String(payload.email || "").trim().toLowerCase();
      const matched = Array.isArray(refreshedUsers)
        ? refreshedUsers.find((item) => String(item?.email || "").trim().toLowerCase() === targetEmail)
        : null;
      resolvedKey = matched?.user_key || null;
    }

    if (password && resolvedKey) {
      await fetchJson(`/users/${resolvedKey}/set-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "admin@mwangaza.cd"
        },
        body: JSON.stringify({ password, email: payload.email, fullName: payload.fullName })
      });
    } else if (password && !resolvedKey) {
      throw new Error("Mot de passe non applique: identifiant utilisateur introuvable. Reessayez apres actualisation.");
    }

    closeConfirmModal();
    closeUserDrawer();
    await loadUsers();
  } catch (_error) {
    closeConfirmModal();
    const rawMessage = String(_error?.message || "").trim();
    const genericMessage = "Sauvegarde impossible. Aucun changement n'a ete persiste.";
    const safeMessage = rawMessage && !/^HTTP\s\d+/i.test(rawMessage) ? `${genericMessage} ${rawMessage}` : genericMessage;
    alert(safeMessage);
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
    persistCache();
  } catch (_error) {
    if (!STRICT_LIVE_MODE) {
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
  }

  renderIncidents(state.incidents);
  renderClaimInsights(state.incidents);
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
  } catch (_error) {
    alert("Revision impossible tant que le service est indisponible.");
  }
}

async function loadUsers() {
  try {
    state.users = await fetchJson("/users");
    persistCache();
  } catch (_error) {
    if (!STRICT_LIVE_MODE) {
      state.source = "fallback";
      state.users = fallbackData.users;
    }
  }
  renderUsers(state.users);
}

async function loadSubscriptions() {
  try {
    state.subscriptions = await fetchJson("/subscriptions");
    persistCache();
  } catch (_error) {
    if (!STRICT_LIVE_MODE) {
      state.source = "fallback";
      state.subscriptions = fallbackData.subscriptions;
    }
  }
  renderSubscriptions(state.subscriptions);
  renderPlanCards(state.subscriptions);
}

async function loadAnalytics() {
  try {
    state.analytics = await fetchJson("/analytics");
    persistCache();
  } catch (_error) {
    if (!STRICT_LIVE_MODE) {
      state.source = "fallback";
      state.analytics = fallbackData.analytics;
    }
  }
  renderAnalytics(state.analytics);
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
    const deleteButton = event.target.closest(".claim-delete-btn");
    if (deleteButton) {
      const key = Number(deleteButton.dataset.key);
      if (!Number.isFinite(key)) return;
      if (!window.confirm("Supprimer ce claim ?")) return;
      deleteIncidentClaim(key).catch(() => alert("Suppression impossible pour le moment."));
      return;
    }

    const button = event.target.closest(".save-revision");
    if (button) {
      saveIncidentRevision(button.dataset.key);
      return;
    }

    const isInteractive = event.target.closest("select, input, button, textarea, a");
    if (isInteractive) return;
    const rowRoot = event.target.closest("tr.claim-row");
    if (!rowRoot) return;
    const claim = state.incidents.find((item) => Number(item.incident_key) === Number(rowRoot.dataset.key));
    if (!claim) return;
    openClaimDrawer(claim);
  });

  document.getElementById("reportRows")?.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".claim-select");
    if (!checkbox) return;
    const key = Number(checkbox.dataset.key);
    if (!Number.isFinite(key)) return;
    if (checkbox.checked) selectedClaimKeys.add(key);
    else selectedClaimKeys.delete(key);
    syncClaimSelectionState();
  });

  const reportRows = document.getElementById("reportRows");
  reportRows?.addEventListener("touchstart", (event) => {
    const row = event.target.closest("tr.claim-row");
    if (!row) return;
    row.dataset.touchStartX = String(event.changedTouches[0].clientX);
  }, { passive: true });

  reportRows?.addEventListener("touchend", (event) => {
    const row = event.target.closest("tr.claim-row");
    if (!row) return;
    const start = Number(row.dataset.touchStartX || 0);
    const end = Number(event.changedTouches[0].clientX || 0);
    const delta = end - start;
    if (delta < -40) row.classList.add("row-swiped");
    if (delta > 20) row.classList.remove("row-swiped");
  }, { passive: true });

  document.getElementById("claimSelectAll")?.addEventListener("change", (event) => {
    const checked = Boolean(event.target.checked);
    const keys = state.incidents.map((row) => Number(row.incident_key)).filter((key) => Number.isFinite(key));
    selectedClaimKeys = checked ? new Set(keys) : new Set();
    syncClaimSelectionState();
  });

  document.getElementById("claimSelectAllBtn")?.addEventListener("click", () => {
    const keys = state.incidents.map((row) => Number(row.incident_key)).filter((key) => Number.isFinite(key));
    selectedClaimKeys = new Set(keys);
    syncClaimSelectionState();
  });

  document.getElementById("claimClearSelectionBtn")?.addEventListener("click", () => {
    selectedClaimKeys = new Set();
    syncClaimSelectionState();
  });

  document.getElementById("claimDeleteSelectedBtn")?.addEventListener("click", () => {
    deleteSelectedClaims().catch(() => alert("Suppression multiple impossible pour le moment."));
  });

  document.getElementById("closeClaimDrawerBtn")?.addEventListener("click", closeClaimDrawer);
  document.getElementById("cancelClaimFormBtn")?.addEventListener("click", closeClaimDrawer);
  document.getElementById("claimDrawerBackdrop")?.addEventListener("click", closeClaimDrawer);
  document.getElementById("claimForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveClaimDetails().catch(() => alert("Mise a jour du claim impossible pour le moment."));
  });

  document.getElementById("addUserBtn")?.addEventListener("click", () => openUserDrawer("add"));
  document.getElementById("openUserDrawerBtn")?.addEventListener("click", () => {
    switchTab("utilisateurs");
  });

  document.getElementById("analyseIaBtn")?.addEventListener("click", openAiModal);
  document.getElementById("closeAiModalBtn")?.addEventListener("click", closeAiModal);
  document.getElementById("aiBackdrop")?.addEventListener("click", closeAiModal);
  document.getElementById("aiChatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendAiQuestion();
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
      password: form.password?.value?.trim() || "",
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
  claimreports: document.getElementById("claimreportsSection"),
  utilisateurs: document.getElementById("utilisateursSection"),
  abonnements: document.getElementById("abonnementsSection"),
  analytics: document.getElementById("analyticsSection"),
  fonctionnalites: document.getElementById("fonctionnalitesSection")
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

}

async function bootstrap() {
  showGreeting();
  registerEvents();
  renderAiMessages();
  renderFeatures();
  updateDataStatus("offline", "Connexion...");
  await resolveApiBase();
  await Promise.all([loadIncidents(), loadUsers(), loadSubscriptions(), loadAnalytics()]);
  await logPageAccess("/admin/dashboard");
}

navItems.forEach((item) => item.addEventListener("click", () => switchTab(item.dataset.tab)));

document.getElementById("refreshBtn")?.addEventListener("click", () => {
  const active = navItems.find((item) => item.classList.contains("is-active"));
  const tab = active?.dataset.tab || "dashboard";
  if (tab === "dashboard") loadIncidents();
  if (tab === "claimreports") loadIncidents();
  if (tab === "utilisateurs") loadUsers();
  if (tab === "abonnements") loadSubscriptions();
  if (tab === "analytics") loadAnalytics();
  switchTab(tab);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("mwangaza_auth");
  window.location.href = "../";
});

bootstrap();
