import { query } from "../src/db.js";

const incident = await query(
  "select incident_ref, inserted_at, ingestion_source from fact_incident where ingestion_source = 'whatsapp_webhook' order by inserted_at desc limit 1"
);

const audit = await query(
  "select table_name, action_type, record_id, changed_at from audit_trail where table_name in ('fact_incident','whatsapp_message') order by changed_at desc limit 4"
);

console.log(
  JSON.stringify(
    {
      lastWhatsappIncident: incident.rows[0] || null,
      recentAudit: audit.rows
    },
    null,
    2
  )
);
