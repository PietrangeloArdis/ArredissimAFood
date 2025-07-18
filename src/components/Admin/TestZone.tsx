// src/components/Admin/TestZone.tsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Mail, Send, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const TestZone: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSendTestEmail = async () => {
    if (!currentUser?.email) {
      toast.error("Impossibile trovare il tuo indirizzo email per il test.");
      return;
    }
    setLoading(true);
    toast.loading('Invio email di test in corso...');

    const notifyUsers = httpsCallable(functions, 'notifyUsersOnMenuChange');

    const testData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'created',
      menuItems: ['Piatto di Prova 1', 'Secondo di Prova', 'Contorno di Prova'],
      testEmail: currentUser.email // Invia solo all'admin corrente
    };

    try {
      await notifyUsers(testData);
      toast.dismiss();
      toast.success(`Email di test inviata con successo a ${currentUser.email}`);
    } catch (error) {
      console.error("Errore nell'invio dell'email di test:", error);
      toast.dismiss();
      toast.error("Si è verificato un errore durante l'invio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
          <Mail className="h-5 w-5 mr-2 text-blue-500" />
          Test Invio Notifiche Email
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Clicca il pulsante qui sotto per inviare un'email di prova di un "Nuovo Menù" al tuo indirizzo di amministratore ({currentUser?.email}). Questo ti permette di verificare che il sistema di invio funzioni correttamente senza notificare tutti gli utenti.
        </p>
        <div className="flex justify-start">
          <button
            onClick={handleSendTestEmail}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Invio in corso...' : 'Invia Email di Test'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Assicurati di aver configurato correttamente le credenziali SMTP e di aver fatto il deploy delle Cloud Functions per far funzionare questo test.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestZone;