import { Router } from "express";
import { config } from "../config.js";
import {
  getIncomingTextMessages,
  processClaimMessage,
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

    // SNS SubscriptionConfirmation — confirm the subscription automatically
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      await fetch(body.SubscribeURL);
      return res.sendStatus(200);
    }

    // SNS Notification — unwrap the Message field to get the actual WhatsApp payload
    if (body.Type === "Notification" && typeof body.Message === "string") {
      try { body = JSON.parse(body.Message); } catch (_) {}
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

export default router;
