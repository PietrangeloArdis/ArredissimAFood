import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuSelection, User } from '../../types';
import { FileText, Download, Calendar as CalendarIcon, Users } from 'lucide-react';
import toast from 'react-hot-toast';

/** =========================
 *  Helper Date & Normalizer
 *  ========================= */
const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // YYYY-MM-DD in locale, senza shift UTC
};

const normalizeSelectionDate = (selection: any): string | null => {
  // Caso 1: date salvata come stringa "YYYY-MM-DD" o ISO -> prendo i primi 10 char
  if (typeof selection?.date === 'string') {
    return selection.date.slice(0, 10);
  }

  // Caso 2: date salvata come Timestamp Firestore
  const ts =
    selection?.date?.toDate
      ? selection.date
      : selection?.data?.toDate
      ? selection.data
      : null;

  if (ts) {
    const dt: Date = ts.toDate();
    // normalizzo al giorno locale (scarto ore/minuti)
    const localDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    return toLocalISO(localDay);
  }

  return null;
};

const ExportData: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [year, setYear] = useState<number>(2025);
  const [month, setMonth] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const prezzoPastoperGiorno = 2; // 🔹 prezzo per ogni giorno di presenza

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
          ...doc.data(),
        } as User);
      });

      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getUserEmail = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user ? user.email : 'Utente Sconosciuto';
  };

  const getUserName = (userId: string): { nome: string; cognome: string } => {
    const user = users.find((u) => u.id === userId);
    return {
      nome: user?.nome || 'Nome Sconosciuto',
      cognome: user?.cognome || 'Cognome Sconosciuto',
    };
  };

  /** =========================
   *  Export: Report Dettagliato
   *  ========================= */
  const handleDetailedExport = async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startDateStr = toLocalISO(startDate);
      const endDateStr = toLocalISO(endDate);

      const selectionsRef = collection(db, 'menuSelections');

      // 1) Provo query su campo stringa "date"
      let selectionsDocs = (
        await getDocs(
          query(
            selectionsRef,
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
          )
        )
      ).docs;

      // 2) Fallback: se non torna nulla, prendo tutto e filtro via normalizer (gestisce Timestamp)
      if (selectionsDocs.length === 0) {
        const allDocs = await getDocs(selectionsRef);
        selectionsDocs = allDocs.docs.filter((d) => {
          const ds = normalizeSelectionDate(d.data());
          return !!ds && ds >= startDateStr && ds <= endDateStr;
        });
      }

      // preparo CSV
      let csvContent = 'Data,Utente,Piatti Scelti\n';

      selectionsDocs.forEach((docSnap) => {
        const selection = docSnap.data() as any as MenuSelection;
        const dateStr = normalizeSelectionDate(selection);
        if (!dateStr) return;
        const user = getUserEmail(selection.userId);
        const items = Array.isArray(selection.selectedItems)
          ? selection.selectedItems.join(', ')
          : '';
        csvContent += `${dateStr},${user},"${items}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dettaglio-pasti-${year}-${month + 1}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('Esportazione dettagliata completata con successo');
    } catch (error) {
      console.error('Error exporting detailed data:', error);
      toast.error("Errore durante l'esportazione dei dati dettagliati");
    } finally {
      setLoading(false);
    }
  };

  /** =========================
   *  Export: Riepilogo Mensile per Utente
   *  ========================= */
  const handleMonthlySummaryExport = async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startDateStr = toLocalISO(startDate);
      const endDateStr = toLocalISO(endDate);

      const selectionsRef = collection(db, 'menuSelections');

      let selectionsDocs = (
        await getDocs(
          query(
            selectionsRef,
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
          )
        )
      ).docs;

      if (selectionsDocs.length === 0) {
        const allDocs = await getDocs(selectionsRef);
        selectionsDocs = allDocs.docs.filter((d) => {
          const ds = normalizeSelectionDate(d.data());
          return !!ds && ds >= startDateStr && ds <= endDateStr;
        });
      }

      // Mappa userId -> Set(dateStr) per dedup giornaliero
      const userAttendance = new Map<string, Set<string>>();

      selectionsDocs.forEach((docSnap) => {
        const selection = docSnap.data() as any as MenuSelection;
        const dateStr = normalizeSelectionDate(selection);
        if (!dateStr) return;

        if (Array.isArray(selection.selectedItems) && selection.selectedItems.length > 0) {
          if (!userAttendance.has(selection.userId)) {
            userAttendance.set(selection.userId, new Set());
          }
          userAttendance.get(selection.userId)!.add(dateStr);
        }
      });

      const monthNames = [
        'Gennaio',
        'Febbraio',
        'Marzo',
        'Aprile',
        'Maggio',
        'Giugno',
        'Luglio',
        'Agosto',
        'Settembre',
        'Ottobre',
        'Novembre',
        'Dicembre',
      ];

      let csvContent = 'Nome,Cognome,Mese,Giorni di Presenza\n';
      userAttendance.forEach((dates, userId) => {
        const { nome, cognome } = getUserName(userId);
        csvContent += `${nome},${cognome},${monthNames[month]},${dates.size}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `riepilogo-mensile-${year}-${month + 1}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('Riepilogo mensile esportato con successo');
    } catch (error) {
      console.error('Error exporting monthly summary:', error);
      toast.error("Errore durante l'esportazione del riepilogo mensile");
    } finally {
      setLoading(false);
    }
  };

  /** =========================
   *  Export: Presenze Giornaliero (x per giorno, utenti ordinati)
   *  ========================= */
  const handleDailyPresenceExport = async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startDateStr = toLocalISO(startDate);
      const endDateStr = toLocalISO(endDate);

      const selectionsRef = collection(db, 'menuSelections');

      let selectionsDocs = (
        await getDocs(
          query(
            selectionsRef,
            where('date', '>=', startDateStr),
            where('date', '<=', endDateStr)
          )
        )
      ).docs;

      if (selectionsDocs.length === 0) {
        const allDocs = await getDocs(selectionsRef);
        selectionsDocs = allDocs.docs.filter((d) => {
          const ds = normalizeSelectionDate(d.data());
          return !!ds && ds >= startDateStr && ds <= endDateStr;
        });
      }

      // userId -> Set(dateStr) per dedup per giorno
      const userAttendance = new Map<string, Set<string>>();

      selectionsDocs.forEach((docSnap) => {
        const selection = docSnap.data() as any as MenuSelection;
        const dateStr = normalizeSelectionDate(selection);
        if (!dateStr) return;

        if (Array.isArray(selection.selectedItems) && selection.selectedItems.length > 0) {
          if (!userAttendance.has(selection.userId)) {
            userAttendance.set(selection.userId, new Set());
          }
          userAttendance.get(selection.userId)!.add(dateStr);
        }
      });

      const daysInMonth = endDate.getDate();
      let csvContent = 'Progressivo,Utente';
      for (let d = 1; d <= daysInMonth; d++) csvContent += `,${d}`;
      csvContent += ',Totale Presenze,Totale Euro\n';

      // 🔹 utenti ordinati per Cognome (e Nome) A→Z
      const sortedUsers = users
        .filter((u) => (u as any).active !== false) // includo tutti salvo active=false
        .slice()
        .sort((a, b) => {
          const ac = (a.cognome || '').trim();
          const bc = (b.cognome || '').trim();
          const cmpC = ac.localeCompare(bc, 'it', { sensitivity: 'base' });
          if (cmpC !== 0) return cmpC;
          const an = (a.nome || '').trim();
          const bn = (b.nome || '').trim();
          return an.localeCompare(bn, 'it', { sensitivity: 'base' });
        });

      let counter = 1;
      sortedUsers.forEach((user) => {
        const { nome, cognome } = getUserName(user.id);
        const attendance = userAttendance.get(user.id) || new Set<string>();
        let row = `${counter},"${nome} ${cognome}"`;
        let totalPresenze = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = toLocalISO(new Date(year, month, d));
          if (attendance.has(dateStr)) {
            row += ',x'; // 🔹 minuscola
            totalPresenze++;
          } else {
            row += ',';
          }
        }

        const totaleEuro = totalPresenze * prezzoPastoperGiorno;
        row += `,${totalPresenze},${totaleEuro}`;
        csvContent += row + '\n';
        counter++;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presenze-giornaliere-${year}-${month + 1}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('Report presenze giornaliere esportato con successo');
    } catch (error) {
      console.error('Error exporting daily presence data:', error);
      toast.error("Errore durante l'esportazione del report presenze");
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'Gennaio',
    'Febbraio',
    'Marzo',
    'Aprile',
    'Maggio',
    'Giugno',
    'Luglio',
    'Agosto',
    'Settembre',
    'Ottobre',
    'Novembre',
    'Dicembre',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Esporta Dati</h2>
      </div>

      <div className="space-y-6">
        {/* Period Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Periodo di Riferimento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Anno
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>

            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                Mese
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Summary Export */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start mb-4">
            <Users className="h-6 w-6 text-blue-500 mt-1" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Riepilogo Mensile per Utente</h3>
              <p className="mt-1 text-sm text-gray-500">
                Genera un report mensile che mostra il numero di giorni di presenza per ogni utente.
                Utile per la fatturazione e il monitoraggio delle presenze.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleMonthlySummaryExport}
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Riepilogo Mensile
            </button>
          </div>
        </div>

        {/* Detailed Export */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-blue-500 mt-1" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Report Dettagliato Giornaliero</h3>
              <p className="mt-1 text-sm text-gray-500">
                Esporta un report dettagliato con tutte le selezioni giornaliere del mese,
                includendo data, utente e piatti selezionati.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleDetailedExport}
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Report Dettagliato
            </button>
          </div>
        </div>

        {/* Daily Presence Export */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start mb-4">
            <FileText className="h-6 w-6 text-green-500 mt-1" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Report Presenze Giornaliero</h3>
              <p className="mt-1 text-sm text-gray-500">
                Una colonna per ogni giorno del mese con X sulle presenze e totale in euro.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDailyPresenceExport}
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta Presenze Giornaliero
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <CalendarIcon className="h-4 w-4 inline mr-1" />
        L'esportazione includerà i dati dal 1 {monthNames[month]} {year} al{' '}
        {new Date(year, month + 1, 0).getDate()} {monthNames[month]} {year}.
      </div>
    </div>
  );
};

export default ExportData;
