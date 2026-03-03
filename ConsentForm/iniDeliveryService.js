// src/components/ConsentForm/iniDeliveryService.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../../firebaseConfig";

/**
 * Sends an INI delivery email (Option A1):
 * - Cloud Function generates INI
 * - Stores INI text in Firestore (iniDeliveries)
 * - Emails tokenized download link to informant
 */
export async function sendIniDelivery({ projectId, informant }) {
  if (!projectId) throw new Error("missing_projectId");
  if (!informant?.id) throw new Error("missing_informantId");
  if (!informant?.email) throw new Error("missing_recipientEmail");

  const user = auth.currentUser;
  if (!user) throw new Error("not_logged_in");

  const functions = getFunctions(undefined, "us-central1");
  const createIniDelivery = httpsCallable(functions, "createIniDelivery");

  const resp = await createIniDelivery({
    projectId,
    informantId: informant.id,
    recipientEmail: informant.email,
  });

  const data = resp?.data || {};
  if (!data.ok) throw new Error(data.error || "create_delivery_failed");
  return data; // { ok:true, deliveryId: ... }
}