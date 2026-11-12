"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Radio } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type SafetyRealtimeProps = {
  channelName: string;
  tables: string[];
  notifyIncidents?: boolean;
};

type IncidentPayload = {
  id?: string;
  incident_type?: string;
  severity?: string;
  status?: string;
  ai_summary?: string;
};

function incidentMessage(payload: IncidentPayload) {
  return [
    payload.severity ? payload.severity.toUpperCase() : "SOS",
    payload.incident_type || "incident",
    payload.status ? `(${payload.status})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function SafetyRealtime({
  channelName,
  tables,
  notifyIncidents = false,
}: SafetyRealtimeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">(() =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );

  const tablesKey = tables.slice().sort().join(",");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName);
    const activeTables = tablesKey ? tablesKey.split(",") : [];

    for (const table of activeTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          if (
            notifyIncidents &&
            table === "safety_incidents" &&
            payload.eventType === "INSERT" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const incident = payload.new as IncidentPayload;
            new Notification("SoloWander SOS", {
              body: incident.ai_summary || incidentMessage(incident),
              tag: incident.id || "solowander-sos",
            });
          }

          startTransition(() => {
            router.refresh();
          });
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, notifyIncidents, router, tablesKey]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">
      <Radio className={`h-3.5 w-3.5 ${isPending ? "text-orange-600" : "text-[var(--secondary)]"}`} />
      Live sync
      {notifyIncidents && notificationPermission !== "granted" ? (
        <button
          type="button"
          onClick={enableNotifications}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--dark)] px-2 py-1 text-white"
        >
          <Bell className="h-3 w-3" />
          Alerts
        </button>
      ) : null}
    </div>
  );
}
