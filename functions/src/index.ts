// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import {format} from "date-fns";
import {it} from "date-fns/locale";

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

/**
 * FUNZIONE 1: Notifica gli utenti di una modifica al menù (Sintassi V1)
 */
export const notifyUsersOnMenuChange = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  const callerDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  if (callerData?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Non hai i permessi necessari.");
  }

  const {date, status, menuItems, testEmail} = data;
  if (!date || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Data e stato sono obbligatori.");
  }

  let recipients: string[] = [];
  if (testEmail) {
    recipients.push(testEmail);
  } else {
    const usersSnapshot = await admin.firestore().collection("users").where("active", "==", true).get();
    if (usersSnapshot.empty) {
      return {success: true, message: "Nessun utente da notificare."};
    }
    recipients = usersSnapshot.docs.map((doc) => doc.data().email);
  }

  if (recipients.length === 0) {
    return {success: true, message: "Nessun destinatario."};
  }

  const formattedDate = format(new Date(date), "EEEE d MMMM yyyy", {locale: it});
  let subject = "";
  let htmlBody = "";

  switch (status) {
  case "created":
    subject = `✅ Nuovo menù disponibile per ${formattedDate}`;
    htmlBody = `<h1>Ciao!</h1><p>È stato pubblicato un nuovo menù per <strong>${formattedDate}</strong>.</p><p>Ecco i piatti disponibili:</p><ul>${(menuItems as string[]).map((item) => `<li>${item}</li>`).join("")}</ul><p>Accedi ora alla app ArredissimA Food per fare la tua scelta!</p>`;
    break;
  case "updated":
    subject = `🔄 Menù modificato per ${formattedDate}`;
    htmlBody = `<h1>Attenzione!</h1><p>Il menù per <strong>${formattedDate}</strong> è stato aggiornato.</p><p>Ecco la nuova lista di piatti:</p><ul>${(menuItems as string[]).map((item) => `<li>${item}</li>`).join("")}</ul><p>Ti consigliamo di controllare la tua selezione sulla app ArredissimA Food.</p>`;
    break;
  case "deleted":
    subject = `❌ Menù cancellato per ${formattedDate}`;
    htmlBody = `<h1>Attenzione!</h1><p>Il menù che era stato programmato per <strong>${formattedDate}</strong> è stato cancellato.</p><p>Per questo giorno non è più possibile effettuare prenotazioni.</p>`;
    break;
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
    return {success: true};
  } catch (error) {
    console.error("Errore nell'invio dell'email:", error);
    throw new functions.https.HttpsError("internal", "Impossibile inviare le notifiche email.");
  }
});

/**
 * FUNZIONE 2: Elimina un utente come admin (Sintassi V1)
 */
export const deleteUserAsAdmin = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Devi essere autenticato per eseguire questa operazione");
  }
  if (!data.uid) {
    throw new functions.https.HttpsError("invalid-argument", "ID utente mancante");
  }
  const callerDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Non hai i permessi necessari per eseguire questa operazione");
  }
  await admin.auth().deleteUser(data.uid);
  await admin.firestore().collection("users").doc(data.uid).delete();
  const selectionsQuery = await admin.firestore().collection("menuSelections").where("userId", "==", data.uid).get();
  const batch = admin.firestore().batch();
  selectionsQuery.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return {success: true};
});