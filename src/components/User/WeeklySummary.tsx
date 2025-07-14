import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Edit2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { useLocation, useNavigate } from 'react-router-dom';
import TopDishes from './TopDishes';
import { useMenuData } from '../../hooks/useMenuData';
import { useUserSelections } from '../../hooks/useUserSelections';
import toast from 'react-hot-toast';

const WeeklySummary: React.FC = () => {
  const { currentUser } = useAuth();
  const { openModal } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  const { availableMenus } = useMenuData();
  const { userSelections } = useUserSelections();
  
  const [currentWeek, setCurrentWeek] = useState(() => {
    const state = location.state as { startDate?: string };
    let initialDate = new Date();

    if (state?.startDate) {
      const parsedDate = parseISO(state.startDate);
      if (isValid(parsedDate)) {
        initialDate = parsedDate;
      }
    }
    return initialDate;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const handleEditDay = (date: Date) => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Back button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/calendar')}
            className="inline-flex items-center px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al Calendario
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Weekly Summary */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 rounded-full hover:bg-gray-100 touch-manipulation"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-lg font-medium text-gray-900 text-center">
                  <span className="hidden sm:inline">Settimana del {format(weekDays[0], 'd MMMM yyyy', { locale: it })}</span>
                  <span className="sm:hidden">{format(weekDays[0], 'd MMM')} - {format(weekDays[weekDays.length - 1], 'd MMM')}</span>
                </span>
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 rounded-full hover:bg-gray-100 touch-manipulation"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const daySelections = userSelections[dateStr] || [];
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const hasMenu = availableMenus[dateStr]?.length > 0;

                return (
                  <div 
                    key={dateStr} 
                    className={`p-4 sm:p-6 ${isToday ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className={`flex-shrink-0 ${isToday ? 'text-green-600' : 'text-gray-400'}`}>
                          <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <p className={`text-base sm:text-lg font-medium ${isToday ? 'text-green-900' : 'text-gray-900'}`}>
                              {format(day, 'EEEE', { locale: it })}
                            </p>
                            <p className={`text-sm ${isToday ? 'text-green-600' : 'text-gray-500'} sm:ml-2`}>
                              {format(day, 'd MMMM', { locale: it })}
                              {isToday && ' (Oggi)'}
                            </p>
                          </div>
                          {daySelections.length > 0 ? (
                            <div className="mt-2">
                              <div className="hidden sm:block">
                                <ul className="space-y-1">
                                  {daySelections.map((item, index) => (
                                    <li 
                                      key={index}
                                      className={`text-sm ${isToday ? 'text-green-800' : 'text-gray-600'}`}
                                    >
                                      • {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="sm:hidden">
                                <p className={`text-sm ${isToday ? 'text-green-800' : 'text-gray-600'}`}>
                                  {daySelections.slice(0, 2).join(', ')}
                                  {daySelections.length > 2 && ` +${daySelections.length - 2}`}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500 italic">
                              {hasMenu ? 'Nessuna scelta per questo giorno' : 'Nessun menù disponibile'}
                            </p>
                          )}
                        </div>
                      </div>
                      {hasMenu && (
                        <button
                          onClick={() => handleEditDay(day)}
                          className="ml-2 sm:ml-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors touch-manipulation flex-shrink-0"
                          title="Modifica selezione"
                        >
                          <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights Section */}
          <TopDishes />
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;