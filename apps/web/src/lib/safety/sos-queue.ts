import type { SafetyIncidentPayload } from "@/lib/safety/incident";

export type QueuedSos = SafetyIncidentPayload & {
  sosId: string;
  createdAt: string;
  status: "PENDING_SYNC";
};

const dbName = "solowander-safety";
const storeName = "sosQueue";
const dbVersion = 1;

function openQueueDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "sosId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openQueueDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function enqueueSos(payload: QueuedSos) {
  await withStore("readwrite", (store) => store.put(payload));
}

export async function removeQueuedSos(sosId: string) {
  await withStore("readwrite", (store) => store.delete(sosId));
}

export async function getQueuedSos() {
  return withStore<QueuedSos[]>("readonly", (store) => store.getAll());
}

export async function queuedSosCount() {
  const queued = await getQueuedSos();
  return queued.length;
}

export async function sendSosPayload(payload: SafetyIncidentPayload) {
  const response = await fetch("/dashboard/safety/sos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`SOS submit failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<{
    ok: true;
    incidentId: string;
    sosId: string;
    duplicate: boolean;
  }>;
}

export async function syncQueuedSos() {
  const queued = await getQueuedSos();
  const results: Array<{ sosId: string; status: "sent" | "failed" }> = [];

  for (const item of queued) {
    try {
      await sendSosPayload({
        sosId: item.sosId,
        sessionId: item.sessionId,
        tripId: item.tripId,
        incidentType: item.incidentType,
        description: item.description,
        locationNote: item.locationNote,
        location: item.location,
        deviceInfo: item.deviceInfo,
        searchArea: item.searchArea,
        syncStatus: "SENT",
      });
      await removeQueuedSos(item.sosId);
      results.push({ sosId: item.sosId, status: "sent" });
    } catch {
      results.push({ sosId: item.sosId, status: "failed" });
    }
  }

  return results;
}
