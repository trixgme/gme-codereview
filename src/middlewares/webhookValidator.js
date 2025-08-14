const crypto = require('crypto');

const validateWebhookSignature = (req, res, next) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('Webhook secret not configured, skipping validation');
    return next();
  }

  const signature = req.headers['x-hook-uuid'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // For Bitbucket webhooks, we can validate using the UUID
  // In production, you might want to implement additional validation
  // based on your specific security requirements
  
  next();
};

const parseWebhookPayload = (req, res, next) => {
  try {
    const eventType = req.headers['x-event-key'];
    const payload = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Missing event type header' });
    }

    req.webhookData = {
      eventType,
      payload
    };

    next();
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
};

module.exports = {
  validateWebhookSignature,
  parseWebhookPayload
};