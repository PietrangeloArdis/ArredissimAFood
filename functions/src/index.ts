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
  const callerData = callerDoc.data();
  if (callerData?.role !== "admin") {
    throw new HttpsError("permission-denied", "Non hai i permessi necessari.");
  }

  const { date, status, menuItems } = request.data;
  if (!date || !status) {
    throw new HttpsError("invalid-argument", "Data e stato sono obbligatori.");
  }

  // NUOVA LOGICA: Controlla se è un test cercando il "piatto segreto"
  const isTest = (menuItems as string[]).includes('[TESTMAIL]');
  const finalMenuItems = (menuItems as string[]).filter(item => item !== '[TESTMAIL]');

  let recipients: string[] = [];

  if (isTest) {
    // Se è un test, il destinatario è solo l'admin che ha chiamato la funzione
    if (callerData?.email) {
      recipients.push(callerData.email);
    }
  } else {
    // Altrimenti, recupera tutti gli utenti attivi
    const usersSnapshot = await admin.firestore().collection("users").where("active", "==", true).get();
    if (usersSnapshot.empty) {
      return { success: true, message: "Nessun utente da notificare." };
    }
    recipients = usersSnapshot.docs.map(doc => doc.data().email);
  }
  
  if (recipients.length === 0) {
    console.log("Nessun destinatario valido trovato.");
    return { success: true, message: "Nessun destinatario." };
  }

  const formattedDate = format(new Date(date), "EEEE d MMMM yyyy", { locale: it });
  let subject = "";
  let htmlBody = "";

  switch (status) {
    case "created":
      subject = `✅ Nuovo menù disponibile per ${formattedDate}`;
      htmlBody = `<h1>Ciao!</h1><p>È stato pubblicato un nuovo menù per <strong>${formattedDate}</strong>.</p><p>Ecco i piatti disponibili:</p><ul>${finalMenuItems.map(item => `<li>${item}</li>`).join('')}</ul><p>Accedi ora alla app ArredissimA Food per fare la tua scelta!</p>`;
      break;
    case "updated":
      subject = `🔄 Menù modificato per ${formattedDate}`;
      htmlBody = `<h1>Attenzione!</h1><p>Il menù per <strong>${formattedDate}</strong> è stato aggiornato.</p><p>Ecco la nuova lista di piatti:</p><ul>${finalMenuItems.map(item => `<li>${item}</li>`).join('')}</ul><p>Ti consigliamo di controllare la tua selezione sulla app ArredissimA Food.</p>`;
      break;
    case "deleted":
      subject = `❌ Menù cancellato per ${formattedDate}`;
      htmlBody = `<h1>Attenzione!</h1><p>Il menù che era stato programmato per <strong>${formattedDate}</strong> è stato cancellato.</p><p>Per questo giorno non è più possibile effettuare prenotazioni.</p>`;
      break;
  }

  if (isTest) {
    subject = `[TEST] ${subject}`;
    if (finalMenuItems.length === 0) {
        htmlBody = `<h1>Email di Prova</h1><p>Questo è un test per il menù del <strong>${formattedDate}</strong>. Nessun piatto reale è stato salvato.</p>`;
    }
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
 * Funzione esistente per eliminare un utente
 */
export const deleteUserAsAdmin = onCall(async (request) => {
  try {
    if (request.app == undefined) {
      throw new HttpsError(
        'failed-precondition',
        'The function must be called from an App Check verified app.'
      );
    }
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Devi essere autenticato per eseguire questa operazione');
    }
    if (!request.data.uid) {
      throw new HttpsError('invalid-argument', 'ID utente mancante');
    }

    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Non hai i permessi necessari per eseguire questa operazione');
    }

    await admin.auth().deleteUser(request.data.uid);
    await admin.firestore().collection('users').doc(request.data.uid).delete();
    
    const selectionsQuery = await admin.firestore().collection('menuSelections').where('userId', '==', request.data.uid).get();
    const batch = admin.firestore().batch();
    selectionsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('[Function] deleteUserAsAdmin error:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Errore durante l\'eliminazione dell\'utente');
  }
});