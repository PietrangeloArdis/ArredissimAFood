import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, RefreshCw, UserPlus, UserMinus, Check } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import toast from 'react-hot-toast';

interface FirestoreUser {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  role: string;
  active: boolean;
}

interface SyncData {
  db_only: FirestoreUser[];
  matched: Array<{
    id: string;
    email: string;
    dbData: {
      nome: string;
      cognome: string;
      role: string;
      active: boolean;
    };
  }>;
}

const UserSync: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const { currentUser } = useAuth();

  const checkSync = async () => {
    if (!currentUser) {
      toast.error('Devi essere autenticato per eseguire questa operazione');
      return;
    }

    setLoading(true);
    try {
      // Get all users from Firestore with proper type checking
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      if (usersSnapshot.empty) {
        setSyncData({
          db_only: [],
          matched: []
        });
        return;
      }

      const dbUsers: FirestoreUser[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || '',
        nome: doc.data().nome || '',
        cognome: doc.data().cognome || '',
        role: doc.data().role || 'user',
        active: doc.data().active ?? true
      }));

      // Create maps for comparison with type safety
      const dbMap = new Map<string, FirestoreUser>();
      dbUsers.forEach(user => {
        if (user.id && user.email) {
          dbMap.set(user.id, user);
        }
      });

      const syncResult: SyncData = {
        db_only: Array.from(dbMap.values()),
        matched: []
      };

      setSyncData(syncResult);
      toast.success('Controllo sincronizzazione completato');
    } catch (error) {
      console.error('Error checking sync:', error);
      // Ensure we set a valid state even on error
      setSyncData({
        db_only: [],
        matched: []
      });
      toast.error('Errore durante il controllo della sincronizzazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Controllo Sincronizzazione</h2>
        <button
          onClick={checkSync}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Controlla Sincronizzazione
        </button>
      </div>

      {syncData && (
        <div className="space-y-6">
          {/* Users in DB only */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Utenti nel Database ({syncData.db_only.length})
            </h3>
            {syncData.db_only.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ruolo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncData.db_only.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.nome} {user.cognome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Amministratore' : 'Utente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? 'Attivo' : 'Disattivato'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Nessun utente trovato nel database</div>
            )}
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Totale Utenti: {syncData.db_only.length}
              </h3>
            </div>
          </div>
        </div>
      )}

      {!syncData && !loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className="text-gray-600">
            Clicca su "Controlla Sincronizzazione" per verificare lo stato degli utenti
          </p>
        </div>
      )}
    </div>
  );
};

export default UserSync;