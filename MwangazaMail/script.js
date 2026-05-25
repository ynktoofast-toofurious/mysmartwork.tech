import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { createPortal } from "https://esm.sh/react-dom@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const AUTH_KEY = "mwangaza_auth";
const adminUrl = new URL("./admin/", import.meta.url).href;
const COOKIE_KEY = "mwangaza_cookie_consent";

const apiCandidates =
  window.location.hostname === "localhost" && window.location.port === "5500"
    ? ["http://localhost:4000/api/admin"]
    : ["/api/admin", "http://localhost:4000/api/admin"];

async function trackAccess(route) {
  const payload = {
    route,
    locationText: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userEmail: "public-visitor@mwangaza.cd",
    metadata: { locale: navigator.language }
  };

  for (const base of apiCandidates) {
    try {
      const response = await fetch(`${base}/track-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) return;
    } catch (_error) {
      // Try next candidate endpoint.
    }
  }
}

const partnerLogos = ["Ministere", "PNUD", "ONG Congo", "UNDP", "Transparency Intl"];

const problemCards = [
  {
    icon: "⊘",
    title: "La peur du silence",
    text: "Les victimes n'osent pas signaler par peur des represailles. L'impunite s'installe durablement.",
    tone: "red"
  },
  {
    icon: "⌁",
    title: "Aucun canal securise",
    text: "Les boites physiques sont manipulees. Les emails professionnels ne sont pas anonymes.",
    tone: "orange"
  },
  {
    icon: "△",
    title: "Donnees inexploitables",
    text: "Les rares signalements arrivent epars, sans structure. Impossible d'agir vite.",
    tone: "yellow"
  },
  {
    icon: "↘",
    title: "Confiance citoyenne en chute",
    text: "Sans preuve d'action, les citoyens se decouragent. La legitimite institutionnelle s'effrite.",
    tone: "violet"
  }
];

const workflowCards = [
  {
    step: "01",
    icon: "◔",
    title: "Le citoyen envoie un message WhatsApp",
    text: "Aucune app a telecharger. Depuis le numero dedie, il decrit l'abus en quelques lignes.",
    side: "left"
  },
  {
    step: "02",
    icon: "✣",
    title: "L'IA analyse et classe automatiquement",
    text: "Le moteur extrait les faits, evalue la credibilite et categorise le signalement en moins de 2 secondes.",
    side: "right"
  },
  {
    step: "03",
    icon: "⬒",
    title: "L'identite est effacee, les donnees chiffrees",
    text: "Aucune metadonnee personnelle n'est conservee. Le dossier devient anonyme et securise AES-256.",
    side: "left"
  },
  {
    step: "04",
    icon: "▥",
    title: "Le gestionnaire recoit une alerte actionnable",
    text: "Le dashboard presente les faits, la severite, la localisation et la priorite pour agir sans delai.",
    side: "right"
  }
];

const features = [
  {
    tag: "Accessibilite",
    title: "Bot WhatsApp integre",
    text: "Les citoyens signalent comme ils envoient un SMS. Zero friction, zero formation.",
    icon: "◔",
    tone: "green"
  },
  {
    tag: "Intelligence",
    title: "IA de classification",
    text: "Categorisation automatique, detection des doublons, scoring de credibilite. Zero traitement manuel.",
    icon: "✣",
    tone: "violet"
  },
  {
    tag: "Securite",
    title: "Anonymat total garanti",
    text: "Chiffrement AES-256, aucune metadonnee stockee, architecture zero-knowledge.",
    icon: "⬒",
    tone: "blue"
  },
  {
    tag: "Analytics",
    title: "Dashboard analytique",
    text: "Visualisez les tendances, cartographiez les zones a risque et suivez les KPIs en temps reel.",
    icon: "▥",
    tone: "amber"
  },
  {
    tag: "Temps reel",
    title: "Alertes & notifications",
    text: "Recevez une alerte instantanee pour les signalements urgents et priorisez avec le scoring IA.",
    icon: "◌",
    tone: "red"
  },
  {
    tag: "Scalabilite",
    title: "Multi-institutions",
    text: "Gerez plusieurs services, ministeres ou regions depuis un seul tableau de bord.",
    icon: "◎",
    tone: "green"
  }
];

const demoTabs = {
  whatsapp: {
    label: "Citoyen — WhatsApp",
    leftTitle: "MwangazaMail Bot",
    leftStatus: "En ligne",
    messages: [
      { tone: "sent", text: "Bonjour, je souhaite signaler un abus.", time: "14:32" },
      { tone: "received", text: "Bienvenue sur MwangazaMail. Votre signalement est anonyme et securise. Decrivez l'incident en quelques mots.", time: "14:32" },
      { tone: "sent", text: "L'agent a la douane de Matadi m'a demande 50$ pour passer sans inspection.", time: "14:33" },
      { tone: "received", text: "Signalement recu et enregistre. Reference #2891. Une equipe analyse votre dossier sous 24h.", time: "14:33" }
    ],
    bullets: [
      "Anonymisation immediate — aucun numero stocke",
      "Analyse IA en < 2 secondes",
      "Scoring de severite automatique",
      "Transmission chiffree au dashboard gestionnaire"
    ],
    cta: "Tester le bot en live"
  },
  dashboard: {
    label: "Gestionnaire — Dashboard",
    metrics: [
      ["Signalements", "1,284", "+12%"],
      ["Traites", "1,091", "+8%"],
      ["En cours", "143", "stable"],
      ["Taux resolution", "85%", "+5pts"]
    ],
    bars: [36, 48, 33, 61, 52, 70, 42, 78, 65, 74, 58, 86, 77, 81],
    incidents: [
      ["Corruption", "Douanes — Matadi · Il y a 3 min", "Nouveau"],
      ["Surfacturation", "Mairie — Goma · Il y a 18 min", "En cours"],
      ["Abus autorite", "Police — Kinshasa · Il y a 45 min", "Resolu"]
    ]
  },
  reports: {
    label: "Analyste — Rapports",
    stats: [
      ["50+", "Institutions deployees"],
      ["15k+", "Signalements traites"],
      ["85%", "Taux de resolution moyen"],
      ["< 18h", "Temps de reponse moyen"]
    ],
    quotes: [
      {
        text: "En 3 mois d'utilisation, nous avons recu 4x plus de signalements exploitables qu'avec notre ancienne boite a suggestions. Le dashboard nous permet enfin d'agir sur des donnees, pas des rumeurs.",
        initials: "AM",
        name: "Dr. Alphonse Mbuyi",
        role: "Directeur General, Ministere des Finances"
      },
      {
        text: "La facilite d'utilisation est remarquable. Nos agents de terrain signalent maintenant via WhatsApp sans formation. L'IA fait le reste. Notre taux de resolution est passe de 40% a 87%.",
        initials: "MN",
        name: "Marie-Claire Ntumba",
        role: "Responsable Conformite, OGEFREM"
      },
      {
        text: "Ce que j'apprecie le plus : la protection totale des lanceurs d'alerte. Nos beneficiaires communautaires osent enfin parler. C'est un changement culturel reel que MwangazaMail a rendu possible.",
        initials: "KL",
        name: "Pastor Kizito Lukusa",
        role: "Coordinateur, ONG Transparence Congo"
      }
    ]
  }
};

const whyComparisons = [
  ["✗", "Boite de suggestions physique", "bad"],
  ["✗", "Email institutionnel (non anonyme)", "bad"],
  ["✗", "Solutions etrangeres non adaptees", "bad"],
  ["✓", "MwangazaMail — Concu pour la RDC", "good"]
];

const whyCards = [
  ["⚡", "Deploiement en 48h", "Pas de mois d'integration. Votre institution est operationnelle en 48h chrono avec formation incluse."],
  ["◉", "La ou sont les citoyens", "WhatsApp est utilise par 85% des congolais avec un smartphone. Aucune barriere d'adoption."],
  ["◈", "Conformite RGPD & protection maximale", "Architecture pensee pour la conformite legale et la protection absolue des donnees personnelles."],
  ["↻", "Mises a jour automatiques", "La plateforme evolue sans interruption de service. Vous beneficiez toujours des dernieres fonctionnalites."],
  ["◍", "Support dedie en francais", "Une equipe francophone disponible par WhatsApp, email ou visio. Temps de reponse < 4h en jours ouvres."],
  ["<>", "API ouverte & integrations", "Connectez MwangazaMail a vos outils existants : SIRH, GRC, systemes d'archivage. API RESTful documentee."]
];

const pricing = [
  {
    name: "Pilote",
    subtitle: "Pour demarrer",
    price: "150",
    note: "USD/ mois",
    hint: "Ideal pour 1 service ou direction",
    icon: "⚡",
    bullets: [
      "Bot WhatsApp dedie",
      "Dashboard basique",
      "Jusqu'a 500 signalements/mois",
      "Support email",
      "Formation initiale incluse"
    ],
    cta: "Demarrer le pilote →"
  },
  {
    name: "Standard",
    subtitle: "Le plus populaire",
    price: "500",
    note: "USD/ mois",
    hint: "Ideal pour une institution complete",
    icon: "☆",
    badge: "★ LE PLUS POPULAIRE",
    featured: true,
    bullets: [
      "Tout le plan Pilote",
      "IA classification avancee",
      "Signalements illimites",
      "Multi-services (1 institution)",
      "Rapports mensuels PDF",
      "Support prioritaire < 4h"
    ],
    cta: "Choisir Standard →"
  },
  {
    name: "Premium",
    subtitle: "Pour les grandes structures",
    price: "2 500",
    note: "USD/ mois",
    hint: "Ideal pour ministeres et groupes",
    icon: "▦",
    bullets: [
      "Tout le plan Standard",
      "Multi-institutions illimite",
      "Cartographie des risques",
      "API dediee + integrations",
      "SLA 99.9% garanti",
      "Account manager dedie"
    ],
    cta: "Contacter l'equipe →"
  }
];

const faqItems = [
  ["Est-ce difficile a mettre en place pour mon institution ?", "Non. Le deploiement prend en general 48h avec accompagnement complet et formation incluse."],
  ["L'anonymat des signalants est-il vraiment garanti ?", "Oui. Les identifiants sensibles sont supprimes, et les dossiers sont traites en mode anonyme chiffre."],
  ["Combien coute reellement la solution ?", "Les plans sont publics et adaptes au contexte local. Vous pouvez commencer par le plan Pilote sans engagement long."],
  ["Ca fonctionne meme avec une mauvaise connexion internet ?", "Oui. WhatsApp reste accessible meme en connectivite variable, ce qui permet la remontee d'alertes terrain."],
  ["Peut-on l'adapter a notre contexte (langues, secteur) ?", "Oui. Les categories, flux de traitement et interfaces peuvent etre ajustes a vos contraintes institutionnelles."],
  ["Quelles donnees les gestionnaires voient-ils exactement ?", "Uniquement les donnees necessaires au traitement du signalement avec traçabilite des actions de moderation."],
  ["Y a-t-il un support si nous avons des questions ?", "Oui. Support francophone par email, WhatsApp et visio avec SLA selon le plan choisi."]
];

const footerColumns = {
  PRODUIT: ["Solution", "Fonctionnalites", "Demo", "Tarification"],
  RESSOURCES: ["Documentation", "Blog", "Cas d'usage", "API"],
  "LÉGAL": ["Confidentialite", "CGU", "Securite", "RGPD"]
};

const footerSocials = ["𝕏", "in", "✉"];

function LoginPortal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setEmail("");
    setPassword("");
    setShowPassword(false);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    html`
      <div className="portal-backdrop" onClick=${onClose}>
        <div className="portal-card" onClick=${(event) => event.stopPropagation()}>
          <button className="portal-close" type="button" onClick=${onClose}>×</button>
          <div className="portal-badge">Portail admin</div>
          <h3>Connexion espace admin</h3>
          <p>Connectez-vous pour acceder au dashboard, aux utilisateurs, aux abonnements et aux analytics.</p>
          <form
            className="portal-form"
            onSubmit=${(event) => {
              event.preventDefault();
              if (!email.trim() || !password.trim()) return;
              onSubmit();
            }}
          >
            <label htmlFor="portal-email">Email</label>
            <input id="portal-email" type="email" value=${email} placeholder="nom@organisation.com" onInput=${(event) => setEmail(event.target.value)} />
            <label htmlFor="portal-password">Mot de passe</label>
            <div className="portal-input-wrap">
              <input
                id="portal-password"
                type=${showPassword ? "text" : "password"}
                value=${password}
                placeholder="Saisissez votre mot de passe"
                onInput=${(event) => setPassword(event.target.value)}
              />
              <button
                className="portal-eye"
                type="button"
                aria-label=${showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick=${() => setShowPassword((value) => !value)}
              >
                ${showPassword
                  ? html`
                      <svg className="portal-eye-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path
                          d="M10.7 6.8A10.8 10.8 0 0 1 12 6c5.2 0 9.6 3.5 11 6-0.7 1.2-2 2.9-3.8 4.1M14.1 14.2A3 3 0 0 1 9.8 9.9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.4 8.6C4.5 9.9 3.3 11.4 3 12c1.4 2.5 5.8 6 11 6 1.2 0 2.3-0.2 3.4-0.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    `
                  : html`
                      <svg className="portal-eye-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    `}
              </button>
            </div>
            <div className="portal-footer">
              <span>Saisissez vos identifiants pour acceder au dashboard.</span>
              <button className="btn btn-solid" type="submit">Entrer dans le dashboard</button>
            </div>
          </form>
        </div>
      </div>
    `,
    document.body
  );
}

function SandboxNotice({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    html`
      <div className="sandbox-backdrop" role="dialog" aria-modal="true" aria-labelledby="sandbox-title">
        <section className="sandbox-card">
          <button className="sandbox-close" type="button" aria-label="Fermer l'avis sandbox" onClick=${onClose}>×</button>
          <div className="sandbox-pill">YNK-TechUSA Sandbox</div>
          <h2 id="sandbox-title">Environnement de test client</h2>
          <p>
            Cette plateforme est une zone sandbox de <strong>YNK-TechUSA</strong> pour demonstrations et essais clients.
            Certaines donnees, integrations et workflows restent en mode test.
          </p>
          <p className="sandbox-warning">Ce domaine n'est pas la destination finale de production.</p>
          <a className="sandbox-link" href="https://ynk-techusa.com/" target="_blank" rel="noreferrer">Destination officielle: ynk-techusa.com</a>
          <button className="btn btn-solid sandbox-cta" type="button" onClick=${onClose}>Je comprends, continuer</button>
        </section>
      </div>
    `,
    document.body
  );
}

function SandboxBanner({ visible, onClose }) {
  if (!visible) return null;
  return html`
    <div className="sandbox-banner" role="status" aria-live="polite">
      <span>
        Environnement sandbox YNK-TechUSA: zone de test client, non destination finale.
        <a href="https://ynk-techusa.com/" target="_blank" rel="noreferrer">Site officiel</a>
      </span>
      <button type="button" aria-label="Fermer la bannière sandbox" onClick=${onClose}>×</button>
    </div>
  `;
}

function CookieBanner({ visible, onAccept, onReject }) {
  if (!visible) return null;
  return html`
    <div className="cookie-banner" role="dialog" aria-live="polite">
      <div>
        <strong>Gestion des cookies</strong>
        <p>Nous utilisons des cookies pour ameliorer l'experience utilisateur, la mesure d'audience et la securite.</p>
      </div>
      <div className="cookie-actions">
        <button className="btn btn-outline" type="button" onClick=${onReject}>Refuser</button>
        <button className="btn btn-solid" type="button" onClick=${onAccept}>Accepter</button>
      </div>
    </div>
  `;
}

function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(true);
  const [sandboxBannerVisible, setSandboxBannerVisible] = useState(false);
  const [demoTab, setDemoTab] = useState("whatsapp");
  const [cookieVisible, setCookieVisible] = useState(localStorage.getItem(COOKIE_KEY) === null);

  useEffect(() => {
    trackAccess(window.location.pathname || "/");
  }, []);

  const goToAdmin = () => {
    localStorage.setItem(AUTH_KEY, "true");
    window.location.assign(adminUrl);
  };

  const saveCookieConsent = (value) => {
    localStorage.setItem(COOKIE_KEY, value);
    setCookieVisible(false);
  };

  const closeSandboxNotice = () => {
    setSandboxOpen(false);
    setSandboxBannerVisible(true);
  };

  return html`
    <div className="landing-shell">
      <${SandboxBanner} visible=${sandboxBannerVisible} onClose=${() => setSandboxBannerVisible(false)} />
      <header className="site-header">
        <a className="brand" href="#hero">
          <span className="brand-mark"></span>
          <span className="brand-text">MwangazaMail</span>
        </a>
        <nav className="header-nav">
          <a href="#solution">Solution</a>
          <a href="#fonctionnalites">Fonctionnalites</a>
          <a href="#demo">Demo</a>
          <a href="#tarification">Tarification</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          <button className="btn btn-outline" type="button" onClick=${() => setLoginOpen(true)}>Se connecter</button>
          <a className="btn btn-solid" href="#contact">Demander une demo →</a>
        </div>
      </header>

      <main>
        <section className="hero hero-rich" id="hero">
          <div className="hero-headline">
            <div className="trust-pill">★★★★★ Utilise par +50 institutions en RDC</div>
            <h1>
              Signalez la corruption
              <span>via WhatsApp, en securite</span>
            </h1>
            <p className="lead lead-large">
              MwangazaMail permet aux citoyens de signaler anonymement fraudes et abus d'autorite.
              Les institutions recoivent des rapports actionnables en temps reel <strong>sans risque, sans friction.</strong>
            </p>
            <div className="hero-actions hero-actions-large">
              <a className="btn btn-solid btn-large" href="#contact">Demander une demo gratuite →</a>
              <a className="btn btn-outline btn-large" href="#demo">Voir la demo</a>
            </div>
            <ul className="security-points security-points-large">
              <li>Anonymat total</li>
              <li>Chiffrement AES-256</li>
              <li>Via WhatsApp</li>
              <li>Dashboard temps reel</li>
            </ul>
          </div>

          <div className="browser-mock">
            <div className="browser-top">
              <div className="browser-dots"><span></span><span></span><span></span></div>
              <div className="browser-url">app.mwangazamail.cd/dashboard</div>
            </div>
            <div className="browser-body">
              <div className="browser-kpis">
                ${demoTabs.dashboard.metrics.map(
                  ([label, value, delta]) => html`
                    <article className="browser-kpi" key=${label}>
                      <span>${label}</span>
                      <strong>${value}</strong>
                      <em>${delta}</em>
                    </article>
                  `
                )}
              </div>
              <div className="browser-chart-card">
                <div className="browser-chart-head">
                  <b>Signalements par semaine</b>
                  <span>Derniers 30 jours</span>
                </div>
                <div className="browser-bars">
                  ${demoTabs.dashboard.bars.map(
                    (value, index) => html`<span key=${index} style=${{ height: `${value}%` }}></span>`
                  )}
                </div>
              </div>
              <div className="browser-incidents">
                <h3>Derniers signalements</h3>
                ${demoTabs.dashboard.incidents.map(
                  ([title, meta, state]) => html`
                    <div className="browser-incident" key=${title}>
                      <div>
                        <b>${title}</b>
                        <small>${meta}</small>
                      </div>
                      <span>${state}</span>
                    </div>
                  `
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="support-strip" aria-label="Partenaires">
          <p>DEPLOYE AVEC LE SOUTIEN DE</p>
          <div className="support-logos">
            ${partnerLogos.map((name) => html`<span key=${name}>${name}</span>`)}
          </div>
        </section>

        <section className="problem problem-dark" id="problem">
          <div className="section-head section-head-centered section-head-light">
            <p className="eyebrow eyebrow-red">Le probleme</p>
            <h2>
              La corruption prospere dans le <span>silence force</span>
            </h2>
            <p>
              En RDC, 78% des abus ne sont jamais signales. Pas parce que les citoyens ne voient pas,
              mais parce qu'ils n'ont <strong>aucun moyen sur d'agir.</strong>
            </p>
          </div>
          <div className="problem-grid stats-only">
            <article><strong>78%</strong><span>abus non signales</span></article>
            <article><strong>3M+</strong><span>citoyens affectes</span></article>
            <article><strong>0</strong><span>canal securise existant</span></article>
          </div>
          <div className="pain-grid">
            ${problemCards.map(
              (card) => html`
                <article className=${`pain-card pain-${card.tone}`} key=${card.title}>
                  <div className="pain-icon">${card.icon}</div>
                  <div>
                    <h3>${card.title}</h3>
                    <p>${card.text}</p>
                  </div>
                </article>
              `
            )}
          </div>
        </section>

        <section className="workflow workflow-timeline" id="solution">
          <div className="section-head section-head-centered">
            <p className="eyebrow">La solution</p>
            <h2>
              Un signalement en 30 secondes,
              <span>une reponse en 24h</span>
            </h2>
            <p>MwangazaMail transforme WhatsApp en canal officiel de signalement — structure, securise, exploitable par votre equipe.</p>
          </div>
          <div className="timeline-shell">
            <div className="timeline-line"></div>
            ${workflowCards.map(
              (card) => html`
                <article className=${`timeline-card timeline-${card.side}`} key=${card.step}>
                  <div className="timeline-node"></div>
                  <div className="timeline-content">
                    <div className="timeline-step">${card.step}</div>
                    <div className="timeline-icon">${card.icon}</div>
                    <h3>${card.title}</h3>
                    <p>${card.text}</p>
                  </div>
                </article>
              `
            )}
          </div>
          <div className="section-cta">
            <a className="btn btn-solid btn-large" href="#demo">Voir la solution en action →</a>
          </div>
        </section>

        <section className="features features-expanded" id="fonctionnalites">
          <div className="section-head section-head-centered">
            <p className="eyebrow">Fonctionnalites</p>
            <h2>
              Tout ce dont vous avez besoin,
              <span>rien de superflu</span>
            </h2>
            <p>MwangazaMail est concu pour les equipes qui veulent agir — pas gerer un outil complexe.</p>
          </div>
          <div className="feature-grid feature-grid-rich">
            ${features.map(
              (feature) => html`
                <article className="feature-card-rich" key=${feature.title}>
                  <div className=${`feature-icon feature-${feature.tone}`}>${feature.icon}</div>
                  <div className=${`feature-tag feature-${feature.tone}`}>${feature.tag}</div>
                  <h3>${feature.title}</h3>
                  <p>${feature.text}</p>
                </article>
              `
            )}
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div className="section-head section-head-centered">
            <p className="eyebrow">Demonstration</p>
            <h2>
              Voyez MwangazaMail
              <span>en conditions reelles</span>
            </h2>
          </div>
          <div className="demo-tabs">
            ${Object.entries(demoTabs).map(([key, tab]) => html`
              <button
                key=${key}
                className=${`demo-tab ${demoTab === key ? "is-active" : ""}`}
                type="button"
                onClick=${() => setDemoTab(key)}
              >
                ${tab.label}
              </button>
            `)}
          </div>
          <div className="demo-panel">
            ${demoTab === "whatsapp" && html`
              <div className="whatsapp-demo">
                <div className="chat-window">
                  <div className="chat-header">
                    <div className="chat-avatar">◔</div>
                    <div>
                      <strong>${demoTabs.whatsapp.leftTitle}</strong>
                      <small>• ${demoTabs.whatsapp.leftStatus}</small>
                    </div>
                  </div>
                  ${demoTabs.whatsapp.messages.map(
                    (message, index) => html`
                      <div className=${`chat-bubble ${message.tone}`} key=${index}>
                        <p>${message.text}</p>
                        <span>${message.time}</span>
                      </div>
                    `
                  )}
                </div>
                <div className="demo-copy">
                  <h3>Ce qui se passe en coulisses</h3>
                  <ul className="demo-bullets">
                    ${demoTabs.whatsapp.bullets.map((bullet) => html`<li key=${bullet}>${bullet}</li>`)}
                  </ul>
                  <a className="text-link" href="#contact">Tester le bot en live →</a>
                </div>
              </div>
            `}
            ${demoTab === "dashboard" && html`
              <div className="dashboard-demo">
                <div className="browser-kpis browser-kpis-demo">
                  ${demoTabs.dashboard.metrics.map(
                    ([label, value, delta]) => html`
                      <article className="browser-kpi" key=${label}>
                        <span>${label}</span>
                        <strong>${value}</strong>
                        <em>${delta}</em>
                      </article>
                    `
                  )}
                </div>
                <div className="browser-chart-card">
                  <div className="browser-chart-head">
                    <b>Signalements par semaine</b>
                    <span>Derniers 30 jours</span>
                  </div>
                  <div className="browser-bars">
                    ${demoTabs.dashboard.bars.map(
                      (value, index) => html`<span key=${index} style=${{ height: `${value}%` }}></span>`
                    )}
                  </div>
                </div>
                <div className="browser-incidents browser-incidents-demo">
                  <h3>Derniers signalements</h3>
                  ${demoTabs.dashboard.incidents.map(
                    ([title, meta, state]) => html`
                      <div className="browser-incident" key=${title}>
                        <div>
                          <b>${title}</b>
                          <small>${meta}</small>
                        </div>
                        <span>${state}</span>
                      </div>
                    `
                  )}
                </div>
              </div>
            `}
            ${demoTab === "reports" && html`
              <div className="reports-demo">
                <div className="report-stats">
                  ${demoTabs.reports.stats.map(
                    ([value, label]) => html`
                      <article className="report-stat" key=${label}>
                        <strong>${value}</strong>
                        <span>${label}</span>
                      </article>
                    `
                  )}
                </div>
                <div className="quote-grid">
                  ${demoTabs.reports.quotes.map(
                    (quote) => html`
                      <article className="quote-card" key=${quote.name}>
                        <div className="quote-mark">❞</div>
                        <div className="quote-stars">★★★★★</div>
                        <p>${quote.text}</p>
                        <footer className="quote-author">
                          <span>${quote.initials}</span>
                          <div>
                            <b>${quote.name}</b>
                            <small>${quote.role}</small>
                          </div>
                        </footer>
                      </article>
                    `
                  )}
                </div>
              </div>
            `}
          </div>
        </section>

        <section className="testimonials-section">
          <div className="section-head section-head-centered">
            <p className="eyebrow">Temoignages</p>
            <h2>
              Ils ont transforme leur institution.
              <span>Avec des resultats mesurables.</span>
            </h2>
          </div>
          <div className="report-stats report-stats-large">
            ${demoTabs.reports.stats.map(
              ([value, label]) => html`
                <article className="report-stat" key=${label}>
                  <strong>${value}</strong>
                  <span>${label}</span>
                </article>
              `
            )}
          </div>
          <div className="quote-grid quote-grid-large">
            ${demoTabs.reports.quotes.map(
              (quote) => html`
                <article className="quote-card" key=${quote.name}>
                  <div className="quote-mark">❞</div>
                  <div className="quote-stars">★★★★★</div>
                  <p>${quote.text}</p>
                  <footer className="quote-author">
                    <span>${quote.initials}</span>
                    <div>
                      <b>${quote.name}</b>
                      <small>${quote.role}</small>
                    </div>
                  </footer>
                </article>
              `
            )}
          </div>
        </section>

        <section className="why-section">
          <div className="why-layout">
            <div className="why-copy">
              <p className="eyebrow">Pourquoi MwangazaMail</p>
              <h2>
                Conçu pour l'Afrique.
                <span>Performant pour le monde.</span>
              </h2>
              <p>
                Contrairement aux solutions occidentales inadaptees, MwangazaMail est pense pour les realites institutionnelles
                africaines — langues locales, connectivite variable, contextes administratifs specifiques.
              </p>
              <div className="why-compare">
                ${whyComparisons.map(
                  ([icon, label, tone]) => html`
                    <article className=${`why-compare-row is-${tone}`} key=${label}>
                      <span>${icon}</span>
                      <p>${label}</p>
                    </article>
                  `
                )}
              </div>
            </div>
            <div className="why-grid">
              ${whyCards.map(
                ([icon, title, copy]) => html`
                  <article className="why-card" key=${title}>
                    <div className="why-icon">${icon}</div>
                    <h3>${title}</h3>
                    <p>${copy}</p>
                  </article>
                `
              )}
            </div>
          </div>
        </section>

        <section className="impact-banner">
          <p className="impact-eyebrow">Pret a passer a l'action ?</p>
          <h2>Votre institution mérite un outil a la hauteur</h2>
          <p>Plus de 50 institutions font confiance a MwangazaMail. Rejoignez-les avec une demo gratuite personnalisee.</p>
          <div className="impact-actions">
            <a className="btn btn-light btn-large" href="#contact">Réserver ma démo gratuite</a>
            <a className="btn btn-ghost-light btn-large" href="#tarification">Voir les tarifs →</a>
          </div>
          <small>✓ Gratuit · ✓ Sans engagement · ✓ Reponse sous 24h</small>
        </section>

        <section className="pricing pricing-detailed" id="tarification">
          <div className="section-head section-head-centered">
            <p className="eyebrow">Tarification</p>
            <h2>
              Des prix transparents,
              <span>sans mauvaises surprises</span>
            </h2>
            <p>Tarification adaptee au contexte economique de la RDC. Annulation possible a tout moment.</p>
          </div>

          <div className="pricing-grid pricing-grid-detailed">
            ${pricing.map((plan) => html`
              <article className=${plan.featured ? "featured pricing-plan" : "pricing-plan"} key=${plan.name}>
                ${plan.badge && html`<div className="pricing-badge">${plan.badge}</div>`}
                <div className="pricing-head">
                  <div className="pricing-icon">${plan.icon}</div>
                  <div>
                    <h3>${plan.name}</h3>
                    <p className="pricing-subtitle">${plan.subtitle}</p>
                  </div>
                </div>
                <p className="price"><strong>${plan.price}</strong> ${plan.note}</p>
                <p className="pricing-hint">${plan.hint}</p>
                <ul>
                  ${plan.bullets.map((bullet) => html`<li key=${bullet}>✓ ${bullet}</li>`)}
                </ul>
                <a className=${plan.featured ? "btn btn-solid" : "btn btn-outline"} href="#contact">${plan.cta}</a>
              </article>
            `)}
          </div>
          <p className="pricing-footnote">Besoin d'un deploiement national ou d'un contrat ministeriel ? <a href="#contact">Contactez-nous pour un devis personnalise →</a></p>
        </section>

        <section className="faq" id="faq">
          <div className="section-head section-head-centered">
            <p className="eyebrow">FAQ</p>
            <h2>Questions frequentes</h2>
          </div>
          <div className="faq-grid">
            ${faqItems.map(([question, answer], index) => html`
              <details open=${index === 0 ? true : undefined} key=${question}>
                <summary>${question}</summary>
                <p>${answer}</p>
              </details>
            `)}
          </div>
          <p className="faq-footnote">Une autre question ? <a href="mailto:contact@mwangazamail.cd">Ecrivez-nous directement →</a></p>
        </section>

        <section className="start-now" id="contact">
          <div className="section-head section-head-centered">
            <p className="eyebrow">Commencer maintenant</p>
            <h2>
              Transformez votre institution
              <span>dès aujourd'hui</span>
            </h2>
            <p>Demo gratuite · Sans engagement · Reponse sous 24h</p>
          </div>
          <div className="contact-layout">
            <aside className="contact-includes">
              <h3>La demo comprend</h3>
              <ul>
                <li>Presentation complete de la plateforme</li>
                <li>Bot WhatsApp en conditions reelles</li>
                <li>Dashboard de moderation en live</li>
                <li>Q&A avec l'equipe technique</li>
                <li>Devis personnalise sous 24h</li>
              </ul>
              <article className="contact-direct">
                <h4>Contact direct</h4>
                <p>contact@mwangazamail.cd</p>
              </article>
            </aside>

            <form className="contact-form" onSubmit=${(event) => event.preventDefault()}>
              <div className="contact-grid">
                <label>
                  Nom complet *
                  <input type="text" placeholder="Dr. Jean Kabila" />
                </label>
                <label>
                  Institution *
                  <input type="text" placeholder="Ministere des Finances" />
                </label>
                <label>
                  Email *
                  <input type="email" placeholder="jean@institution.cd" />
                </label>
                <label>
                  WhatsApp
                  <input type="tel" placeholder="+243 8XX XXX XXX" />
                </label>
                <label className="full">
                  Message (optionnel)
                  <textarea rows="4" placeholder="Decrivez vos besoins ou votre contexte..."></textarea>
                </label>
              </div>
              <button className="btn btn-solid btn-large" type="submit">Demander ma demo gratuite →</button>
              <small>✓ Gratuit · ✓ Sans engagement · ✓ Reponse sous 24h</small>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <a className="brand" href="#hero">
              <span className="brand-mark"></span>
              <span className="brand-text">MwangazaMail</span>
            </a>
            <p>La premiere plateforme SaaS de signalement anonyme via WhatsApp, conçue pour les institutions africaines.</p>
            <span className="footer-status">• Systeme operationnel — RDC 2026</span>
            <div className="footer-socials">
              ${footerSocials.map((social) => html`<a href="#" key=${social} aria-label=${`social-${social}`}>${social}</a>`)}
            </div>
          </div>
          ${Object.entries(footerColumns).map(([title, links]) => html`
            <div className="footer-col" key=${title}>
              <h4>${title}</h4>
              <ul>
                ${links.map((link) => html`<li key=${link}><a href="#">${link}</a></li>`)}
              </ul>
            </div>
          `)}
        </div>
        <div className="footer-bottom">
          <p>© 2026 MwangazaMail. Tous droits reserves.</p>
          <p>
            ✉ contact@mwangazamail.cd · Propulsé par David B. — Pour la transparence en RDC ·
            <a href="https://ynk-techusa.com/" target="_blank" rel="noreferrer">Site officiel YNK-TechUSA</a>
          </p>
        </div>
      </footer>

      <${SandboxNotice} isOpen=${sandboxOpen} onClose=${closeSandboxNotice} />

      <${CookieBanner}
        visible=${cookieVisible}
        onAccept=${() => saveCookieConsent("accepted")}
        onReject=${() => saveCookieConsent("rejected")}
      />

      <${LoginPortal} isOpen=${loginOpen} onClose=${() => setLoginOpen(false)} onSubmit=${goToAdmin} />
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
