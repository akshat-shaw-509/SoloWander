This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase setup

Login and registration require Supabase configuration. In the Supabase dashboard, open **Project Settings > API** and copy the **Project URL** and **Publishable key** (or legacy `anon` key) into `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

## Free SOS dispatch setup

SOS incidents are always written to Supabase and streamed to the authority
dashboard. For a zero-cost build, use Discord and/or Telegram alerts first:

```env
DISCORD_SOS_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
TELEGRAM_CHAT_IDS=-1001234567890,123456789
```

Optional free-tier email dispatch can be enabled with Resend:

```env
RESEND_API_KEY=...
SOS_EMAIL_FROM=SoloWander <alerts@yourdomain.com>
SOS_EMAIL_TO=control-room@yourdomain.com
```

You can also post to your own free endpoint:

```env
SOS_DISPATCH_WEBHOOK_URL=https://your-control-room.example/sos
SOS_DISPATCH_WEBHOOK_SECRET=optional-shared-secret
```

SMS, WhatsApp, and automated phone calls require telecom providers and are not
part of the zero-cost path. Leave these blank unless you choose to pay for them:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=
TWILIO_VOICE_FROM=
```

When a provider is not configured, the SOS action still succeeds and records a
dispatch update explaining which channels were sent, skipped, or failed.

Restart the development server after creating or changing this file:

```bash
npm run dev --workspace=web
```

Do not commit `.env.local` or share the key publicly. The file is ignored by Git.

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
