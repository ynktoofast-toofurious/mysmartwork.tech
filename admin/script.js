const reportRows = [
  ["#2333", "Autre", "243999000001", "Matadi", "moyen", "nouveau"],
  ["#2891", "Corruption", "Douanes - Matadi", "Matadi", "eleve", "nouveau"],
  ["#2890", "Surfacturation", "Mairie - Goma", "Goma", "moyen", "en_cours"],
  ["#2889", "Abus d'autorite", "Police - Kinshasa", "Kinshasa", "critique", "resolu"],
  ["#2888", "Detournement", "Mairie - Lubumbashi", "Lubumbashi", "critique", "en_cours"]
];

const users = [
  ["Amina Kabeya", "amina.kabeya@mwangaza.cd", "admin", "Kinshasa", "Actif", "il y a 2 min"],
  ["Joel Mutombo", "joel.mutombo@mwangaza.cd", "agent", "Lubumbashi", "Actif", "il y a 9 min"],
  ["Sarah Lufuma", "sarah.lufuma@mwangaza.cd", "viewer", "Goma", "Inactif", "hier"],
  ["Patrick Nlandu", "patrick.nlandu@mwangaza.cd", "agent", "Bukavu", "Actif", "il y a 1 h"],
  ["Grace Mbuyi", "grace.mbuyi@mwangaza.cd", "viewer", "Kisangani", "Actif", "il y a 3 h"]
];

const subscriptions = [
  ["DGI", "Pilote", "$499", "2026-01-01", "2026-06-01", "Actif"],
  ["Mairie de Goma", "Standard", "$1,500", "2025-12-12", "2026-06-12", "Actif"],
  ["Police Nationale", "Premium", "$7,500", "2026-02-15", "2026-06-15", "Actif"],
  ["Douanes Matadi", "Standard", "$1,500", "2025-11-03", "2026-05-03", "Expire"],
  ["Tribunal Bukavu", "Pilote", "$499", "2026-03-01", "2026-06-01", "Actif"]
];

const analytics = [
  ["Jan", 38],
  ["Fev", 46],
  ["Mar", 61],
  ["Avr", 72],
  ["Mai", 84]
];

const categories = [
  ["Corruption", 142, "+12%", "36h"],
  ["Surfacturation", 89, "+6%", "28h"],
  ["Abus d'autorite", 74, "-3%", "19h"],
  ["Detournement", 53, "+8%", "41h"],
  ["Fraude", 49, "+2%", "30h"]
];

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
  fonctionnalites: ["Fonctionnalites", "Activation des modules metier", "/admin/fonctionnalites"]
};

const fillRows = (id, html) => {
  const target = document.getElementById(id);
  if (target) {
    target.innerHTML = html;
  }
};

fillRows(
  "reportRows",
  reportRows
    .map(
      ([ref, category, institution, city, severity, status]) => `
      <tr>
        <td>${ref}</td>
        <td><span class="tag ${tagClass[category] || "tag-gray"}">${category}</span></td>
        <td>${institution}</td>
        <td>${city}</td>
        <td><span class="sev-pill ${severityClass[severity] || "sev-medium"}">${severity.replace("_", " ")}</span></td>
        <td><span class="status ${statusClass[status] || "status-new"}">${status.replace("_", " ")}</span></td>
      </tr>
    `
    )
    .join("")
);

fillRows(
  "usersRows",
  users
    .map(
      ([name, email, role, city, status, activity]) => `
      <tr>
        <td>${name}</td>
        <td>${email}</td>
        <td><span class="role role-${role}">${role}</span></td>
        <td>${city}</td>
        <td>${status}</td>
        <td>${activity}</td>
      </tr>
    `
    )
    .join("")
);

const planCards = document.getElementById("planCards");
if (planCards) {
  const planMetrics = [
    ["Pilote", "$1,497", "3 comptes", "plan-pilote"],
    ["Standard", "$6,000", "4 comptes", "plan-standard"],
    ["Premium", "$22,500", "3 comptes", "plan-premium"]
  ];
  planCards.innerHTML = planMetrics
    .map(
      ([name, revenue, count, cls]) => `
      <article class="plan-card">
        <h3>${name}</h3>
        <p>Revenu mensuel</p>
        <strong>${revenue}</strong>
        <p><span class="plan ${cls}">${count}</span></p>
      </article>
    `
    )
    .join("");
}

fillRows(
  "subscriptionRows",
  subscriptions
    .map(
      ([inst, plan, amount, start, renew, state]) => `
      <tr>
        <td>${inst}</td>
        <td><span class="plan plan-${plan.toLowerCase()}">${plan}</span></td>
        <td>${amount}</td>
        <td>${start}</td>
        <td>${renew}</td>
        <td>${state}</td>
      </tr>
    `
    )
    .join("")
);

const bars = document.getElementById("analyticsBars");
if (bars) {
  bars.innerHTML = analytics
    .map(
      ([month, value]) => `
      <div class="hbar-row">
        <strong>${month}</strong>
        <div class="hbar-track"><span style="width:${value}%"></span></div>
        <span>${value}%</span>
      </div>
    `
    )
    .join("");
}

fillRows(
  "categoryRows",
  categories
    .map(
      ([category, volume, change, delay]) => `
      <tr>
        <td>${category}</td>
        <td>${volume}</td>
        <td>${change}</td>
        <td>${delay}</td>
      </tr>
    `
    )
    .join("")
);

const featureList = document.getElementById("featureList");
if (featureList) {
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

const navItems = Array.from(document.querySelectorAll(".nav-item"));
const sections = {
  dashboard: document.getElementById("dashboardSection"),
  utilisateurs: document.getElementById("utilisateursSection"),
  abonnements: document.getElementById("abonnementsSection"),
  analytics: document.getElementById("analyticsSection"),
  fonctionnalites: document.getElementById("fonctionnalitesSection")
};

const title = document.getElementById("sectionTitle");
const subtitle = document.getElementById("sectionSubtitle");
const routePill = document.getElementById("routePill");

const switchTab = (tab) => {
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === tab));
  Object.entries(sections).forEach(([name, section]) => {
    if (section) {
      section.classList.toggle("is-visible", name === tab);
    }
  });

  const [newTitle, newSubtitle, route] = sectionMeta[tab] || sectionMeta.dashboard;
  title.textContent = newTitle;
  subtitle.textContent = newSubtitle;
  routePill.textContent = route;
};

navItems.forEach((item) => {
  item.addEventListener("click", () => switchTab(item.dataset.tab));
});

document.getElementById("refreshBtn")?.addEventListener("click", () => {
  const active = navItems.find((item) => item.classList.contains("is-active"));
  switchTab(active?.dataset.tab || "dashboard");
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("mwangaza_auth");
  window.location.href = "../";
});
