// functions/src/index.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import * as functions from "firebase-functions";

// Initialize Firebase Admin
admin.initializeApp();

// Configura il trasporto per le email usando le credenziali che abbiamo salvato
const transporter = nodemailer.createTransport({
  host: functions.config().smtp.host,
  port: functions.config().smtp.port,
  secure: true, // Usa STARTTLS
  auth: {
    user: functions.config().smtp.user,
    pass: functions.config().smtp.pass,
  },
});

/**
 * NUOVA FUNZIONE: Notifica gli utenti di una modifica al menù.
 */
export const notifyUsersOnMenuChange = onCall(async (request) => {
  // 1. Verifica che chi chiama la funzione sia un admin
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Devi essere autenticato.");
  }
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Non hai i permessi necessari.");
  }

  // 2. Controlla se è una email di test
  const { date, status, menuItems, testEmail } = request.data;
  if (!date || !status) {
    throw new HttpsError("invalid-argument", "Data e stato sono obbligatori.");
  }

  let recipients: string[] = [];

  if (testEmail) {
    // Se è un test, il destinatario è solo l'indirizzo di test
    recipients.push(testEmail);
    console.log(`Invio email di test a: ${testEmail}`);
  } else {
    // Altrimenti, recupera tutti gli utenti attivi
    const usersSnapshot = await admin.firestore().collection("users").where("active", "==", true).get();
    if (usersSnapshot.empty) {
      console.log("Nessun utente attivo trovato.");
      return { success: true, message: "Nessun utente da notificare." };
    }
    recipients = usersSnapshot.docs.map(doc => doc.data().email);
  }

  const formattedDate = format(new Date(date), "EEEE d MMMM yyyy", { locale: it });
  let subject = "";
  let htmlBody = "";

  // 3. Prepara il contenuto dell'email
  switch (status) {
    case "created":
      subject = `✅ Nuovo menù disponibile per ${formattedDate}`;
      htmlBody = `<h1>Ciao!</h1><p>È stato pubblicato un nuovo menù per <strong>${formattedDate}</strong>.</p><p>Ecco i piatti disponibili:</p><ul>${(menuItems as string[]).map(item => `<li>${item}</li>`).join('')}</ul><p>Accedi ora alla app ArredissimA Food per fare la tua scelta!</p>`;
      break;
    case "updated":
      subject = `🔄 Menù modificato per ${formattedDate}`;
      htmlBody = `<h1>Attenzione!</h1><p>Il menù per <strong>${formattedDate}</strong> è stato aggiornato.</p><p>Ecco la nuova lista di piatti:</p><ul>${(menuItems as string[]).map(item => `<li>${item}</li>`).join('')}</ul><p>Ti consigliamo di controllare la tua selezione sulla app ArredissimA Food.</p>`;
      break;
    case "deleted":
      subject = `❌ Menù cancellato per ${formattedDate}`;
      htmlBody = `<h1>Attenzione!</h1><p>Il menù che era stato programmato per <strong>${formattedDate}</strong> è stato cancellato.</p><p>Per questo giorno non è più possibile effettuare prenotazioni.</p>`;
      break;
  }

  if (testEmail) {
    subject = `[TEST] ${subject}`;
  }

  // 4. Invia l'email
  try {
    await transporter.sendMail({
      from: `"ArredissimA Food" <${functions.config().smtp.from}>`,
      to: testEmail ? testEmail : functions.config().smtp.from,
      bcc: testEmail ? undefined : recipients,
      subject: subject,
      html: htmlBody,
    });
    console.log(`Email inviata a ${recipients.length} destinatari.`);
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