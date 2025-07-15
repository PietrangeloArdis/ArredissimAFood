import React, { useState, useEffect } from 'react';
import { format, isWeekend, parseISO, isValid, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar as CalendarIcon, TrendingUp, Star, Users, Utensils, Clock } from 'lucide-react';
import './calendar.css';
import { MenuOptions } from '../../types';
import CustomCalendar from './CustomCalendar';
import toast from 'react-hot-toast';

const MealCalendar: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [userSelections, setUserSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSelections: 0,
    upcomingMeals: 0,
    missingSelections: 0,
    availableMenus: 0
  });
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Imposta la data iniziale al giorno corrente
const initialDate = new Date();
  
  useEffect(() => {
    if (!currentUser) return;
    fetchData();
  }, [currentUser, refreshKey]);

  // Listen for meal selection updates and force refresh
  useEffect(() => {
    const handleMealSelectionUpdate = (event: CustomEvent) => {
      // Force immediate refresh of all data
      setRefreshKey(prev => prev + 1);
      
      // Also update the specific date in local state immediately
      const { date, items } = event.detail;
      setUserSelections(prev => {
        const updated = { ...prev };
        if (items && items.length > 0) {
          updated[date] = items;
        } else {
          // Remove the date if no items selected
          delete updated[date];
        }
        return updated;
      });
    };

    window.addEventListener('mealSelectionUpdated', handleMealSelectionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('mealSelectionUpdated', handleMealSelectionUpdate as EventListener);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchAvailableMenus(),
        fetchUserSelections()
      ]);
    } catch (error) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableMenus = async () => {
    try {
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);

      if (menusSnapshot.empty) {
        setAvailableMenus({});
        if (!isAdmin) {
          setError('Nessun menù trovato nel database');
        }
        return;
      }
      
      const menus: Record<string, string[]> = {};
      menusSnapshot.forEach((doc) => {
        const menuData = doc.data() as MenuOptions;
        menus[menuData.date] = menuData.availableItems;
      });
      
      setAvailableMenus(menus);
      
      // Update available menus count
      setStats(prev => ({ 
        ...prev, 
        availableMenus: Object.keys(menus).length 
      }));
    } catch (error) {
      setError('Errore caricamento menù: ' + (error?.message || 'Errore sconosciuto'));
      throw error;
    }
  };
  
  const fetchUserSelections = async () => {
    try {
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(selectionsRef, where('userId', '==', currentUser?.uid));
      const selectionsSnapshot = await getDocs(q);
      
      const selections: Record<string, string[]> = {};
      let totalSelections = 0;
      
      selectionsSnapshot.forEach((doc) => {
        const selectionData = doc.data();
        // Only store selections that have dishes selected
        if (selectionData.selectedItems && selectionData.selectedItems.length > 0) {
          selections[selectionData.date] = selectionData.selectedItems;
          totalSelections++;
        }
      });
      
      setUserSelections(selections);
      
      // Calculate stats
      const today = new Date();
      const upcomingMeals = Object.keys(selections).filter(date => 
        new Date(date) > today
      ).length;
      
      // Calculate missing selections (future dates with menus but no selections)
      const futureMenuDates = Object.keys(availableMenus).filter(date => 
        new Date(date) > today && !isWeekend(new Date(date))
      );
      const missingSelections = futureMenuDates.filter(date => 
        !selections[date]
      ).length;
      
      setStats(prev => ({
        ...prev,
        totalSelections,
        upcomingMeals,
        missingSelections
      }));
    } catch (error) {
      throw error;
    }
  };
  
  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const isWeekendDay = isWeekend(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);
    const isPastDate = clickedDate < today;
    const hasMenu = availableMenus[formattedDate]?.length > 0;
    
    if (isWeekendDay) {
      return;
    }
    
    // For admin users, allow clicking on any future weekday
    if (isAdmin) {
      if (isPastDate) {
        toast.error('Non è possibile modificare menù per date passate');
        return;
      }
      
      // For admin, redirect to menu management if no menu exists
      if (!hasMenu) {
        navigate('/admin');
        // Store the selected date for the admin to use
        sessionStorage.setItem('adminSelectedDate', formattedDate);
        toast('Reindirizzamento alla gestione menù per creare un nuovo menù', {
          icon: '📋',
          duration: 4000,
        });
        return;
      }
    } else {
      // For regular users, only allow if there's a menu and it's not past
      if (isPastDate) {
        return;
      }
      
      if (!hasMenu) {
        toast.error('Nessun menù disponibile per questo giorno');
        return;
      }
    }
    
    try {
      const currentSelections = userSelections[formattedDate] || [];
      openModal(date, currentSelections);
    } catch (error) {
      toast.error('Errore nell\'apertura del modal');
    }
  };

  const handleWeeklyView = (date: Date) => {
    navigate('/calendar/weekly', { state: { startDate: date } });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento calendario...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error (but not for admin with empty database)
  if (error && !isAdmin) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Calendario Pasti
          </h1>
          <p className="text-gray-600 mb-4">
            Gestisci le tue prenotazioni per la mensa aziendale
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">
                Errore caricamento menù
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  fetchData();
                }}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Header with stats */}
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Calendario Pasti
          {isAdmin && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              👑 Admin
            </span>
          )}
        </h1>
        <p className="text-gray-600 mb-4">
          {isAdmin 
            ? 'Gestisci i menù e visualizza le prenotazioni'
            : 'Gestisci le tue prenotazioni per la mensa aziendale'
          }
        </p>
        
        {/* Admin instructions */}
        {isAdmin && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Modalità Admin:</strong> Clicca su giorni senza menù per crearli, o su giorni con menù per modificarli.
            </p>
          </div>
        )}
        
        {/* Compact Quick stats - only for regular users */}
        {!isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto mb-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 shadow-sm border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center mb-1">
                <div className="p-1.5 bg-green-500 rounded-full">
                  <Utensils className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-green-600">{stats.totalSelections}</div>
              <div className="text-xs text-green-700 font-medium">Prenotati</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center mb-1">
                <div className="p-1.5 bg-blue-500 rounded-full">
                  <Clock className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-blue-600">{stats.upcomingMeals}</div>
              <div className="text-xs text-blue-700 font-medium">Prossimi</div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 shadow-sm border border-amber-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center mb-1">
                <div className="p-1.5 bg-amber-500 rounded-full">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-600">{stats.missingSelections}</div>
              <div className="text-xs text-amber-700 font-medium">Mancanti</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center mb-1">
                <div className="p-1.5 bg-purple-500 rounded-full">
                  <CalendarIcon className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.availableMenus}</div>
              <div className="text-xs text-purple-700 font-medium">Disponibili</div>
            </div>
          </div>
        )}

        {/* Compact Call to action for missing selections - only for regular users */}
        {!isAdmin && stats.missingSelections > 0 && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-center space-x-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold text-sm">
                Hai {stats.missingSelections} prenotazioni mancanti!
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Non dimenticare di prenotare i tuoi pasti.
            </p>
          </div>
        )}
      </div>

      {/* Compact Calendar */}
      <div className="max-w-4xl mx-auto">
        <CustomCalendar
          value={initialDate}
          onClickDay={handleDateClick}
          minDate={initialDate}
          maxDate={new Date(2025, 11, 31)} // December 31, 2025
          availableMenus={availableMenus}
          userSelections={userSelections}
        />

        {/* Compact Action buttons - only for regular users */}
        {!isAdmin && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => handleWeeklyView(new Date())}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation hover:scale-105"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Vista Settimanale
            </button>
            
            <button
              onClick={() => navigate('/calendar/monthly')}
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation hover:scale-105"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Riepilogo Mensile
            </button>
          </div>
        )}

        {/* Admin action buttons */}
        {isAdmin && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all duration-200 touch-manipulation hover:scale-105"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Gestione Menù
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealCalendar;