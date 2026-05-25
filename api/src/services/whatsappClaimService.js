import { config } from "../config.js";
import { query } from "../db.js";
import { writeAudit } from "./auditService.js";

const VALID_SEVERITIES = new Set(["faible", "moyen", "eleve", "critique"]);
const DEFAULT_STATUS = "nouveau";

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
  const statusKey = await ensureDimension("dim_status", "status_key", "status_name", DEFAULT_STATUS);
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
      ingestion_source,
      inserted_at,
      updated_at
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp, current_timestamp)`,
    [incidentRef, dateKey, categoryKey, statusKey, severityKey, institutionKey, locationKey, "whatsapp_webhook"]
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
  const claim = await extractClaimWithOpenAI(message.text || "");
  const { incidentRef } = await saveClaimToRedshift({
    from: message.from,
    messageId: message.messageId,
    messageText: message.text,
    claim
  });

  const responseText = [
    "Merci. Votre signalement a bien ete recu.",
    `Reference: ${incidentRef}`,
    "Conservez cette reference pour le suivi."
  ].join("\n");

  return { referenceNumber: incidentRef, responseText, claim };
}

export async function sendWhatsAppText(to, bodyText) {
  if (!config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    throw new Error("WhatsApp credentials are missing (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");
  }

  const url = `https://graph.facebook.com/${config.whatsapp.graphApiVersion}/${config.whatsapp.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
