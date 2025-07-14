import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const { login, register, isAdmin, checkEmailExists, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isRegistering) {
        if (!nome.trim() || !cognome.trim()) {
          throw new Error('Nome e Cognome sono obbligatori');
        }
        
        const exists = await checkEmailExists(email);
        if (exists) {
          throw new Error('Hai già un account. Effettua il login per continuare.');
        }
        
        await register(email, password, nome, cognome);
        toast.success('Registrazione completata con successo!');
        setIsRegistering(false);
      } else {
        await login(email, password);
        toast.success('Accesso effettuato con successo!');
        
        // CRITICAL FIX: Always redirect to Home after login
        navigate('/home');
      }
    } catch (err: any) {
      let errorMessage = 'Errore durante l\'autenticazione';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Hai già un account. Effettua il login per continuare.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email non valida';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password troppo debole';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Email o password non corretti';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    
    try {
      await sendPasswordReset(resetEmail);
      toast.success('Se l\'indirizzo email è corretto, riceverai un link per reimpostare la password.');
      setResetModalOpen(false);
      setResetEmail('');
    } catch (error) {
      toast.error('Errore nell\'invio dell\'email di reset');
    } finally {
      setResetLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img 
            src="https://www.arredissima.com/wp-content/uploads/logo-arredissima.svg" 
            alt="ArredissimA Food"
            className="h-12 sm:h-16 mx-auto"
          />
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900">
            ArredissimA Food
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRegistering ? 'Crea il tuo account' : 'Accedi al tuo account'}
          </p>
        </div>
        
        <form className="mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegistering && (
              <>
                <div className="mb-4">
                  <label htmlFor="nome\" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    required={isRegistering}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-sm sm:text-base"
                    placeholder="Nome"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="cognome" className="block text-sm font-medium text-gray-700 mb-1">
                    Cognome
                  </label>
                  <input
                    id="cognome"
                    name="cognome"
                    type="text"
                    required={isRegistering}
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-sm sm:text-base"
                    placeholder="Cognome"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">Indirizzo email</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-r-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-sm sm:text-base"
                  placeholder="Indirizzo email"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-sm sm:text-base"
                placeholder="Password"
              />
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Elaborazione...' : (isRegistering ? 'Registrati' : 'Accedi')}
            </button>
          </div>
          
          <div className="flex flex-col items-center space-y-2 text-sm">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-green-600 hover:text-green-500"
            >
              {isRegistering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
            {!isRegistering && (
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="text-green-600 hover:text-green-500"
              >
                Hai dimenticato la password?
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={resetModalOpen} onClose={() => setResetModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-4 sm:p-6 shadow-xl">
            <Dialog.Title className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Reimposta la tua password
            </Dialog.Title>
            
            <form onSubmit={handlePasswordReset}>
              <div className="mb-4">
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-sm sm:text-base"
                  placeholder="Inserisci il tuo indirizzo email"
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {resetLoading ? 'Invio in corso...' : 'Invia link di reimpostazione'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Login;