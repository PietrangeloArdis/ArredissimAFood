import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { MenuSelection } from '../../types';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const WeeklySummary: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    fetchWeekSelections();
  }, [currentUser, currentWeek]);

  const fetchWeekSelections = async () => {
    try {
      setLoading(true);
      setIndexError(false);
      const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const end = endOfWeek(currentWeek, { weekStartsOn: 1 });

      const selectionsRef = collection(db, 'menuSelections');
      const q = query(
        selectionsRef,
        where('userId', '==', currentUser?.uid),
        where('date', '>=', format(start, 'yyyy-MM-dd')),
        where('date', '<=', format(end, 'yyyy-MM-dd'))
      );

      const querySnapshot = await getDocs(q);
      const weekSelections: Record<string, string[]> = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as MenuSelection;
        weekSelections[data.date] = data.selectedItems;
      });

      setSelections(weekSelections);
    } catch (error: any) {
      console.error('Error fetching week selections:', error);
      
      // Check if the error is related to missing index
      if (error.message?.includes('requires an index')) {
        setIndexError(true);
        toast.error('Il sistema sta preparando i dati. Riprova tra qualche minuto.');
      } else {
        toast.error('Errore nel caricamento delle selezioni');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  }).filter(day => !isWeekend(day));

  if (indexError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Preparazione dati in corso
          </h3>
          <p className="text-gray-600 mb-4">
            Il sistema sta preparando i dati per la prima volta. 
            Questo processo richiede alcuni minuti.
          </p>
          <button
            onClick={fetchWeekSelections}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Le mie scelte</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            Settimana del {format(weekDays[0], 'd MMMM yyyy', { locale: it })}
          </span>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giorno
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scelta
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const daySelections = selections[dateStr] || [];

                return (
                  <tr key={dateStr} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {format(day, 'EEEE', { locale: it })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(day, 'd MMMM', { locale: it })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {daySelections.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {daySelections.map((item, index) => (
                            <li key={index} className="text-sm text-gray-900">
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          Nessuna scelta
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklySummary;