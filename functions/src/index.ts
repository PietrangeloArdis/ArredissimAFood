import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Callable function to delete a user as admin
export const deleteUserAsAdmin = onCall(async (request) => {
  try {
    // Enhanced debug logging
    console.log('[Function] deleteUserAsAdmin called with:', {
      callerUid: request.auth?.uid,
      targetUid: request.data?.uid,
      callerToken: request.auth?.token,
    });

    // Validate authentication
    if (!request.auth?.uid) {
      console.error('[Function] Authentication missing');
      throw new HttpsError(
        'unauthenticated',
        'Devi essere autenticato per eseguire questa operazione'
      );
    }

    // Validate input
    if (!request.data?.uid) {
      console.error('[Function] Target UID missing');
      throw new HttpsError(
        'invalid-argument',
        'ID utente mancante'
      );
    }

    // Get caller's admin status
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    console.log('[Function] Caller document:', callerDoc.exists ? callerDoc.data() : 'Not found');

    if (!callerDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Profilo utente non trovato'
      );
    }

    const callerData = callerDoc.data();
    if (callerData?.role !== 'admin') {
      console.error('[Function] Caller not admin:', callerData?.role);
      throw new HttpsError(
        'permission-denied',
        'Non hai i permessi necessari per eseguire questa operazione'
      );
    }

    // Verify target user exists
    try {
      const targetUser = await admin.auth().getUser(request.data.uid);
      console.log('[Function] Target user found:', targetUser.uid);
    } catch (error) {
      console.error('[Function] Target user not found:', error);
      throw new HttpsError(
        'not-found',
        'Utente da eliminare non trovato'
      );
    }

    // Delete user from Auth
    try {
      await admin.auth().deleteUser(request.data.uid);
      console.log('[Function] User deleted from Auth');
    } catch (error) {
      console.error('[Function] Error deleting user from Auth:', error);
      throw new HttpsError(
        'internal',
        'Errore durante l\'eliminazione dell\'utente da Authentication'
      );
    }

    // Delete user document from Firestore
    try {
      await admin.firestore()
        .collection('users')
        .doc(request.data.uid)
        .delete();
      console.log('[Function] User document deleted from Firestore');
    } catch (error) {
      console.error('[Function] Error deleting user document:', error);
      throw new HttpsError(
        'internal',
        'Errore durante l\'eliminazione del profilo utente'
      );
    }

    // Delete user's menu selections
    try {
      const selectionsQuery = await admin.firestore()
        .collection('menuSelections')
        .where('userId', '==', request.data.uid)
        .get();

      const batch = admin.firestore().batch();
      selectionsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('[Function] User menu selections deleted');
    } catch (error) {
      console.error('[Function] Error deleting menu selections:', error);
      throw new HttpsError(
        'internal',
        'Errore durante l\'eliminazione delle selezioni menù'
      );
    }

    console.log('[Function] User deletion completed successfully');
    return { success: true };
  } catch (error) {
    console.error('[Function] deleteUserAsAdmin error:', error);

    // If it's already a HttpsError, rethrow it
    if (error instanceof HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw new HttpsError(
      'internal',
      'Errore durante l\'eliminazione dell\'utente',
      error.message
    );
  }
});