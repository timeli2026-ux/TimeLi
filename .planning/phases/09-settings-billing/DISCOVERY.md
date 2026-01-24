# Phase 9: Settings & Billing - Discovery

## Research Summary

Phase 9 implements the settings page, Stripe subscription billing, and usage tracking.

### Stripe Integration Approach

**Architecture Decision: Stripe Checkout + Subscriptions with Trial**

Based on research, the recommended approach for TimeLi:

1. **Setup Intent Flow** (for trial with payment method capture):
   - Create subscription with `payment_behavior: 'default_incomplete'`
   - Use `payment_settings: { save_default_payment_method: 'on_subscription' }`
   - Expand `pending_setup_intent` to get client secret
   - Customer enters card but isn't charged until trial ends

2. **Webhook Events to Handle**:
   - `checkout.session.completed` - Initial signup complete
   - `customer.subscription.created` - Subscription started (trial begins)
   - `customer.subscription.updated` - Status changes (trial -> active, cancellation)
   - `customer.subscription.deleted` - Subscription ended
   - `invoice.paid` - Payment succeeded (recurring)
   - `invoice.payment_failed` - Payment failed

3. **Webhook Verification in Next.js App Router**:
   ```typescript
   // CRITICAL: Use request.text() to get raw body
   const body = await request.text()
   const signature = headers().get('stripe-signature')!
   const event = stripe.webhooks.constructEvent(
     body,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET!
   )
   ```

### Database Schema (New Tables)

```sql
-- Subscriptions table
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive', -- inactive, trialing, active, canceled, past_due
  plan text default 'monthly', -- monthly
  price_cents integer default 1500, -- $15/month
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Usage tracking table
create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  period_start date not null,
  period_end date not null,
  schedule_generations integer default 0,
  recalibrations integer default 0,
  llm_requests integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_start)
);
```

### Settings Page Structure

Building on existing `/settings/preferences`, add:
- `/settings` - Main settings page with tabs
- `/settings/account` - Account management (email, password, delete)
- `/settings/subscription` - Billing and subscription management

### Environment Variables Needed

```env
# Stripe (required for billing)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... # Monthly subscription price

# Usage limits
USAGE_LIMIT_GENERATIONS=200
USAGE_LIMIT_RECALIBRATIONS=500
```

### Key Implementation Notes

1. **Trial Logic**:
   - Trial starts on first schedule generation (BILL-03)
   - 30-day free trial
   - Payment method required but not charged during trial
   - Auto-converts to paid after trial ends

2. **Usage Limits** (BILL-04):
   - 200 schedule generations per month
   - 500 recalibrations per month
   - LLM requests tracked separately (already implemented in Phase 8)

3. **Security** (SEC-12):
   - Webhook signature verification mandatory
   - Stripe secret key server-only (never exposed to client)
   - All Stripe API calls from server routes

### External Service Configuration

**Stripe Dashboard Setup Required**:
- Create product with $15/month price
- Create webhook endpoint pointing to `/api/webhooks/stripe`
- Configure webhook events (listed above)
- Get API keys and webhook secret

## Research Sources

- [Stripe Setup Intents API](https://docs.stripe.com/api/setup_intents)
- [Stripe Subscriptions Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Next.js App Router Webhook Verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f)
- [Stripe + Next.js 15 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
