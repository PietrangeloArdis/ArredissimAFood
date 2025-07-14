import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Calendar, ClipboardList, PieChart, ArrowRight, Star, ChevronLeft, ChevronRight, Utensils, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, addWeeks, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import NotificationBanner from './User/NotificationBanner';
import RatingReminder from './User/RatingReminder';
import { useMenuData } from '../hooks/useMenuData';
import { useUserSelections } from '../hooks/useUserSelections';
import { calculateWeeklyStats } from '../utils/mealSelectionUtils';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userFullName } = useAuth();
  const { openModal } = useModal();
  const { availableMenus } = useMenuData();
  const { userSelections, refetch } = useUserSelections();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [recentMeals, setRecentMeals] = useState<Array<{ date: string; dishes: string[] }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date("2025-06-10");

  useEffect(() => {
    if (currentUser) {
      fetchRecentMeals();
    }
  }, [currentUser, refreshKey]);

  useEffect(() => {
    const handleMealSelectionUpdate = async (event: CustomEvent) => {
  await refetch(); // 🔄 aggiorna le selezioni da Firestore
  setRefreshKey(prev => prev + 1); // 🔁 forza re-render
};


    window.addEventListener('mealSelectionUpdated', handleMealSelectionUpdate as EventListener);
    return () => {
      window.removeEventListener('mealSelectionUpdated', handleMealSelectionUpdate as EventListener);
    };
  }, []);

  const fetchRecentMeals = async () => {
    // This would be moved to a custom hook in a real refactor
    // For now, keeping it simple since it's specific to Home component
    const meals = Object.entries(userSelections)
      .filter(([_, dishes]) => dishes.length > 0)
      .map(([date, dishes]) => ({ date, dishes }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    setRecentMeals(meals);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1);
    setCurrentWeek(newDate);
  };

  const handleDayClick = (date: Date) => {
    if (isWeekend(date)) return;
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const hasMenu = availableMenus[formattedDate]?.length > 0;
    
    if (!hasMenu) {
      toast.error('Nessun menù disponibile per questo giorno');
      return;
    }
    
    const currentSelections = userSelections[formattedDate] || [];
    openModal(date, currentSelections);
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  }).filter(day => !isWeekend(day));

  const weeklyStats = calculateWeeklyStats(weekDays, availableMenus, userSelections, today);

  const navigationCards = [
    {
      title: 'Calendario Pasti',
      description: 'Seleziona i tuoi pasti per i prossimi giorni',
      icon: Calendar,
      route: '/calendar',
      color: 'bg-green-500'
    },
    {
      title: 'Vista Settimanale',
      description: 'Visualizza e modifica le tue scelte settimanali',
      icon: ClipboardList,
      route: '/calendar/weekly',
      color: 'bg-blue-500'
    },
    {
      title: 'Riepilogo Mensile',
      description: 'Analizza le tue statistiche mensili',
      icon: PieChart,
      route: '/calendar/monthly',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <NotificationBanner />
        <RatingReminder />

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl shadow-lg p-6 sm:p-8 mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Benvenuto{userFullName ? `, ${userFullName}` : ''}!
              </h1>
              <p className="text-lg text-white/90">
                Gestisci le tue scelte per la mensa aziendale
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30">
                <Utensils className="h-4 w-4 mr-1" />
                Utente Attivo
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-400/20 text-yellow-100 border border-yellow-300/30">
                <Star className="h-4 w-4 mr-1" />
                {weeklyStats.prenotati} pasti questa settimana
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-500" />
              Settimana
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-600 min-w-0">
                <span className="hidden sm:inline">
                  {format(weekDays[0], 'd MMMM', { locale: it })} - {format(weekDays[weekDays.length - 1], 'd MMMM yyyy', { locale: it })}
                </span>
                <span className="sm:hidden">
                  {format(weekDays[0], 'd MMM')} - {format(weekDays[weekDays.length - 1], 'd MMM')}
                </span>
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Weekday circles */}
          <div className="flex justify-center space-x-3 sm:space-x-6 mb-6">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const daySelections = userSelections[dateStr] || [];
              const hasMenu = availableMenus[dateStr]?.length > 0;
              const dayLetter = format(day, 'EEEEE', { locale: it }).toUpperCase();
              const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

              return (
                <div key={dateStr} className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => handleDayClick(day)}
                    disabled={!hasMenu}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                      daySelections.length > 0
                        ? 'bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-105'
                        : hasMenu
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-105 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    } ${isToday ? 'ring-4 ring-yellow-300 ring-opacity-50' : ''}`}
                  >
                    {dayLetter}
                  </button>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-700">
                      {format(day, 'd')}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      daySelections.length > 0
                        ? 'bg-green-100 text-green-700 font-medium'
                        : hasMenu
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {daySelections.length > 0 ? 'Prenotato' : hasMenu ? 'Disponibile' : 'N/A'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats boxes */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-green-500 rounded-full">
                  <Utensils className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">{weeklyStats.prenotati}</div>
              <div className="text-sm text-green-700 font-medium">Prenotati</div>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-amber-500 rounded-full">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600">{weeklyStats.daPrenotare}</div>
              <div className="text-sm text-amber-700 font-medium">Da prenotare</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-blue-500 rounded-full">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{weeklyStats.disponibili}</div>
              <div className="text-sm text-blue-700 font-medium">Disponibili</div>
            </div>
          </div>
        </div>

        {/* Weekly dishes section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            I tuoi piatti della settimana
          </h3>
          
          {Object.keys(userSelections).length > 0 ? (
            <div className="space-y-3">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const daySelections = userSelections[dateStr];
                
                if (!daySelections || daySelections.length === 0) return null;
                
                return (
                  <div key={dateStr} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">
                          {format(day, 'dd')}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'EEEE d MMMM', { locale: it })}
                      </div>
                      <div className="mt-1">
                        {daySelections.map((dish, index) => (
                          <span
                            key={index}
                            className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Utensils className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nessun piatto selezionato per questa settimana</p>
              <p className="text-sm mt-1">Inizia a prenotare i tuoi pasti!</p>
            </div>
          )}
        </div>

        {/* Recent meals section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-500" />
            Pranzi recenti
          </h3>
          
          {recentMeals.length > 0 ? (
            <div className="space-y-3">
              {recentMeals.map((meal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(meal.date), 'EEEE d MMMM yyyy', { locale: it })}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {meal.dishes.join(', ')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {meal.dishes.length} piatti
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>Nessun pranzo recente</p>
            </div>
          )}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => (
            <div
              key={card.route}
              className="bg-white overflow-hidden shadow-md rounded-xl divide-y divide-gray-200 transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="p-6">
                <div className={`${card.color} rounded-full p-3 w-12 h-12 flex items-center justify-center`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {card.description}
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50">
                <button
                  onClick={() => navigate(card.route)}
                  className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  Vai alla sezione
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;