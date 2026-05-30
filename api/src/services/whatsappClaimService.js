import { config } from "../config.js";
import { query } from "../db.js";
import { writeAudit } from "./auditService.js";

const VALID_SEVERITIES = new Set(["faible", "moyen", "eleve", "critique"]);
const DEFAULT_STATUS = "nouveau";
const SESSION_TABLE_NAME = "whatsapp_session";
const SESSION_ACTION_TYPE = "state";
const SESSION_VERSION = 1;
const MAX_OFF_TOPIC_WARNINGS = 2;
const REQUIRED_FIELDS = ["institution", "city", "description"];
const OPTIONAL_FIELDS_DEFAULTS = { reporterReference: "Non fourni", statut: "nouveau", revision: "0" };

function normalizeText(value, fallback) {
  const clean = String(value || "").trim();
  return clean || fallback;
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
    warnings: 0,
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
    warnings: Number(session.warnings || 0),
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

  return {
    reporterReference: normalizeReference(merged.reporterReference),
    institution: normalizeText(merged.institution, ""),
    city: normalizeText(merged.city, ""),
    description: normalizeText(merged.description, ""),
    category: normalizeText(merged.category, ""),
    severity: normalizeSeverity(merged.severity),
    statut: normalizeText(merged.statut, "nouveau"),
    revision: normalizeText(merged.revision, "0")
  };
}

function isRestartMessage(text) {
  const clean = normalizeText(text, "").toLowerCase();
  return ["restart", "reprendre", "nouveau", "start"].includes(clean);
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

async function saveClaimToRedshift({ from, messageId, messageText, claim }) {
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
    [incidentRef, dateKey, categoryKey, statusKey, severityKey, institutionKey, locationKey, claim.description || "", claim.reporterReference || "Non fourni", claim.revision || 0, "whatsapp_webhook"]
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

function fallbackBrainResponse({ messageText, session }) {
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
      assistantMessage: "Merci. Je finalise votre signalement.",
      extracted: draft,
      missingFields: []
    };
  }

  const nextField = missing[0];
  const prompts = {
    reporterReference: "Quel est votre numero de reference (si disponible) ?",
    institution: "Quelle institution est concernee ?",
    city: "Dans quelle ville l'incident a eu lieu ?",
    description: "Merci de decrire precisement l'incident."
  };

  return {
    isOnTopic: true,
    shouldDiscontinue: false,
    warningReason: "",
    assistantMessage: prompts[nextField] || "Merci, pouvez-vous donner plus de details sur l'incident ?",
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
    "Conduct a natural conversation in French to collect incident details.",
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
    "Also infer category and severity (faible|moyen|eleve|critique) from context when possible.",
    "Ask for one or two fields at a time in a conversational way. When all required fields are collected, set missingFields to [].",
    "Respond with JSON only and no markdown.",
    "Schema:",
    '{"isOnTopic":true,"shouldDiscontinue":false,"warningReason":"","assistantMessage":"","extracted":{"reporterReference":"","institution":"","city":"","description":"","category":"","severity":"moyen","statut":"nouveau","revision":"0"},"missingFields":["institution","city","description"]}'
  ].join("\n");

  const userPayload = {
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
    assistantMessage: normalizeText(parsed.assistantMessage, "Merci. Continuez avec les details de l'incident."),
    extracted: mergeDraft(session.incidentDraft, parsed.extracted || {}),
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : []
  };
}

function buildCaseCompletedMessage(incidentRef) {
  return [
    "Merci. Votre signalement est enregistre.",
    `Reference Mwangaza: ${incidentRef}`,
    "Conservez cette reference pour le suivi.",
    "Pour un nouveau cas, envoyez RESTART."
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

  if (session.status === "blocked" && !isRestartMessage(text)) {
    return {
      referenceNumber: "SESSION-BLOCKED",
      responseText: "Cette conversation a ete interrompue pour hors-sujet. Envoyez RESTART pour declarer un incident.",
      claim: null
    };
  }

  if (isRestartMessage(text)) {
    session = buildDefaultSession(message.from);
    addHistory(session, "assistant", "Session redemarree");
    await saveConversationSession(message.from, session);

    return {
      referenceNumber: "SESSION-RESTARTED",
      responseText: "Session redemarree. Donnez votre numero de reference (si disponible), l'institution, la ville et la description de l'incident.",
      claim: null
    };
  }

  addHistory(session, "user", text);

  const brain = await runConversationBrain({ messageText: text, session });
  session.incidentDraft = mergeDraft(session.incidentDraft, brain.extracted || {});

  if (!brain.isOnTopic || brain.shouldDiscontinue) {
    session.warnings += 1;

    if (session.warnings >= MAX_OFF_TOPIC_WARNINGS) {
      session.status = "blocked";
      addHistory(session, "assistant", "Conversation interrompue apres hors-sujet.");
      await saveConversationSession(message.from, session);

      return {
        referenceNumber: "SESSION-DISCONTINUED",
        responseText: "Avertissement: cette conversation est reservee a la declaration d'incidents. Discussion interrompue. Envoyez RESTART pour recommencer.",
        claim: null
      };
    }

    const warningText = brain.warningReason
      ? `Avertissement: ${brain.warningReason}`
      : "Avertissement: restons sur la declaration d'incident uniquement.";

    const responseText = `${warningText}\nVeuillez fournir les details du cas: reference, institution, ville, description.`;
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
      "Merci. Pouvez-vous completer les informations manquantes ?"
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
    category: normalizeText(session.incidentDraft.category, "Autre"),
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
    claim
  });

  session.status = "completed";
  session.completed = true;
  addHistory(session, "assistant", `Cas enregistre sous ${incidentRef}`);
  await saveConversationSession(message.from, session);

  return { referenceNumber: incidentRef, responseText: buildCaseCompletedMessage(incidentRef), claim };
}

export async function sendWhatsAppText(to, bodyText) {
  if (!config.whatsapp.phoneNumberId) {
    throw new Error("WhatsApp phone number ID is not configured (WHATSAPP_PHONE_NUMBER_ID)");
  }

  // AWS Social Messaging requires E.164 format with + prefix
  const destination = to.startsWith("+") ? to : `+${to}`;

  const { SocialMessagingClient, SendWhatsAppMessageCommand } = await import("@aws-sdk/client-socialmessaging");
  const client = new SocialMessagingClient({ region: config.whatsapp.region });

  const command = new SendWhatsAppMessageCommand({
    originationPhoneNumberId: config.whatsapp.phoneNumberId,
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
