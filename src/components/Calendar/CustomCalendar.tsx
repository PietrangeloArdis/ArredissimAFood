import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameMonth, isToday, isBefore, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Clock, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CustomCalendarProps {
  value: Date;
  onClickDay: (date: Date) => void;
  tileDisabled?: ({ date }: { date: Date }) => boolean;
  tileClassName?: ({ date }: { date: Date }) => string;
  tileContent?: ({ date }: { date: Date }) => React.ReactNode;
  minDate?: Date;
  maxDate?: Date;
  availableMenus?: Record<string, string[]>;
  userSelections?: Record<string, string[]>;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  value,
  onClickDay,
  tileDisabled,
  tileClassName,
  tileContent,
  minDate,
  maxDate,
  availableMenus = {},
  userSelections = {}
}) => {
  const { isAdmin } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(value);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Italian weekday headers (Monday first)
  const weekdays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next' 
      ? addMonths(currentMonth, 1) 
      : subMonths(currentMonth, 1);
    
    // Check bounds
    if (minDate && newMonth < startOfMonth(minDate)) return;
    if (maxDate && newMonth > startOfMonth(maxDate)) return;
    
    setCurrentMonth(newMonth);
  };

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const today = new Date();
    const isWorkday = !isWeekend(date);
    const hasMenu = availableMenus[dateStr]?.length > 0;
    const hasSelection = userSelections[dateStr]?.length > 0;
    const isFutureDate = date > today;
    const isPastDate = date < today;
    const isTodayDate = isToday(date);

    if (!isWorkday) {
      return {
        type: 'weekend',
        label: 'Weekend',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-200',
        icon: null,
        clickable: false,
        description: 'Non disponibile (weekend)'
      };
    }

    if (isTodayDate) {
      if (hasMenu && hasSelection) {
        return {
          type: 'today-booked',
          label: 'Oggi - Prenotato',
          bgColor: 'bg-gradient-to-br from-yellow-100 to-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-yellow-400',
          icon: <Check className="h-3 w-3" />,
          clickable: true,
          description: 'Oggi - Pranzo prenotato'
        };
      } else if (hasMenu) {
        return {
          type: 'today-available',
          label: 'Oggi - Disponibile',
          bgColor: 'bg-gradient-to-br from-yellow-100 to-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-yellow-400',
          icon: <Clock className="h-3 w-3" />,
          clickable: true,
          description: 'Oggi - Prenota ora!'
        };
      } else {
        return {
          type: 'today-unavailable',
          label: 'Oggi - Non disponibile',
          bgColor: 'bg-gradient-to-br from-yellow-100 to-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-yellow-400',
          icon: null,
          clickable: isAdmin, // Admin can click to create menu
          description: isAdmin ? 'Oggi - Clicca per creare menù' : 'Oggi - Nessun menù disponibile'
        };
      }
    }

    if (hasMenu && hasSelection) {
      return {
        type: 'booked',
        label: 'Prenotato',
        bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
        icon: <Check className="h-3 w-3" />,
        clickable: true,
        description: 'Pranzo prenotato - Clicca per modificare'
      };
    }

    if (hasMenu && !hasSelection && isFutureDate) {
      return {
        type: 'available',
        label: 'Disponibile',
        bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300',
        icon: <AlertTriangle className="h-3 w-3 text-amber-500" />,
        clickable: true,
        description: 'Menù disponibile - Clicca per prenotare'
      };
    }

    if (hasMenu && !hasSelection && isPastDate) {
      return {
        type: 'missed',
        label: 'Perso',
        bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: null,
        clickable: isAdmin, // Admin can still edit past menus
        description: isAdmin ? 'Clicca per modificare menù' : 'Opportunità persa'
      };
    }

    // Handle empty days differently for admin vs regular users
    if (!hasMenu && isFutureDate && isAdmin) {
      return {
        type: 'admin-create',
        label: 'Crea Menù',
        bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-300',
        icon: <AlertTriangle className="h-3 w-3 text-green-500" />,
        clickable: true,
        description: 'Clicca per creare un nuovo menù'
      };
    }

    if (!hasMenu && isPastDate && isAdmin) {
      return {
        type: 'admin-past-empty',
        label: 'Nessun Menù',
        bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        icon: null,
        clickable: false,
        description: 'Nessun menù era disponibile'
      };
    }

    return {
      type: 'unavailable',
      label: 'Non disponibile',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-500',
      borderColor: 'border-gray-200',
      icon: null,
      clickable: false,
      description: 'Nessun menù disponibile'
    };
  };

  const handleDayClick = (date: Date, dayStatus: any, event: React.MouseEvent) => {
    // Prevent event bubbling and default behavior
    event.preventDefault();
    event.stopPropagation();
    
    if (!dayStatus.clickable) {
      return;
    }

    // Call onClickDay immediately and synchronously
    try {
      onClickDay(date);
    } catch (error) {
      console.error('Error calling onClickDay:', error);
    }
  };

  const generateCalendarGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get all days in the month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Calculate the weekday of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const firstDayWeekday = monthStart.getDay();
    
    // Convert to Monday-first format (Monday = 0, Sunday = 6)
    const mondayFirstWeekday = (firstDayWeekday + 6) % 7;
    
    // Create the grid with previous month's trailing days
    const grid: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Add trailing days from previous month
    const prevMonth = subMonths(monthStart, 1);
    const prevMonthEnd = endOfMonth(prevMonth);
    for (let i = mondayFirstWeekday - 1; i >= 0; i--) {
      const date = new Date(prevMonthEnd);
      date.setDate(prevMonthEnd.getDate() - i);
      grid.push({ date, isCurrentMonth: false });
    }
    
    // Add all days of the current month
    daysInMonth.forEach(day => {
      grid.push({ date: day, isCurrentMonth: true });
    });
    
    // Add leading days from next month to complete 6 weeks (42 days total)
    const nextMonth = addMonths(monthStart, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    let nextDayCount = 1;
    while (grid.length < 42) {
      const date = new Date(nextMonthStart);
      date.setDate(nextDayCount);
      grid.push({ date, isCurrentMonth: false });
      nextDayCount++;
    }
    
    return grid;
  };

  const calendarGrid = generateCalendarGrid();
  const weeks: { date: Date; isCurrentMonth: boolean }[][] = [];
  
  // Split grid into weeks (7 days each)
  for (let i = 0; i < calendarGrid.length; i += 7) {
    weeks.push(calendarGrid.slice(i, i + 7));
  }

  const canNavigatePrev = !minDate || currentMonth > startOfMonth(minDate);
  const canNavigateNext = !maxDate || currentMonth < startOfMonth(maxDate);

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Compact Header with navigation */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-500 to-blue-500 text-white">
        <button
          onClick={() => navigateMonth('prev')}
          disabled={!canNavigatePrev}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-all duration-200 hover:scale-105"
          title="Mese precedente"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/20 rounded-full">
            <CalendarIcon className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base sm:text-lg font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          disabled={!canNavigateNext}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-all duration-200 hover:scale-105"
          title="Mese successivo"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Compact Weekday headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekdays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Compact Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((dayData, dayIndex) => {
              const { date, isCurrentMonth } = dayData;
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayStatus = getDayStatus(date);
              const isHovered = hoveredDate === dateStr;

              // Compact styling for all days
              let dayClasses = `
                relative h-12 sm:h-14 p-1 sm:p-2 border-r border-b border-gray-100 
                flex flex-col items-center justify-center text-xs sm:text-sm font-semibold
                transition-all duration-200 touch-manipulation group select-none
                ${dayStatus.bgColor} ${dayStatus.textColor} ${dayStatus.borderColor}
              `;

              // Different styling for current month vs other months
              if (isCurrentMonth) {
                if (dayStatus.clickable) {
                  dayClasses += ` cursor-pointer hover:scale-105 hover:shadow-md hover:z-10 active:scale-95`;
                  if (isToday(date)) {
                    dayClasses += ` ring-2 ring-yellow-400 ring-offset-1 shadow-md`;
                  }
                } else {
                  dayClasses += ` cursor-not-allowed`;
                }
              } else {
                // Muted styling for previous/next month days
                dayClasses += ` text-gray-300 bg-gray-50 cursor-not-allowed opacity-40`;
              }

              return (
                <div
                  key={dateStr}
                  onClick={(e) => {
                    if (isCurrentMonth && dayStatus.clickable) {
                      handleDayClick(date, dayStatus, e);
                    }
                  }}
                  className={dayClasses}
                  title={isCurrentMonth ? dayStatus.description : ''}
                  onMouseEnter={() => setHoveredDate(dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                  role={isCurrentMonth && dayStatus.clickable ? "button" : "presentation"}
                  tabIndex={isCurrentMonth && dayStatus.clickable ? 0 : -1}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isCurrentMonth && dayStatus.clickable) {
                      e.preventDefault();
                      handleDayClick(date, dayStatus, e as any);
                    }
                  }}
                  style={{
                    minHeight: '44px' // Ensure touch target size
                  }}
                >
                  {/* Day number */}
                  <span className="relative z-10 pointer-events-none">
                    {format(date, 'd')}
                  </span>
                  
                  {/* Compact status indicator */}
                  {isCurrentMonth && dayStatus.icon && (
                    <div className="absolute bottom-0.5 right-0.5 pointer-events-none">
                      {React.cloneElement(dayStatus.icon, { className: "h-2 w-2 sm:h-2.5 sm:w-2.5" })}
                    </div>
                  )}
                  
                  {/* Today special indicator */}
                  {isToday(date) && isCurrentMonth && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                  
                  {/* Selection count badge */}
                  {isCurrentMonth && userSelections[dateStr]?.length > 0 && (
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold pointer-events-none">
                      {userSelections[dateStr].length}
                    </div>
                  )}
                  
                  {/* Compact hover tooltip */}
                  {isHovered && isCurrentMonth && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {dayStatus.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                  
                  {/* Click feedback overlay */}
                  {isCurrentMonth && dayStatus.clickable && (
                    <div className="absolute inset-0 bg-blue-200 rounded opacity-0 group-active:opacity-30 transition-opacity duration-100 pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Compact Footer with legend */}
      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200">
        {/* Compact Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded flex items-center justify-center">
              <Check className="h-1.5 w-1.5 text-green-600" />
            </div>
            <span className="text-gray-600">Prenotato</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded flex items-center justify-center">
              <AlertTriangle className="h-1.5 w-1.5 text-amber-500" />
            </div>
            <span className="text-gray-600">Da prenotare</span>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded flex items-center justify-center">
                <AlertTriangle className="h-1.5 w-1.5 text-green-500" />
              </div>
              <span className="text-gray-600">Crea menù</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gradient-to-br from-yellow-100 to-green-100 border border-yellow-400 rounded flex items-center justify-center">
              <Clock className="h-1.5 w-1.5 text-blue-600" />
            </div>
            <span className="text-gray-600">Oggi</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Weekend</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCalendar;