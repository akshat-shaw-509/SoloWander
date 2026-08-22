type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle?: () => Promise<{ data: unknown; error: unknown }>;
        limit?: (count: number) => Promise<{ data: unknown; error: unknown }>;
      };
      limit?: (count: number) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

type IncidentDispatchInput = {
  supabase: unknown;
  incidentId: string;
  userId: string;
  incidentType: string;
  severity: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  aiSummary: string;
};

type TouristProfile = {
  full_name?: string | null;
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  digital_id_code?: string | null;
  medical_notes?: string | null;
};

type AuthorityProfile = {
  operator_name?: string | null;
  control_room_phone?: string | null;
};

type DispatchResult = {
  channel: string;
  target: string;
  status: "sent" | "skipped" | "failed";
  detail: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripWhatsappPrefix(phone: string) {
  return phone.replace(/^whatsapp:/i, "");
}

function toWhatsappAddress(phone: string) {
  const normalized = stripWhatsappPrefix(phone);
  return normalized ? `whatsapp:${normalized}` : "";
}

function mapsLink(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return "Location unavailable";
  }

  return `https://maps.google.com/?q=${lat},${lng}`;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function twilioAuthHeader() {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    return null;
  }

  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function postTwilio(
  path: string,
  body: URLSearchParams,
): Promise<Response> {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const auth = twilioAuthHeader();

  if (!accountSid || !auth) {
    throw new Error("Twilio credentials are missing");
  }

  return fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
}

async function sendTwilioMessage(
  channel: "sms" | "whatsapp",
  to: string,
  message: string,
): Promise<DispatchResult> {
  const from =
    channel === "whatsapp" ? env("TWILIO_WHATSAPP_FROM") : env("TWILIO_SMS_FROM");

  if (!to || !from || !twilioAuthHeader()) {
    return {
      channel,
      target: to || "missing target",
      status: "skipped",
      detail: "Twilio message settings are not configured",
    };
  }

  const response = await postTwilio(
    "Messages.json",
    new URLSearchParams({
      To: channel === "whatsapp" ? toWhatsappAddress(to) : stripWhatsappPrefix(to),
      From: channel === "whatsapp" ? toWhatsappAddress(from) : stripWhatsappPrefix(from),
      Body: message.slice(0, 1500),
    }),
  );

  return {
    channel,
    target: to,
    status: response.ok ? "sent" : "failed",
    detail: response.ok
      ? "Queued by Twilio"
      : `Twilio returned HTTP ${response.status}`,
  };
}

async function placeTwilioCall(
  to: string,
  message: string,
): Promise<DispatchResult> {
  const from = env("TWILIO_VOICE_FROM") || env("TWILIO_SMS_FROM");

  if (!to || !from || !twilioAuthHeader()) {
    return {
      channel: "phone",
      target: to || "missing target",
      status: "skipped",
      detail: "Twilio voice settings are not configured",
    };
  }

  const twiml = `<Response><Say>${xmlEscape(message.slice(0, 900))}</Say></Response>`;
  const response = await postTwilio(
    "Calls.json",
    new URLSearchParams({
      To: stripWhatsappPrefix(to),
      From: stripWhatsappPrefix(from),
      Twiml: twiml,
    }),
  );

  return {
    channel: "phone",
    target: to,
    status: response.ok ? "sent" : "failed",
    detail: response.ok
      ? "Queued by Twilio Voice"
      : `Twilio returned HTTP ${response.status}`,
  };
}

async function sendEmail(
  subject: string,
  text: string,
): Promise<DispatchResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("SOS_EMAIL_FROM");
  const to = env("SOS_EMAIL_TO");

  if (!apiKey || !from || !to) {
    return {
      channel: "email",
      target: to || "missing recipient",
      status: "skipped",
      detail: "Resend email settings are not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map((item) => item.trim()).filter(Boolean),
      subject,
      text,
      html: `<pre style="font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap">${htmlEscape(text)}</pre>`,
    }),
  });

  return {
    channel: "email",
    target: to,
    status: response.ok ? "sent" : "failed",
    detail: response.ok ? "Queued by Resend" : `Resend returned HTTP ${response.status}`,
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<DispatchResult> {
  const token = env("TELEGRAM_BOT_TOKEN");

  if (!token || !chatId) {
    return {
      channel: "telegram",
      target: chatId || "missing chat",
      status: "skipped",
      detail: "Telegram settings are not configured",
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096),
        disable_web_page_preview: false,
      }),
    },
  );

  return {
    channel: "telegram",
    target: chatId,
    status: response.ok ? "sent" : "failed",
    detail: response.ok
      ? "Queued by Telegram Bot API"
      : `Telegram returned HTTP ${response.status}`,
  };
}

async function sendDiscordWebhook(text: string): Promise<DispatchResult> {
  const webhookUrl = env("DISCORD_SOS_WEBHOOK_URL");

  if (!webhookUrl) {
    return {
      channel: "discord",
      target: "missing webhook",
      status: "skipped",
      detail: "DISCORD_SOS_WEBHOOK_URL is not configured",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: text.slice(0, 1900),
      allowed_mentions: { parse: [] },
    }),
  });

  return {
    channel: "discord",
    target: webhookUrl,
    status: response.ok ? "sent" : "failed",
    detail: response.ok
      ? "Posted to Discord webhook"
      : `Discord returned HTTP ${response.status}`,
  };
}

async function postWebhook(
  payload: Record<string, unknown>,
): Promise<DispatchResult> {
  const webhookUrl = env("SOS_DISPATCH_WEBHOOK_URL");

  if (!webhookUrl) {
    return {
      channel: "webhook",
      target: "missing URL",
      status: "skipped" as const,
      detail: "SOS_DISPATCH_WEBHOOK_URL is not configured",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env("SOS_DISPATCH_WEBHOOK_SECRET")
        ? { Authorization: `Bearer ${env("SOS_DISPATCH_WEBHOOK_SECRET")}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  return {
    channel: "webhook",
    target: webhookUrl,
    status: response.ok ? "sent" : "failed",
    detail: response.ok ? "Webhook accepted" : `Webhook returned HTTP ${response.status}`,
  };
}

async function getProfile(supabase: SupabaseLike, userId: string) {
  const query = supabase
    .from("tourist_safety_profiles")
    .select(
      "full_name, phone, emergency_contact_name, emergency_contact_phone, digital_id_code, medical_notes",
    )
    .eq("user_id", userId);

  if (!query.maybeSingle) {
    return null;
  }

  const { data } = await query.maybeSingle();
  return data as TouristProfile | null;
}

async function getAuthorityPhones(supabase: SupabaseLike) {
  const query = supabase
    .from("authority_profiles")
    .select("operator_name, control_room_phone");

  if (!query.limit) {
    return [];
  }

  const { data } = await query.limit(20);
  return (Array.isArray(data) ? data : []) as AuthorityProfile[];
}

export async function dispatchSafetyIncident({
  supabase,
  incidentId,
  userId,
  incidentType,
  severity,
  description,
  lat,
  lng,
  aiSummary,
}: IncidentDispatchInput) {
  const db = supabase as SupabaseLike;
  const [profile, authorityProfiles] = await Promise.all([
    getProfile(db, userId),
    getAuthorityPhones(db),
  ]);

  const emergencyPhone = profile?.emergency_contact_phone || "";
  const authorityPhones = authorityProfiles
    .map((authority) => authority.control_room_phone)
    .filter((phone): phone is string => Boolean(phone));
  const phoneTargets = Array.from(new Set([emergencyPhone, ...authorityPhones]));
  const subject = `SoloWander SOS: ${severity.toUpperCase()} ${incidentType}`;
  const text = compact(`
    [SOS ALERT] ${severity.toUpperCase()} PRIORITY
    IMMEDIATE ATTENTION REQUIRED
    ${subject}
    ------------------------------
    Incident ID: ${incidentId}
    Incident type: ${incidentType.replaceAll("_", " ")}
    Reported: ${new Date().toISOString()}
    Traveller: ${profile?.full_name || "Unknown"} ${profile?.digital_id_code ? `(${profile.digital_id_code})` : ""}
    Traveller phone: ${profile?.phone || "Not provided"}
    Emergency contact: ${profile?.emergency_contact_name || "Not provided"} ${emergencyPhone || ""}
    Medical notes: ${profile?.medical_notes || "None"}
    AI triage: ${aiSummary}
    Details: ${description || "No details provided"}
    Location: ${mapsLink(lat, lng)}
    Coordinates: ${lat !== null && lng !== null ? `${lat}, ${lng}` : "Unavailable"}
    ------------------------------
    ACTION: Contact the traveller and open the authority dashboard now.
  `);
  const voiceText = compact(
    `SoloWander SOS alert. ${profile?.full_name || "A traveller"} reported ${incidentType}. Severity ${severity}. Location: ${lat !== null && lng !== null ? `${lat}, ${lng}` : "unavailable"}. Open the authority dashboard now.`,
  );
  const payload = {
    incidentId,
    userId,
    incidentType,
    severity,
    description,
    lat,
    lng,
    mapUrl: lat !== null && lng !== null ? mapsLink(lat, lng) : null,
    aiSummary,
    tourist: profile,
  };

  const configuredActions: Array<Promise<DispatchResult>> = [
    sendDiscordWebhook(text),
    postWebhook(payload),
    sendEmail(subject, text),
  ];

  for (const chatId of splitCsv(env("TELEGRAM_CHAT_IDS"))) {
    configuredActions.push(sendTelegramMessage(chatId, text));
  }

  for (const phone of phoneTargets) {
    configuredActions.push(sendTwilioMessage("sms", phone, text));
    configuredActions.push(sendTwilioMessage("whatsapp", phone, text));
  }

  if (severity === "critical" || incidentType === "sos") {
    for (const phone of phoneTargets) {
      configuredActions.push(placeTwilioCall(phone, voiceText));
    }
  }

  const settled = await Promise.allSettled(configuredActions);
  return settled.map((item): DispatchResult =>
    item.status === "fulfilled"
      ? item.value
      : {
          channel: "dispatch",
          target: "unknown",
          status: "failed",
          detail: item.reason instanceof Error ? item.reason.message : "Unknown error",
        },
  );
}

export function summarizeDispatchResults(results: DispatchResult[]) {
  const sent = results.filter((result) => result.status === "sent");
  const failed = results.filter((result) => result.status === "failed");
  const skipped = results.filter((result) => result.status === "skipped");

  return [
    `Dispatch summary: ${sent.length} sent, ${failed.length} failed, ${skipped.length} skipped.`,
    ...results.map(
      (result) =>
        `${result.channel} to ${result.target}: ${result.status} (${result.detail})`,
    ),
  ].join("\n");
}
