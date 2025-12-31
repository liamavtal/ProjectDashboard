/**
 * ProjectDashboard Stripe Integration
 */

import Stripe from 'stripe';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Pricing plans
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['5 projects', 'Basic task management', 'Local storage only']
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    price: 9,
    features: ['Unlimited projects', 'Google Calendar sync', 'iCloud integration', 'Priority support']
  },
  team: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    price: 29,
    features: ['Everything in Pro', 'Team collaboration', 'Shared projects', 'Admin controls']
  }
};

async function loadJSON(file, defaultValue = {}) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

async function saveJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Create checkout session
export async function createCheckoutSession(userId, plan, successUrl, cancelUrl) {
  if (!stripe) throw new Error('Stripe not configured');
  if (!PLANS[plan]?.priceId) throw new Error('Invalid plan');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId, plan }
  });

  return session;
}

// Handle webhook
export async function handleWebhook(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || 'pro';

      // Update user plan
      const users = await loadJSON(USERS_FILE, { users: [] });
      const userIndex = users.users.findIndex(u => u.id === userId);

      if (userIndex >= 0) {
        users.users[userIndex].plan = plan;
        users.users[userIndex].stripeCustomerId = session.customer;
        users.users[userIndex].stripeSubscriptionId = session.subscription;
        await saveJSON(USERS_FILE, users);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const users = await loadJSON(USERS_FILE, { users: [] });
      const userIndex = users.users.findIndex(u => u.stripeSubscriptionId === subscription.id);

      if (userIndex >= 0) {
        users.users[userIndex].plan = 'free';
        users.users[userIndex].stripeSubscriptionId = null;
        await saveJSON(USERS_FILE, users);
      }
      break;
    }
  }
}

// Create customer portal session
export async function createPortalSession(customerId, returnUrl) {
  if (!stripe) throw new Error('Stripe not configured');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });

  return session;
}
