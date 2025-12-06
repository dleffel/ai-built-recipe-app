import { Router, Request, Response, RequestHandler } from 'express';
import { GmailPubSubService } from '../services/gmailPubSubService';
import { PubSubMessage } from '../types/gmail';

const router = Router();

/**
 * POST /webhooks/gmail/pubsub
 * Webhook endpoint for Gmail Pub/Sub notifications
 * This is called by Google Cloud Pub/Sub when new emails arrive
 */
const handleGmailPubSub: RequestHandler = async (req, res) => {
  try {
    // Verify the request is from Google Pub/Sub
    // In production, you should verify the JWT token in the Authorization header
    // For now, we'll accept all requests but log them
    
    const pubsubMessage = req.body as PubSubMessage;
    
    if (!pubsubMessage.message || !pubsubMessage.message.data) {
      console.warn('Invalid Pub/Sub message received:', req.body);
      // Return 200 to acknowledge and prevent retries
      res.status(200).send();
      return;
    }

    // Process the notification asynchronously
    // We acknowledge immediately to prevent Pub/Sub retries
    GmailPubSubService.processNotification(pubsubMessage)
      .catch(error => {
        console.error('Error processing Gmail notification:', error);
      });

    // Always return 200 to acknowledge the message
    // This prevents Pub/Sub from retrying
    res.status(200).send();
  } catch (error) {
    console.error('Error handling Gmail Pub/Sub webhook:', error);
    // Return 200 even on error to prevent infinite retries
    // The error is logged and can be investigated
    res.status(200).send();
  }
};

/**
 * GET /webhooks/gmail/pubsub
 * Health check endpoint for the webhook
 * Google Cloud may ping this to verify the endpoint is alive
 */
const healthCheck: RequestHandler = (req, res) => {
  res.status(200).json({ status: 'ok', service: 'gmail-pubsub-webhook' });
};

// Routes
router.post('/gmail/pubsub', handleGmailPubSub);
router.get('/gmail/pubsub', healthCheck);

export default router;