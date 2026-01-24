# Phase 09: User Setup Required

**Generated:** 2026-01-24
**Phase:** 09-settings-billing
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API keys > Secret key | `.env.local` |
| [ ] | `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard > Developers > API keys > Publishable key | `.env.local` |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks > Signing secret (after creating endpoint) | `.env.local` |
| [ ] | `STRIPE_PRICE_ID` | Stripe Dashboard > Products > [Your Product] > Copy price ID | `.env.local` |

## Account Setup

- [ ] **Create Stripe account** (skip if already have one)
  - URL: https://dashboard.stripe.com/register

## Dashboard Configuration

- [ ] **Create monthly subscription product**
  - Location: Stripe Dashboard > Products > Add product
  - Details: Name: TimeLi Monthly, Price: $15/month recurring
  - Copy the Price ID after creation

- [ ] **Create webhook endpoint** (after deploy)
  - Location: Stripe Dashboard > Developers > Webhooks > Add endpoint
  - URL: `https://[your-domain]/api/webhooks/stripe`
  - Events to subscribe:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`

## Local Development

For local webhook testing:
```bash
# Install Stripe CLI if not already installed
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret for local testing. Use this value for `STRIPE_WEBHOOK_SECRET` during development.

## Verification

After configuration, verify:

1. Stripe keys work:
   ```bash
   # In your app, check env vars are loaded
   grep STRIPE .env.local | wc -l  # Should be 4
   ```

2. Product exists with correct price:
   - Visit Stripe Dashboard > Products
   - Confirm TimeLi Monthly product with $15/month price

3. Webhook endpoint is configured (after deploy):
   - Visit Stripe Dashboard > Developers > Webhooks
   - Confirm endpoint shows as active

---
**Once all items complete:** Mark status as "Complete"
