import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { cleanupInconsistentSelections } from '../../utils/cleanupSelections';
import toast from 'react-hot-toast';

const CleanupTool: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<{
    cleaned: number;
    errors: number;
    timestamp: string;
  } | null>(null);

  const handleCleanup = async () => {
    if (!confirm(
      'Questa operazione rimuoverà automaticamente tutti i piatti non più disponibili ' +
      'dalle selezioni degli utenti. Continuare?'
    )) {
      return;
    }

    setLoading(true);
    try {
      const result = await cleanupInconsistentSelections();
      
      setLastCleanup({
        ...result,
        timestamp: new Date().toISOString()
      });

      if (result.cleaned > 0) {
        toast.success(`Pulizia completata: ${result.cleaned} selezioni corrette`);
      } else {
        toast.success('Nessuna inconsistenza trovata');
      }

      if (result.errors > 0) {
        toast.error(`${result.errors} errori durante la pulizia`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Errore durante la pulizia delle selezioni');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start mb-4">
        <AlertTriangle className="h-6 w-6 text-amber-500 mt-1 mr-3" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Pulizia Selezioni Inconsistenti
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Rimuove automaticamente i piatti non più disponibili dalle selezioni degli utenti.
            Utile dopo aver modificato i menù o rimosso piatti dal sistema.
          </p>
        </div>
      </div>

      {lastCleanup && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Ultima pulizia:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span>{lastCleanup.cleaned} selezioni corrette</span>
            </div>
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <span>{lastCleanup.errors} errori</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {new Date(lastCleanup.timestamp).toLocaleString('it-IT')}
          </p>
        </div>
      )}

      <button
        onClick={handleCleanup}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Pulizia in corso...' : 'Avvia Pulizia'}
      </button>
    </div>
  );
};

export default CleanupTool;