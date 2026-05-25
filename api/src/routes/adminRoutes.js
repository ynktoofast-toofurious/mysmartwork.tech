import { Router } from "express";
import {
  createUser,
  getAnalyticsSummary,
  getIncidents,
  getSeoEvents,
  getSubscriptions,
  getUsers,
  logAccessEvent,
  updateIncident,
  updateUser
} from "../services/adminService.js";
import { listAudit } from "../services/auditService.js";

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

export default router;
