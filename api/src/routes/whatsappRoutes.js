import { Router } from "express";
import { config } from "../config.js";
import {
  getIncomingTextMessages,
  processClaimMessage,
  processShipmentQuoteWebchat,
  sendWhatsAppText,
  wasMessageAlreadyProcessed
} from "../services/whatsappClaimService.js";

const router = Router();

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === config.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({ message: "Webhook verification failed" });
});

router.post("/webhook", async (req, res, next) => {
  try {
    let body = req.body;
    console.log("[webhook] raw body:", JSON.stringify(body));

    // SNS SubscriptionConfirmation — confirm the subscription automatically
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      await fetch(body.SubscribeURL);
      return res.sendStatus(200);
    }

    // SNS Notification — unwrap the Message field to get the actual WhatsApp payload
    if (body.Type === "Notification" && typeof body.Message === "string") {
      try { body = JSON.parse(body.Message); } catch (_) {}
      console.log("[webhook] unwrapped SNS message:", JSON.stringify(body));
      // AWS Social Messaging wraps the webhook in whatsAppWebhookEntry (double-encoded)
      if (typeof body.whatsAppWebhookEntry === "string") {
        try {
          const entry = JSON.parse(body.whatsAppWebhookEntry);
          body = { entry: [entry] };
        } catch (_) {}
      }
    }

    const messages = getIncomingTextMessages(body);
    for (const message of messages) {
      const alreadyProcessed = await wasMessageAlreadyProcessed(message.messageId);
      if (alreadyProcessed) {
        continue;
      }

      const { referenceNumber, responseText } = await processClaimMessage(message);
      try {
        await sendWhatsAppText(message.from, responseText);
      } catch (sendError) {
        console.error(`WhatsApp send failed for ${referenceNumber}:`, sendError.message);
      }

      console.log(`Processed WhatsApp claim ${referenceNumber} for ${message.from}`);
    }

    res.status(200).json({ received: true, processed: messages.length });
  } catch (error) {
    next(error);
  }
});

// Web chat endpoint — browser clients send messages and receive bot responses
router.post("/webchat", async (req, res, next) => {
  try {
    const { userId, text, history } = req.body;

    if (!userId || typeof userId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(userId)) {
      return res.status(400).json({ message: "Valid userId (8–64 alphanumeric chars) required" });
    }
    if (!text || typeof text !== "string" || text.trim().length === 0 || text.length > 2000) {
      return res.status(400).json({ message: "text required (max 2000 chars)" });
    }

    const result = await processShipmentQuoteWebchat(text.trim(), history);

    res.json({
      responseText: result.responseText,
      referenceNumber: result.referenceNumber || null,
      complete: Boolean(result.complete)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
