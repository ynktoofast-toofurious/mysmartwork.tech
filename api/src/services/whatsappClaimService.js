import { config } from "../config.js";
import { query } from "../db.js";
import { writeAudit } from "./auditService.js";

const VALID_SEVERITIES = new Set(["faible", "moyen", "eleve", "critique"]);
const DEFAULT_STATUS = "nouveau";
const SESSION_TABLE_NAME = "whatsapp_session";
const SESSION_ACTION_TYPE = "state";
const SESSION_VERSION = 1;
const MAX_OFF_TOPIC_WARNINGS = 2;
const MAX_SOFT_REDIRECTS = 2;
const REQUIRED_FIELDS = ["institution", "city", "description"];
const OPTIONAL_FIELDS_DEFAULTS = { reporterReference: "Non fourni", statut: "nouveau", revision: "0" };

const SUPPORTED_LANGUAGES = new Set(["fr", "en", "ln", "sw"]);

const I18N = {
  fr: {
    thanksDetails: "Merci pour les details.",
    privacyReassurance: "Rassurez-vous: votre signalement est traite de facon anonyme, chiffre, et votre identite n'est pas revelee.",
    finalizing: "Merci. Je finalise votre signalement.",
    askReference: "Quel est votre numero de reference (si disponible) ?",
    askInstitution: "Quelle institution est concernee ?",
    askCity: "Dans quelle ville l'incident a eu lieu ?",
    askDescription: "Merci de decrire precisement l'incident.",
    askMore: "Merci, pouvez-vous donner plus de details sur l'incident ?",
    continueDetails: "Merci. Continuez avec les details de l'incident.",
    blocked: "Cette conversation a ete interrompue pour hors-sujet. Envoyez RESTART pour declarer un incident.",
    restarted: "Session redemarree. Donnez votre numero de reference (si disponible), l'institution, la ville et la description de l'incident.",
    warnedPrefix: "Avertissement",
    warnedDefault: "Avertissement: restons sur la declaration d'incident uniquement.",
    softRedirect: "Je suis la pour vous aider. Dites-moi simplement l'institution, la ville et ce qui s'est passe.",
    warnedDetails: "Veuillez fournir les details du cas: reference, institution, ville, description.",
    discontinued: "Avertissement: cette conversation est reservee a la declaration d'incidents. Discussion interrompue. Envoyez RESTART pour recommencer.",
    missingFallback: "Merci. Pouvez-vous completer les informations manquantes ?",
    completed1: "Merci. Votre signalement est enregistre.",
    completed2: "Reference Mwangaza: {{incidentRef}}",
    completed3: "Rassurez-vous: les informations sont chiffrees et votre identite n'est pas revelee.",
    completed4: "Conservez cette reference pour le suivi.",
    completed5: "Pour un nouveau cas, envoyez RESTART.",
    capReached: "Le volume maximal de messages sur 24h est atteint. Merci de reessayer plus tard."
  },
  en: {
    thanksDetails: "Thank you for the details.",
    privacyReassurance: "Please be assured: your report is handled anonymously, encrypted, and your identity is not disclosed.",
    finalizing: "Thank you. I am finalizing your report.",
    askReference: "What is your reference number (if available)?",
    askInstitution: "Which institution is involved?",
    askCity: "In which city did the incident happen?",
    askDescription: "Please describe the incident clearly.",
    askMore: "Thanks, can you share more details about the incident?",
    continueDetails: "Thank you. Please continue with incident details.",
    blocked: "This conversation was stopped for off-topic content. Send RESTART to report an incident.",
    restarted: "Session restarted. Please provide your reference number (if available), institution, city, and incident description.",
    warnedPrefix: "Warning",
    warnedDefault: "Warning: please stay focused on incident reporting only.",
    softRedirect: "I am here to help. Just tell me the institution, city, and what happened.",
    warnedDetails: "Please provide case details: reference, institution, city, description.",
    discontinued: "Warning: this channel is only for incident reporting. Conversation stopped. Send RESTART to start again.",
    missingFallback: "Thank you. Could you complete the missing information?",
    completed1: "Thank you. Your report has been recorded.",
    completed2: "Mwangaza reference: {{incidentRef}}",
    completed3: "Please be assured: information is encrypted and your identity is not disclosed.",
    completed4: "Keep this reference for follow-up.",
    completed5: "For a new case, send RESTART.",
    capReached: "The 24-hour message capacity has been reached. Please try again later."
  },
  ln: {
    thanksDetails: "Matondi mpo na makambo opesi.",
    privacyReassurance: "Tika motema: likambo na yo ezali kosalema na ndenge ya kobomba nkombo, ebatelami, mpe bomoto na yo ekobimisama te.",
    finalizing: "Matondi. Nazali kosukisa rapport na yo.",
    askReference: "Ozali na nimero ya reference? Soki ezali, pesa yango.",
    askInstitution: "Institution nini etali likambo oyo?",
    askCity: "Likambo esalemaki na engumba nini?",
    askDescription: "Svp limbola likambo yango malamu.",
    askMore: "Matondi, okoki kobakisa makambo mosusu na likambo oyo?",
    continueDetails: "Matondi. Boba na makambo ya likambo oyo.",
    blocked: "Lisolo oyo etelemaki mpo ezalaki libanda ya sujet. Tinda RESTART mpo na kosakola incident.",
    restarted: "Session ebandi lisusu. Pesa reference (soki ezali), institution, engumba, mpe ndimbola ya incident.",
    warnedPrefix: "Likebisi",
    warnedDefault: "Likebisi: tosengeli kaka na makambo ya kosakola incident.",
    softRedirect: "Nazali awa mpo na kosunga yo. Pesa kaka institution, engumba, mpe nini esalemaki.",
    warnedDetails: "Svp pesa makambo ya cas: reference, institution, engumba, ndimbola.",
    discontinued: "Likebisi: canal oyo ezali kaka mpo na kosakola incident. Lisolo etelemaki. Tinda RESTART mpo na kobanda lisusu.",
    missingFallback: "Matondi. Okoki kotondisa makambo oyo ezangi?",
    completed1: "Matondi. Rapport na yo ekomami.",
    completed2: "Reference ya Mwangaza: {{incidentRef}}",
    completed3: "Tika motema: makambo nyonso ebatelami mpe bomoto na yo ekobimisama te.",
    completed4: "Bomba reference oyo mpo na suivi.",
    completed5: "Mpo na cas ya sika, tinda RESTART.",
    capReached: "Motuya ya ba message na kati ya ngonga 24 ekoki. Meka lisusu sima."
  },
  sw: {
    thanksDetails: "Asante kwa maelezo.",
    privacyReassurance: "Usijali: taarifa yako inashughulikiwa kwa siri, imefichwa, na utambulisho wako hautafichuliwa.",
    finalizing: "Asante. Ninakamilisha taarifa yako.",
    askReference: "Namba yako ya rejea ni ipi (ikiwa unayo)?",
    askInstitution: "Ni taasisi gani inahusika?",
    askCity: "Tukio lilitokea mji gani?",
    askDescription: "Tafadhali eleza tukio kwa uwazi.",
    askMore: "Asante, unaweza kutoa maelezo zaidi kuhusu tukio?",
    continueDetails: "Asante. Tafadhali endelea na maelezo ya tukio.",
    blocked: "Mazungumzo yamesitishwa kwa kuwa nje ya mada. Tuma RESTART kuripoti tukio.",
    restarted: "Kikao kimeanza upya. Toa namba ya rejea (ikiwa unayo), taasisi, mji, na maelezo ya tukio.",
    warnedPrefix: "Onyo",
    warnedDefault: "Onyo: tafadhali baki kwenye kuripoti matukio pekee.",
    softRedirect: "Niko hapa kukusaidia. Tafadhali niambie taasisi, mji, na kilichotokea.",
    warnedDetails: "Tafadhali toa maelezo ya kesi: rejea, taasisi, mji, maelezo.",
    discontinued: "Onyo: njia hii ni kwa kuripoti matukio tu. Mazungumzo yamesitishwa. Tuma RESTART kuanza tena.",
    missingFallback: "Asante. Unaweza kukamilisha taarifa zinazokosekana?",
    completed1: "Asante. Taarifa yako imesajiliwa.",
    completed2: "Namba ya Mwangaza: {{incidentRef}}",
    completed3: "Usijali: taarifa zimefichwa na utambulisho wako hautafichuliwa.",
    completed4: "Hifadhi rejea hii kwa ufuatiliaji.",
    completed5: "Kwa kesi mpya, tuma RESTART.",
    capReached: "Kikomo cha ujumbe wa saa 24 kimefikiwa. Tafadhali jaribu tena baadaye."
  }
};

function normalizeText(value, fallback) {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function pickLanguage(code) {
  const clean = normalizeText(code, "fr").toLowerCase();
  return SUPPORTED_LANGUAGES.has(clean) ? clean : "fr";
}

function t(language, key, vars = {}) {
  const lang = pickLanguage(language);
  const dict = I18N[lang] || I18N.fr;
  let value = dict[key] || I18N.fr[key] || "";
  for (const [name, content] of Object.entries(vars)) {
    value = value.replaceAll(`{{${name}}}`, String(content));
  }
  return value;
}

function detectLanguage(text, fallback = "fr") {
  const clean = normalizeText(text, "").toLowerCase();
  if (!clean) {
    return pickLanguage(fallback);
  }

  const score = { fr: 0, en: 0, ln: 0, sw: 0 };

  const apply = (lang, regex) => {
    if (regex.test(clean)) score[lang] += 1;
  };

  apply("fr", /\b(bonjour|merci|ville|institution|incident|reference|signaler|decrire|s'il|svp)\b/);
  apply("en", /\b(hello|please|thanks|incident|report|city|institution|reference|describe|help)\b/);
  apply("ln", /\b(mbote|matondi|nalingi|likambo|engumba|institution|nazali|pesa|sango)\b/);
  apply("sw", /\b(habari|asante|tafadhali|tukio|taasisi|mji|rejea|eleza|namba)\b/);

  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] === 0) {
    return pickLanguage(fallback);
  }
  return pickLanguage(best[0]);
}

function normalizeSeverity(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (VALID_SEVERITIES.has(clean)) {
    return clean;
  }
  return "moyen";
}

function normalizeReference(value) {
  const clean = String(value || "").trim();
  if (!clean) {
    return "Non fourni";
  }
  return clean.slice(0, 120);
}

function inferCategoryFromText(text) {
  const clean = normalizeText(text, "").toLowerCase();
  if (!clean) {
    return "Autre";
  }

  if (/(corrupt|pot[- ]?de[- ]?vin|bakchich|bribe|commission)/.test(clean)) {
    return "Corruption";
  }
  if (/(detourn|vol|embezz|dispar|faux paiement)/.test(clean)) {
    return "Detournement";
  }
  if (/(abus|menace|pression|intimid|autorite)/.test(clean)) {
    return "Abus d'autorite";
  }
  if (/(surfact|facture|majoration|double paiement|tarif)/.test(clean)) {
    return "Surfacturation";
  }
  if (/(fraud|escro|arnaque|falsif|irregularit)/.test(clean)) {
    return "Fraude";
  }

  return "Autre";
}

function dateKeyFromDate(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${yyyy}${mm}${dd}`);
}

function parseJsonFromModelText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : raw;

  try {
    return JSON.parse(candidate);
  } catch (_error) {
    return null;
  }
}

function buildDefaultSession(from) {
  return {
    version: SESSION_VERSION,
    phone: from,
    status: "active",
    language: "fr",
    warnings: 0,
    softRedirects: 0,
    completed: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    incidentDraft: {
      reporterReference: "",
      institution: "",
      city: "",
      description: "",
      category: "",
      severity: "moyen",
      statut: "nouveau",
      revision: "0"
    },
    history: []
  };
}

function addHistory(session, role, text) {
  const trimmed = normalizeText(text, "").slice(0, 1200);
  if (!trimmed) {
    return;
  }

  session.history.push({ role, text: trimmed, at: new Date().toISOString() });
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
}

function sanitizeSession(session, from) {
  if (!session || typeof session !== "object") {
    return buildDefaultSession(from);
  }

  const safe = {
    ...buildDefaultSession(from),
    ...session,
    phone: from,
    language: pickLanguage(session.language || "fr"),
    warnings: Number(session.warnings || 0),
    softRedirects: Number(session.softRedirects || 0),
    completed: Boolean(session.completed)
  };

  safe.incidentDraft = {
    ...buildDefaultSession(from).incidentDraft,
    ...(session.incidentDraft || {})
  };

  safe.history = Array.isArray(session.history) ? session.history.slice(-20) : [];
  return safe;
}

function missingFieldsFromDraft(draft) {
  return REQUIRED_FIELDS.filter((field) => !normalizeText(draft?.[field], ""));
}

function mergeDraft(baseDraft, patchDraft) {
  const merged = {
    ...baseDraft,
    ...patchDraft
  };

  // Keep previously collected values when model returns empty strings on later turns.
  const keepBaseWhenEmpty = (nextValue, baseValue) => {
    const nextClean = normalizeText(nextValue, "");
    return nextClean || normalizeText(baseValue, "");
  };

  return {
    reporterReference: normalizeReference(keepBaseWhenEmpty(merged.reporterReference, baseDraft?.reporterReference)),
    institution: keepBaseWhenEmpty(merged.institution, baseDraft?.institution),
    city: keepBaseWhenEmpty(merged.city, baseDraft?.city),
    description: keepBaseWhenEmpty(merged.description, baseDraft?.description),
    category: keepBaseWhenEmpty(merged.category, baseDraft?.category),
    severity: normalizeSeverity(keepBaseWhenEmpty(merged.severity, baseDraft?.severity)),
    statut: normalizeText(keepBaseWhenEmpty(merged.statut, baseDraft?.statut), "nouveau"),
    revision: normalizeText(keepBaseWhenEmpty(merged.revision, baseDraft?.revision), "0")
  };
}

function isRestartMessage(text) {
  const clean = normalizeText(text, "").toLowerCase();
  return ["restart", "reprendre", "nouveau", "start", "new", "anzisha", "mpya", "banda lisusu"].includes(clean);
}

function isPrivacyConcernMessage(text) {
  const clean = normalizeText(text, "").toLowerCase();
  if (!clean) {
    return false;
  }

  return /(peur|afraid|identit|anonym|revele|revel|confidenti|secur|safe|protege|danger|risque|kobanga|siri|usalama|hofu|utambulisho)/.test(clean);
}

function isGreetingOrSmallTalk(text) {
  const clean = normalizeText(text, "").toLowerCase();
  if (!clean) return false;
  return /(\b(bonjour|salut|coucou|hello|hi|hey|habari|jambo|mambo|mbote|sasa|yo)\b|how are you|ca va|comment ca va|za nini|wapi)/.test(clean);
}

function withPrivacyReassurance(messageText, language) {
  const base = normalizeText(messageText, t(language, "thanksDetails"));
  const reassurance = t(language, "privacyReassurance");

  if (base.toLowerCase().includes(reassurance.toLowerCase().slice(0, 24))) {
    return base;
  }

  return `${reassurance}\n${base}`;
}

async function ensureDateKey() {
  const today = new Date();
  const dateKey = dateKeyFromDate(today);
  const fullDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  const existing = await query("select date_key from dim_date where date_key = $1", [dateKey]);
  if (!existing.rowCount) {
    await query(
      `insert into dim_date (date_key, full_date, year, month, day, month_name)
       values ($1, $2, $3, $4, $5, $6)`,
      [dateKey, fullDate, today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate(), today.toLocaleString("en-US", { month: "long", timeZone: "UTC" })]
    );
  }

  return dateKey;
}

async function ensureDimension(table, idColumn, nameColumn, value) {
  const cleanValue = normalizeText(value, "Autre");
  const existing = await query(`select ${idColumn} from ${table} where ${nameColumn} = $1`, [cleanValue]);
  if (existing.rowCount) {
    return existing.rows[0][idColumn];
  }

  await query(`insert into ${table} (${nameColumn}) values ($1)`, [cleanValue]);
  const created = await query(`select ${idColumn} from ${table} where ${nameColumn} = $1`, [cleanValue]);
  return created.rows[0][idColumn];
}

async function ensureLocation(city) {
  const cleanCity = normalizeText(city, "Kinshasa");
  const existing = await query("select location_key from dim_location where city = $1", [cleanCity]);
  if (existing.rowCount) {
    return existing.rows[0].location_key;
  }

  await query("insert into dim_location (city) values ($1)", [cleanCity]);
  const created = await query("select location_key from dim_location where city = $1", [cleanCity]);
  return created.rows[0].location_key;
}

async function generateIncidentRef() {
  const stamp = new Date();
  const y = stamp.getUTCFullYear();
  const m = String(stamp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(stamp.getUTCDate()).padStart(2, "0");

  for (let i = 0; i < 8; i += 1) {
    const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const ref = `WM-${y}${m}${d}-${suffix}`;
    const exists = await query("select 1 from fact_incident where incident_ref = $1", [ref]);
    if (!exists.rowCount) {
      return ref;
    }
  }

  throw new Error("Unable to generate unique reference number");
}

function fallbackClaimExtraction(messageText) {
  return {
    category: "Autre",
    institution: "WhatsApp Intake",
    city: "Kinshasa",
    severity: "moyen",
    summary: normalizeText(messageText, "Signalement recu via WhatsApp")
  };
}

async function extractClaimWithOpenAI(messageText) {
  if (!config.openai.apiKey) {
    return fallbackClaimExtraction(messageText);
  }

  const prompt = [
    "Extract a fraud/claim report from user text.",
    "Return only valid JSON with keys:",
    "category, institution, city, severity, summary",
    "severity must be one of: faible, moyen, eleve, critique.",
    "Use French values when possible.",
    `User text: ${messageText}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You extract structured claim data from WhatsApp text." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = parseJsonFromModelText(content);
  if (!parsed) {
    return fallbackClaimExtraction(messageText);
  }

  return {
    category: normalizeText(parsed.category, "Autre"),
    institution: normalizeText(parsed.institution, "WhatsApp Intake"),
    city: normalizeText(parsed.city, "Kinshasa"),
    severity: normalizeSeverity(parsed.severity),
    summary: normalizeText(parsed.summary, messageText)
  };
}

async function saveClaimToRedshift({ from, messageId, messageText, claim, ingestionSource }) {
  const dateKey = await ensureDateKey();
  const categoryKey = await ensureDimension("dim_category", "category_key", "category_name", claim.category);
  const statusKey = await ensureDimension("dim_status", "status_key", "status_name", claim.statut || DEFAULT_STATUS);
  const severityKey = await ensureDimension("dim_severity", "severity_key", "severity_name", claim.severity);
  const institutionKey = await ensureDimension("dim_institution", "institution_key", "institution_name", claim.institution);
  const locationKey = await ensureLocation(claim.city);
  const incidentRef = await generateIncidentRef();

  await query(
    `insert into fact_incident (
      incident_ref,
      date_key,
      category_key,
      status_key,
      severity_key,
      institution_key,
      location_key,
      description,
      reporter_reference,
      revision,
      ingestion_source,
      inserted_at,
      updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, current_timestamp, current_timestamp)`,
    [
      incidentRef,
      dateKey,
      categoryKey,
      statusKey,
      severityKey,
      institutionKey,
      locationKey,
      claim.description || "",
      claim.reporterReference || "Non fourni",
      claim.revision || 0,
      normalizeText(ingestionSource, "whatsapp_number")
    ]
  );

  const inserted = await query("select incident_key from fact_incident where incident_ref = $1", [incidentRef]);
  const incidentKey = inserted.rows[0]?.incident_key;

  await writeAudit({
    tableName: "fact_incident",
    recordId: incidentKey || incidentRef,
    actionType: "create",
    changedBy: `whatsapp:${from}`,
    oldValue: "",
    newValue: JSON.stringify({
      incidentRef,
      messageId,
      from,
      summary: claim.summary,
      reporterReference: claim.reporterReference,
      rawText: messageText,
      claim
    })
  });

  await writeAudit({
    tableName: "whatsapp_message",
    recordId: messageId,
    actionType: "received",
    changedBy: from,
    oldValue: "",
    newValue: JSON.stringify({ incidentRef, from })
  });

  return { incidentRef, incidentKey };
}

async function loadConversationSession(from) {
  const found = await query(
    `select new_value
     from audit_trail
     where table_name = $1
       and action_type = $2
       and record_id = $3
     order by changed_at desc
     limit 1`,
    [SESSION_TABLE_NAME, SESSION_ACTION_TYPE, String(from)]
  );

  if (!found.rowCount) {
    return buildDefaultSession(from);
  }

  const parsed = parseJsonFromModelText(found.rows[0].new_value || "");
  return sanitizeSession(parsed, from);
}

async function saveConversationSession(from, session) {
  const safeSession = sanitizeSession(session, from);
  safeSession.updatedAt = new Date().toISOString();

  await writeAudit({
    tableName: SESSION_TABLE_NAME,
    recordId: from,
    actionType: SESSION_ACTION_TYPE,
    changedBy: `whatsapp:${from}`,
    oldValue: "",
    newValue: JSON.stringify(safeSession)
  });

  return safeSession;
}

async function getRolling24hSessionCount() {
  const result = await query(
    `select count(*)::int as total
     from audit_trail
     where table_name = $1
       and action_type = $2
       and changed_at >= current_timestamp - interval '24 hours'`,
    [SESSION_TABLE_NAME, SESSION_ACTION_TYPE]
  );

  return Number(result.rows?.[0]?.total || 0);
}

function fallbackBrainResponse({ messageText, session }) {
  const language = pickLanguage(session.language || "fr");
  const draft = mergeDraft(session.incidentDraft, {
    description: session.incidentDraft.description || messageText,
    category: session.incidentDraft.category || "Autre",
    severity: session.incidentDraft.severity || "moyen"
  });
  const missing = missingFieldsFromDraft(draft);

  if (!missing.length) {
    return {
      isOnTopic: true,
      shouldDiscontinue: false,
      warningReason: "",
      assistantMessage: t(language, "finalizing"),
      extracted: draft,
      missingFields: []
    };
  }

  const nextField = missing[0];
  const prompts = {
    reporterReference: t(language, "askReference"),
    institution: t(language, "askInstitution"),
    city: t(language, "askCity"),
    description: t(language, "askDescription")
  };

  return {
    isOnTopic: true,
    shouldDiscontinue: false,
    warningReason: "",
    assistantMessage: prompts[nextField] || t(language, "askMore"),
    extracted: draft,
    missingFields: missing
  };
}

async function runConversationBrain({ messageText, session }) {
  if (!config.openai.apiKey) {
    return fallbackBrainResponse({ messageText, session });
  }

  const systemPrompt = [
    "You are a WhatsApp incident intake assistant for fraud/claim cases in DRC.",
    "Supported user languages: French (fr), English (en), Lingala (ln), Swahili (sw).",
    "Always reply in the same language as the latest user message, unless user asks to switch.",
    "Use short, clear, culturally natural wording.",
    "Your ONLY job is to collect: institution, city, description of an incident.",
    "",
    "CRITICAL RULE — isOnTopic:",
    "Set isOnTopic=true for ANY of these (even if the message is incomplete, has typos, or mixes languages):",
    "- User expresses intent to report something (e.g. 'je veux signaler', 'reporter un', 'j ai aucun reference', etc.)",
    "- User provides any part of required info (institution, city, description, reference number)",
    "- User says they have no reference number (treat 'aucun', 'pas de reference', 'no reference' as providing reporterReference=Non fourni)",
    "- Short or fragmented messages that seem related to an incident",
    "Set isOnTopic=false ONLY for messages that are clearly and entirely unrelated (e.g. asking about sports, weather, jokes).",
    "When in doubt, always set isOnTopic=true.",
    "",
    "Required fields: institution, city, description.",
    "Optional fields (use defaults if not provided): reporterReference (default: Non fourni), statut (default: nouveau), revision (default: 0).",
    "If user expresses fear or confidentiality concerns (e.g. fear of exposure, identity reveal), provide a brief reassurance that reports are anonymized and encrypted, then continue collecting missing fields.",
    "Also infer category and severity (faible|moyen|eleve|critique) from context when possible.",
    "Ask for one or two fields at a time in a conversational way. When all required fields are collected, set missingFields to [].",
    "Respond with JSON only and no markdown.",
    "Schema:",
    '{"isOnTopic":true,"shouldDiscontinue":false,"warningReason":"","assistantMessage":"","extracted":{"reporterReference":"","institution":"","city":"","description":"","category":"","severity":"moyen","statut":"nouveau","revision":"0"},"missingFields":["institution","city","description"]}'
  ].join("\n");

  const userPayload = {
    preferredLanguage: pickLanguage(session.language || "fr"),
    currentDraft: session.incidentDraft,
    warningCount: session.warnings,
    recentHistory: session.history.slice(-8),
    userMessage: normalizeText(messageText, "")
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI conversation brain failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = parseJsonFromModelText(content);
  if (!parsed) {
    return fallbackBrainResponse({ messageText, session });
  }

  return {
    isOnTopic: Boolean(parsed.isOnTopic),
    shouldDiscontinue: Boolean(parsed.shouldDiscontinue),
    warningReason: normalizeText(parsed.warningReason, ""),
    assistantMessage: normalizeText(parsed.assistantMessage, t(pickLanguage(session.language || "fr"), "continueDetails")),
    extracted: mergeDraft(session.incidentDraft, parsed.extracted || {}),
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : []
  };
}

function buildCaseCompletedMessage(incidentRef, language) {
  return [
    t(language, "completed1"),
    t(language, "completed2", { incidentRef }),
    t(language, "completed3"),
    t(language, "completed4"),
    t(language, "completed5")
  ].join("\n");
}

export function getIncomingTextMessages(body) {
  const messages = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const incoming = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of incoming) {
        if (message?.type !== "text") {
          continue;
        }
        messages.push({
          messageId: message.id,
          from: message.from,
          text: message.text?.body || "",
          timestamp: message.timestamp
        });
      }
    }
  }

  return messages;
}

export async function wasMessageAlreadyProcessed(messageId) {
  if (!messageId) {
    return false;
  }

  const found = await query(
    `select 1 from audit_trail
     where table_name = 'whatsapp_message'
       and action_type = 'received'
       and record_id = $1
     limit 1`,
    [String(messageId)]
  );

  return Boolean(found.rowCount);
}

export async function processClaimMessage(message) {
  const text = normalizeText(message.text, "");
  let session = await loadConversationSession(message.from);
  session.language = detectLanguage(text, session.language || "fr");

  const dailyLimit = Number(config.whatsapp.dailyMessageLimit || 0);
  const alertThreshold = Number(config.whatsapp.dailyMessageAlertThreshold || 0);
  const rolling24hCount = await getRolling24hSessionCount();

  if (alertThreshold > 0 && rolling24hCount >= alertThreshold) {
    console.warn(`[whatsapp-cap-warning] rolling24h=${rolling24hCount} threshold=${alertThreshold}`);
  }

  if (dailyLimit > 0 && rolling24hCount >= dailyLimit) {
    return {
      referenceNumber: "SESSION-CAP-REACHED",
      responseText: t(session.language, "capReached"),
      claim: null
    };
  }

  // After a completed claim, treat any new incoming text as a new claim session.
  if (session.completed && !isRestartMessage(text)) {
    session = buildDefaultSession(message.from);
  }

  if (session.status === "blocked" && !isRestartMessage(text)) {
    return {
      referenceNumber: "SESSION-BLOCKED",
      responseText: t(session.language, "blocked"),
      claim: null
    };
  }

  if (isRestartMessage(text)) {
    session = buildDefaultSession(message.from);
    addHistory(session, "assistant", "Session redemarree");
    await saveConversationSession(message.from, session);

    return {
      referenceNumber: "SESSION-RESTARTED",
      responseText: t(session.language, "restarted"),
      claim: null
    };
  }

  addHistory(session, "user", text);

  // Allow a brief human interaction before strict off-topic warnings.
  if (isGreetingOrSmallTalk(text) && !normalizeText(session.incidentDraft.description, "")) {
    const friendly = `${normalizeText(text, "")} 👋\n${t(session.language, "softRedirect")}`;
    addHistory(session, "assistant", friendly);
    await saveConversationSession(message.from, session);
    return {
      referenceNumber: "SESSION-HUMAN-REDIRECT",
      responseText: friendly,
      claim: null
    };
  }

  const brain = await runConversationBrain({ messageText: text, session });
  session.incidentDraft = mergeDraft(session.incidentDraft, brain.extracted || {});

  if (!normalizeText(session.incidentDraft.category, "")) {
    const guessedCategory = inferCategoryFromText(`${session.incidentDraft.description || ""} ${text}`);
    session.incidentDraft.category = normalizeText(guessedCategory, "Autre");
  }

  if (isPrivacyConcernMessage(text)) {
    brain.assistantMessage = withPrivacyReassurance(brain.assistantMessage, session.language);
  }

  if (!brain.isOnTopic || brain.shouldDiscontinue) {
    if (session.softRedirects < MAX_SOFT_REDIRECTS) {
      session.softRedirects += 1;
      const softText = t(session.language, "softRedirect");
      addHistory(session, "assistant", softText);
      await saveConversationSession(message.from, session);
      return {
        referenceNumber: "SESSION-SOFT-REDIRECT",
        responseText: softText,
        claim: null
      };
    }

    session.warnings += 1;

    if (session.warnings >= MAX_OFF_TOPIC_WARNINGS) {
      session.status = "blocked";
      addHistory(session, "assistant", "Conversation interrompue apres hors-sujet.");
      await saveConversationSession(message.from, session);

      return {
        referenceNumber: "SESSION-DISCONTINUED",
        responseText: t(session.language, "discontinued"),
        claim: null
      };
    }

    const warningText = brain.warningReason
      ? `${t(session.language, "warnedPrefix")}: ${brain.warningReason}`
      : t(session.language, "warnedDefault");

    const responseText = `${warningText}\n${t(session.language, "warnedDetails")}`;
    addHistory(session, "assistant", responseText);
    await saveConversationSession(message.from, session);

    return {
      referenceNumber: "SESSION-WARNED",
      responseText,
      claim: null
    };
  }

  const missing = missingFieldsFromDraft(session.incidentDraft);
  if (missing.length) {
    const followUp = normalizeText(
      brain.assistantMessage,
      t(session.language, "missingFallback")
    );

    addHistory(session, "assistant", followUp);
    await saveConversationSession(message.from, session);

    return {
      referenceNumber: "SESSION-IN-PROGRESS",
      responseText: followUp,
      claim: null
    };
  }

  const claim = {
    category: normalizeText(session.incidentDraft.category, inferCategoryFromText(session.incidentDraft.description || text)),
    institution: normalizeText(session.incidentDraft.institution, "WhatsApp Intake"),
    city: normalizeText(session.incidentDraft.city, "Kinshasa"),
    severity: normalizeSeverity(session.incidentDraft.severity),
    description: normalizeText(session.incidentDraft.description, text),
    summary: normalizeText(session.incidentDraft.description, text),
    reporterReference: normalizeReference(session.incidentDraft.reporterReference),
    statut: normalizeText(session.incidentDraft.statut, "nouveau"),
    revision: parseInt(session.incidentDraft.revision || "0", 10) || 0
  };

  const { incidentRef } = await saveClaimToRedshift({
    from: message.from,
    messageId: message.messageId,
    messageText: message.text,
    claim,
    ingestionSource: message.from?.startsWith("web_") ? "demo_ui" : "whatsapp_number"
  });

  session.status = "completed";
  session.completed = true;
  addHistory(session, "assistant", `Cas enregistre sous ${incidentRef}`);
  await saveConversationSession(message.from, session);

  return { referenceNumber: incidentRef, responseText: buildCaseCompletedMessage(incidentRef, session.language), claim };
}

export async function sendWhatsAppText(to, bodyText) {
  if (!config.whatsapp.phoneNumberId) {
    throw new Error("WhatsApp phone number ID is not configured (WHATSAPP_PHONE_NUMBER_ID)");
  }

  // Normalize destination to E.164 (required by both AWS and Meta send APIs).
  const destination = to.startsWith("+") ? to : `+${to}`;
  const originId = String(config.whatsapp.phoneNumberId || "").trim();
  const isAwsPhoneNumberId = originId.startsWith("phone-number-id-") || originId.startsWith("arn:");

  if (isAwsPhoneNumberId) {
    const { SocialMessagingClient, SendWhatsAppMessageCommand } = await import("@aws-sdk/client-socialmessaging");
    const client = new SocialMessagingClient({ region: config.whatsapp.region });

    const command = new SendWhatsAppMessageCommand({
      originationPhoneNumberId: originId,
      message: Buffer.from(
        JSON.stringify({
          messaging_product: "whatsapp",
          to: destination,
          type: "text",
          text: { preview_url: false, body: bodyText }
        })
      ),
      metaApiVersion: config.whatsapp.graphApiVersion
    });

    return client.send(command);
  }

  if (!config.whatsapp.accessToken) {
    throw new Error("WhatsApp access token is not configured (WHATSAPP_ACCESS_TOKEN)");
  }

  const graphVersion = config.whatsapp.graphApiVersion || "v20.0";
  const url = `https://graph.facebook.com/${graphVersion}/${originId}/messages`;
  const metaDestination = destination.replace(/^\+/, "");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: metaDestination,
      type: "text",
      text: { preview_url: false, body: bodyText }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta send failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
