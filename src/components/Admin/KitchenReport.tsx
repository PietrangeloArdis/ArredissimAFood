import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, ChefHat, AlertTriangle, Filter, Users, Utensils } from 'lucide-react';
import { MenuSelection } from '../../types';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const KitchenReport: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly'>('daily');
  const [mealCounts, setMealCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [absentCount, setAbsentCount] = useState(0);
  const [totalPeople, setTotalPeople] = useState(0);
  const [totalDishes, setTotalDishes] = useState(0);
  
  useEffect(() => {
    if (selectedDate) {
      if (selectedView === 'daily') {
        fetchDailyReport();
      } else {
        fetchWeeklyReport();
      }
    }
  }, [selectedDate, selectedView]);
  
  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(selectionsRef, where('date', '==', selectedDate));
      const querySnapshot = await getDocs(q);
      
      const counts: Record<string, number> = {};
      let absent = 0;
      let uniqueUsers = new Set();
      let totalDishCount = 0;
      
      querySnapshot.forEach((doc) => {
        const selection = doc.data() as MenuSelection;
        if (selection.selectedItems.length === 0) {
          absent++;
        } else {
          // Count unique users who made selections
          uniqueUsers.add(selection.userId);
          
          // Count dishes
          selection.selectedItems.forEach((item) => {
            counts[item] = (counts[item] || 0) + 1;
            totalDishCount++;
          });
        }
      });
      
      setMealCounts(counts);
      setAbsentCount(absent);
      setTotalPeople(uniqueUsers.size);
      setTotalDishes(totalDishCount);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyReport = async () => {
    setLoading(true);
    try {
      const selectionsRef = collection(db, 'menuSelections');
      const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      
      const q = query(
        selectionsRef,
        where('date', '>=', format(weekStart, 'yyyy-MM-dd')),
        where('date', '<=', format(weekEnd, 'yyyy-MM-dd'))
      );
      
      const querySnapshot = await getDocs(q);
      const counts: Record<string, number> = {};
      let absent = 0;
      let uniqueUsers = new Set();
      let totalDishCount = 0;
      
      querySnapshot.forEach((doc) => {
        const selection = doc.data() as MenuSelection;
        if (selection.selectedItems.length === 0) {
          absent++;
        } else {
          uniqueUsers.add(selection.userId);
          selection.selectedItems.forEach((item) => {
            counts[item] = (counts[item] || 0) + 1;
            totalDishCount++;
          });
        }
      });
      
      setMealCounts(counts);
      setAbsentCount(absent);
      setTotalPeople(uniqueUsers.size);
      setTotalDishes(totalDishCount);
    } catch (error) {
      console.error('Error fetching weekly report:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = () => {
    const reportType = selectedView === 'daily' ? 'giornaliero' : 'settimanale';
    const dateStr = selectedView === 'daily' 
      ? selectedDate
      : `${format(startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')}_${
          format(endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        }`;
    
    const csvContent = [
      ['Riepilogo', ''],
      ['Totale persone prenotate', totalPeople.toString()],
      ['Totale piatti selezionati', totalDishes.toString()],
      [''],
      ['Piatto', 'Totale Ordini'],
      ...Object.entries(mealCounts).map(([item, count]) => [item, count.toString()]),
      ['Nessuna Selezione (Assente)', absentCount.toString()]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `report-cucina-${reportType}-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Report esportato con successo');
  };

  const getDateRangeDisplay = () => {
    if (selectedView === 'daily') {
      return format(parseISO(selectedDate), 'd MMMM yyyy', { locale: it });
    } else {
      const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      return `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy', { locale: it })}`;
    }
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Report Cucina</h2>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ChefHat className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">
              {selectedView === 'daily' ? 'Report Giornaliero' : 'Report Settimanale'}
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Visualizza il numero totale di selezioni per ogni piatto per aiutare nella preparazione dei pasti.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Report
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSelectedView('daily')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedView === 'daily'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Giornaliero
                </button>
                <button
                  onClick={() => setSelectedView('weekly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedView === 'weekly'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Settimanale
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Seleziona {selectedView === 'daily' ? 'Data' : 'Settimana'}
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {selectedView === 'weekly' && (
              <p>Periodo: {getDateRangeDisplay()}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento report...</p>
          </div>
        ) : Object.keys(mealCounts).length > 0 || absentCount > 0 ? (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-800">Totale persone prenotate</p>
                    <p className="text-2xl font-semibold text-green-900">{totalPeople}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Utensils className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-800">Totale piatti selezionati</p>
                    <p className="text-2xl font-semibold text-blue-900">{totalDishes}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Piatto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totale Ordini
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(mealCounts).map(([item, count], index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {count}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Nessuna Selezione (Assenti)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {absentCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta Report
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">Nessuna selezione trovata</p>
            <p className="mt-1 text-sm text-gray-500">
              Non ci sono selezioni pasti per {selectedView === 'daily' ? 'il' : 'la settimana del'} {getDateRangeDisplay()}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenReport;