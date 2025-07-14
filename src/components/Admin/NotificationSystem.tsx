import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Bell, Mail, AlertTriangle, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface NotificationSystemProps {
  removedDish: string;
  date: string;
  onNotificationsSent?: () => void;
}

interface AffectedUser {
  userId: string;
  email: string;
  nome: string;
  cognome: string;
  selectedItems: string[];
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  removedDish,
  date,
  onNotificationsSent
}) => {
  const [loading, setLoading] = useState(false);
  const [affectedUsers, setAffectedUsers] = useState<AffectedUser[]>([]);
  const [notificationsSent, setNotificationsSent] = useState(false);

  const findAffectedUsers = async () => {
    try {
      setLoading(true);
      
      // Find all menu selections for the specific date that include the removed dish
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(
        selectionsRef,
        where('date', '==', date)
      );

      const selectionsSnapshot = await getDocs(q);
      const affected: AffectedUser[] = [];

      for (const selectionDoc of selectionsSnapshot.docs) {
        const selection = selectionDoc.data();
        
        if (selection.selectedItems.includes(removedDish)) {
          // Get user details
          const userRef = doc(db, 'users', selection.userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            affected.push({
              userId: selection.userId,
              email: userData.email,
              nome: userData.nome,
              cognome: userData.cognome,
              selectedItems: selection.selectedItems
            });
          }
        }
      }

      setAffectedUsers(affected);
      return affected;
    } catch (error) {
      console.error('Error finding affected users:', error);
      toast.error('Errore nella ricerca degli utenti interessati');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const sendNotifications = async () => {
    if (affectedUsers.length === 0) {
      toast.error('Nessun utente da notificare');
      return;
    }

    try {
      setLoading(true);
      
      // Create notification records in Firestore
      const batch = writeBatch(db);
      const notificationsRef = collection(db, 'notifications');

      const formattedDate = format(new Date(date), 'EEEE d MMMM yyyy', { locale: it });

      for (const user of affectedUsers) {
        const notificationId = `${user.userId}_${date}_${removedDish.replace(/\s+/g, '_')}`;
        const notificationRef = doc(notificationsRef, notificationId);

        const notificationData = {
          userId: user.userId,
          type: 'dish_removed',
          title: '⚠️ Piatto rimosso dal menù',
          message: `Gentile ${user.nome}, il piatto "${removedDish}" che avevi selezionato per il giorno ${formattedDate} è stato rimosso dal menù. Ti invitiamo a modificare la tua selezione per non restare senza pasto.`,
          date: date,
          removedDish: removedDish,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/calendar?date=${date}`
        };

        batch.set(notificationRef, notificationData);
      }

      await batch.commit();
      setNotificationsSent(true);
      toast.success(`Notifiche inviate a ${affectedUsers.length} utenti`);
      
      if (onNotificationsSent) {
        onNotificationsSent();
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Errore nell\'invio delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (removedDish && date) {
      findAffectedUsers();
    }
  }, [removedDish, date]);

  if (!removedDish || !date) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800">
            Piatto rimosso: "{removedDish}"
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            Data: {format(new Date(date), 'EEEE d MMMM yyyy', { locale: it })}
          </p>
          
          {loading && (
            <div className="mt-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500 mr-2"></div>
              <span className="text-sm text-amber-700">Ricerca utenti interessati...</span>
            </div>
          )}

          {!loading && affectedUsers.length > 0 && !notificationsSent && (
            <div className="mt-3">
              <p className="text-sm text-amber-700 mb-2">
                <strong>{affectedUsers.length}</strong> utenti hanno selezionato questo piatto:
              </p>
              <ul className="text-sm text-amber-600 mb-3 max-h-32 overflow-y-auto">
                {affectedUsers.map((user, index) => (
                  <li key={index} className="flex justify-between">
                    <span>• {user.nome} {user.cognome}</span>
                    <span className="text-xs">({user.email})</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={sendNotifications}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Invia Notifiche
              </button>
            </div>
          )}

          {!loading && affectedUsers.length === 0 && (
            <p className="text-sm text-amber-700 mt-2">
              ✅ Nessun utente aveva selezionato questo piatto.
            </p>
          )}

          {notificationsSent && (
            <div className="mt-3 flex items-center text-green-700">
              <Check className="h-4 w-4 mr-2" />
              <span className="text-sm">Notifiche inviate con successo!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSystem;