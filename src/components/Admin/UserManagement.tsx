import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, auth, functions } from '../../firebase/config';
import { User } from '../../types';
import { Users, AlertTriangle, Shield, ShieldOff, UserX, UserCheck, Filter, Pencil, X, Trash2 } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';

interface EditUserData {
  id: string;
  nome: string;
  cognome: string;
  email: string;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  user,
  onConfirm,
  isDeleting
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium text-red-900 mb-4">
            Conferma eliminazione utente
          </Dialog.Title>
          
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Stai per eliminare definitivamente l'utente:
            </p>
            <div className="mt-2 p-4 bg-gray-50 rounded-md">
              <p className="font-medium text-gray-900">{user.nome} {user.cognome}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <p className="mt-4 text-sm text-red-600">
              Questa azione è irreversibile. L'utente sarà eliminato permanentemente dal sistema
              e perderà l'accesso all'applicazione.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isDeleting}
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina Definitivamente'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const userData: User[] = [];
      usersSnapshot.forEach((doc) => {
        userData.push({
          id: doc.id,
          ...doc.data()
        } as User);
      });
      
      setUsers(userData.sort((a, b) => a.email.localeCompare(b.email)));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Errore nel caricamento degli utenti');
    }
  };
  
  const handleRoleChange = async (user: User) => {
    try {
      setActionInProgress(user.id);
      const userRef = doc(db, 'users', user.id);
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      await updateDoc(userRef, {
        role: newRole
      });
      
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));
      
      toast.success(`Ruolo aggiornato con successo: ${newRole === 'admin' ? 'Amministratore' : 'Utente'}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Errore nell\'aggiornamento del ruolo');
    } finally {
      setActionInProgress(null);
    }
  };
  
  const handleToggleActive = async (user: User) => {
    try {
      setActionInProgress(user.id);
      const userRef = doc(db, 'users', user.id);
      const newActive = !user.active;
      
      await updateDoc(userRef, {
        active: newActive
      });
      
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, active: newActive } : u
      ));
      
      toast.success(newActive ? 'Utente riattivato con successo' : 'Utente disattivato con successo');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Errore nella modifica dello stato utente');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setActionInProgress(editingUser.id);
      const userRef = doc(db, 'users', editingUser.id);
      
      await updateDoc(userRef, {
        nome: editingUser.nome,
        cognome: editingUser.cognome
      });

      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, nome: editingUser.nome, cognome: editingUser.cognome }
          : u
      ));

      toast.success('Dettagli utente aggiornati con successo');
      setEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user details:', error);
      toast.error('Errore nell\'aggiornamento dei dettagli utente');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('[Delete] No authenticated user found');
      toast.error('Devi essere autenticato per eseguire questa operazione');
      return;
    }

    console.log('[Delete] Current user:', auth.currentUser.uid);
    console.log('[Delete] Attempting to delete user:', userToDelete.id);

    setIsDeleting(true);

    try {
      const deleteUserAsAdmin = httpsCallable(functions, 'deleteUserAsAdmin');
      console.log('[Delete] Calling deleteUserAsAdmin function...');
      
      const result = await deleteUserAsAdmin({ targetUid: userToDelete.id });
      console.log('[Delete] Function result:', result.data);

      // Update local state
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success('Utente eliminato definitivamente');
      setDeleteModalOpen(false);
    } catch (error: any) {
      console.error('[Delete] Error:', error);
      
      let errorMessage = 'Errore durante l\'eliminazione dell\'utente';
      
      if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Devi essere autenticato per eseguire questa operazione';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Non hai i permessi necessari per eseguire questa operazione';
      } else if (error.code === 'functions/not-found') {
        errorMessage = 'Utente non trovato';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };
  
  const filteredUsers = users.filter(user => {
    switch (filterStatus) {
      case 'active':
        return user.active;
      case 'inactive':
        return !user.active;
      default:
        return true;
    }
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const inactiveUsers = users.filter(u => !u.active).length;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Gestione Utenti</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{filteredUsers.length} utenti su {totalUsers} mostrati</span>
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-48 pl-10 pr-4 py-2 text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Mostra tutti ({totalUsers})</option>
              <option value="active">Solo attivi ({activeUsers})</option>
              <option value="inactive">Solo disattivati ({inactiveUsers})</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">Gestione Utenti</h3>
            <p className="mt-1 text-sm text-blue-700">
              Gestisci i ruoli degli utenti e il loro stato di attivazione nel sistema.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento utenti...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.active ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">
                            {user.nome} {user.cognome}
                          </span>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="ml-2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-500"
                            title="Modifica dettagli"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRoleChange(user)}
                        disabled={actionInProgress === user.id || !user.active}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'admin'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } ${(!user.active || actionInProgress === user.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {user.role === 'admin' ? (
                          <>
                            <ShieldOff className="h-4 w-4 mr-1" />
                            Rimuovi Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Promuovi a Admin
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? 'Attivo' : 'Disattivato'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={actionInProgress === user.id}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                            user.active
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          } ${actionInProgress === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {user.active ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Disattiva
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Riattiva
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">Nessun utente trovato</p>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'active' && 'Non ci sono utenti attivi.'}
              {filterStatus === 'inactive' && 'Non ci sono utenti disattivati.'}
              {filterStatus === 'all' && 'Non ci sono utenti nel sistema.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Modifica Dettagli Utente
            </Dialog.Title>
            
            {editingUser && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="nome"
                    value={editingUser.nome}
                    onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="cognome" className="block text-sm font-medium text-gray-700">
                    Cognome
                  </label>
                  <input
                    type="text"
                    id="cognome"
                    value={editingUser.cognome}
                    onChange={(e) => setEditingUser({ ...editingUser, cognome: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={editingUser.email}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm"
                  />
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={actionInProgress === editingUser?.id}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Salva Modifiche
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          user={userToDelete}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default UserManagement;