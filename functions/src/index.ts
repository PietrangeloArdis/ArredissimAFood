// functions/src/index.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import * as functions from "firebase-functions";

admin.initializeApp();

const transporter = nodemailer.createTransport({
  host: functions.config().smtp.host,
  port: functions.config().smtp.port,
  secure: true,
  auth: {
    user: functions.config().smtp.user,
    pass: functions.config().smtp.pass,
  },
});

export const notifyUsersOnMenuChange = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Non hai i permessi necessari.");
  }

  const { date, status, menuItems, testEmail } = request.data;
  if (!date || !status) {
    throw new HttpsError("invalid-argument", "Data e stato sono obbligatori.");
  }

  let recipients: string[] = [];
  if (testEmail) {
    recipients.push(testEmail);
  } else {
    const usersSnapshot = await admin.firestore().collection("users").where("active", "==", true).get();
    if (usersSnapshot.empty) { return { success: true, message: "Nessun utente da notificare." }; }
    recipients = usersSnapshot.docs.map(doc => doc.data().email);
  }
  
  if (recipients.length === 0) { return { success: true, message: "Nessun destinatario." }; }

  const formattedDate = format(new Date(date), "EEEE d MMMM yyyy", { locale: it });
  let subject = "";
  let htmlBody = "";

  switch (status) {
    case "created":
      subject = `✅ Nuovo menù disponibile per ${formattedDate}`;
      htmlBody = `<h1>Ciao!</h1><p>È stato pubblicato un nuovo menù per <strong>${formattedDate}</strong>.</p><p>Ecco i piatti disponibili:</p><ul>${(menuItems as string[]).map(item => `<li>${item}</li>`).join('')}</ul><p>Accedi ora alla app ArredissimA Food per fare la tua scelta!</p>`;
      break;
    // Aggiungi altri casi se necessario (updated, deleted)
  }

  if (testEmail) {
    subject = `[TEST] ${subject}`;
  }

  try {
    await transporter.sendMail({
      from: `"ArredissimA Food" <${functions.config().smtp.from}>`,
      to: recipients.join(", "),
      subject: subject,
      html: htmlBody,
    });
    return { success: true };
  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    throw new HttpsError("internal", "Impossibile inviare le notifiche email.");
  }
});

/**
 * FUNZIONE 2: Elimina un utente come admin.
 * ---> ORA NELLA REGIONE CORRETTA <---
 */
export const deleteUserAsAdmin = onCall({region: "europe-west1"}, async (request) => {
  if (request.app == undefined) {
    throw new HttpsError("failed-precondition", "La funzione deve essere chiamata da una app verificata.");
  }
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato per eseguire questa operazione");
  }
  if (!request.data.uid) {
    throw new HttpsError("invalid-argument", "ID utente mancante");
  }
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Non hai i permessi necessari per eseguire questa operazione");
  }
  await admin.auth().deleteUser(request.data.uid);
  await admin.firestore().collection("users").doc(request.data.uid).delete();
  const selectionsQuery = await admin.firestore().collection("menuSelections").where("userId", "==", request.data.uid).get();
  const batch = admin.firestore().batch();
  selectionsQuery.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return {success: true};
});