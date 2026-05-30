import { Router } from "express";
import {
  createUser,
  deleteIncident,
  deleteIncidents,
  ensurePasswordColumn,
  getAnalyticsSummary,
  getIncidents,
  getSeoEvents,
  getSubscriptions,
  getUsers,
  logAccessEvent,
  loginUser,
  setUserPassword,
  updateIncident,
  updateUser
} from "../services/adminService.js";
import { listAudit } from "../services/auditService.js";
import { config } from "../config.js";

// Ensure dim_user has password_hash column (idempotent migration).
ensurePasswordColumn().catch((err) => console.error("ensurePasswordColumn:", err));

const router = Router();

router.get("/incidents", async (req, res, next) => {
  try {
    const data = await getIncidents(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.put("/incidents/:incidentKey", async (req, res, next) => {
  try {
    const incident = await updateIncident(req.params.incidentKey, req.body, req.header("x-user-email") || "admin@mwangaza.cd");
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.delete("/incidents/:incidentKey", async (req, res, next) => {
  try {
    const deleted = await deleteIncident(req.params.incidentKey, req.header("x-user-email") || "admin@mwangaza.cd");
    if (!deleted) {
      return res.status(404).json({ message: "Incident not found" });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/incidents/bulk-delete", async (req, res, next) => {
  try {
    const keys = req.body?.incidentKeys;
    const result = await deleteIncidents(keys, req.header("x-user-email") || "admin@mwangaza.cd");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    res.json(await getUsers(req.query));
  } catch (error) {
    next(error);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const user = await createUser(req.body, req.header("x-user-email") || "admin@mwangaza.cd");
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/users/:userKey", async (req, res, next) => {
  try {
    const user = await updateUser(req.params.userKey, req.body, req.header("x-user-email") || "admin@mwangaza.cd");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/subscriptions", async (req, res, next) => {
  try {
    res.json(await getSubscriptions(req.query));
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    res.json(await getAnalyticsSummary());
  } catch (error) {
    next(error);
  }
});

router.get("/seo", async (req, res, next) => {
  try {
    res.json(await getSeoEvents(Number(req.query.limit || 200)));
  } catch (error) {
    next(error);
  }
});

router.post("/track-access", async (req, res, next) => {
  try {
    await logAccessEvent({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-trail", async (req, res, next) => {
  try {
    res.json(await listAudit(Number(req.query.limit || 200)));
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email requis" });
    const user = await loginUser(String(email), String(password || ""));
    if (!user) return res.status(401).json({ message: "Identifiants invalides" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/users/:userKey/set-password", async (req, res, next) => {
  try {
    const { password, email, fullName } = req.body || {};
    const result = await setUserPassword(
      req.params.userKey,
      password,
      req.header("x-user-email") || "admin@mwangaza.cd",
      email,
      fullName
    );
    if (!result) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ ok: true });
  } catch (error) {
    const message = error?.message || "Impossible de mettre a jour le mot de passe";
    const status = String(message).includes("au moins 6 caracteres") ? 400 : 500;
    res.status(status).json({ message });
  }
});

router.get("/whatsapp-messages", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 500);
    const result = await query(
      `select changed_at, changed_by as sender, new_value, action_type
       from audit_trail
       where table_name in ('whatsapp_message', 'whatsapp_session')
       order by changed_at desc
       limit $1`,
      [limit]
    );
    const rows = (result.rows || []).map((r) => {
      let parsed = {};
      try { parsed = JSON.parse(r.new_value || "{}"); } catch (_) {}
      return {
        time: r.changed_at,
        sender: r.sender,
        actionType: r.action_type,
        incidentRef: parsed.incidentRef || "",
        rawText: parsed.rawText || parsed.text || "",
        from: parsed.from || r.sender
      };
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/ai-analyse", async (req, res, next) => {
  try {
    const { question, context, messages } = req.body || {};
    if (!question?.trim()) return res.status(400).json({ message: "Question requise" });
    if (!config.openai.apiKey) {
      return res.status(503).json({ message: "OPENAI_API_KEY manquant sur le serveur" });
    }

    const systemPrompt =
      `Tu es un analyste expert de la plateforme MwangazaMail qui analyse des donnees d'incidents ` +
      `de gouvernance en RDC. Reponds toujours en francais, de facon concise et precise.\n` +
      `Donnees actuelles du dashboard : ${JSON.stringify(context || {})}`;

    const history = Array.isArray(messages)
      ? messages
          .filter((item) => item && (item.role === "user" || item.role === "assistant") && String(item.content || "").trim())
          .slice(-12)
          .map((item) => ({ role: item.role, content: String(item.content) }))
      : [];

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: question.trim() }
        ],
        max_tokens: 600
      })
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      throw new Error(`OpenAI error ${openAiResponse.status}: ${errText}`);
    }

    const data = await openAiResponse.json();
    const answer = data.choices?.[0]?.message?.content || "Aucune reponse disponible.";
    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

export default router;
