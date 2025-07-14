import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Award, TrendingUp, PieChart, ArrowRight, Star } from 'lucide-react';
import { MenuSelection, Dish } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

interface DishRating {
  dishId: string;
  rating: number;
  count: number;
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const MonthlySummary: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selections, setSelections] = useState<MenuSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState<{
    total: number;
    workingDays: number;
    streak: number;
    categoryBreakdown: Record<string, number>;
    monthlyTrend: Array<{ month: string; count: number }>;
  }>({
    total: 0,
    workingDays: 0,
    streak: 0,
    categoryBreakdown: {},
    monthlyTrend: []
  });
  const [dishRatings, setDishRatings] = useState<Record<string, DishRating>>({});
  const [dishes, setDishes] = useState<Dish[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    fetchMonthlyData();
    fetchMonthlyRatings();
  }, [currentUser, currentMonth]);

  const fetchMonthlyRatings = async () => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const ratingsRef = collection(db, 'menuFeedbacks');
      const q = query(
        ratingsRef,
        where('date', '>=', format(start, 'yyyy-MM-dd')),
        where('date', '<=', format(end, 'yyyy-MM-dd'))
      );

      const querySnapshot = await getDocs(q);
      const ratings: Record<string, DishRating> = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!ratings[data.dishId]) {
          ratings[data.dishId] = {
            dishId: data.dishId,
            rating: data.rating,
            count: 1
          };
        } else {
          ratings[data.dishId].rating += data.rating;
          ratings[data.dishId].count += 1;
        }
      });

      // Calculate averages
      Object.values(ratings).forEach(rating => {
        rating.rating = Number((rating.rating / rating.count).toFixed(1));
      });

      setDishRatings(ratings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Calculate working days (excluding weekends)
      const allDays = eachDayOfInterval({ start, end });
      const workingDays = allDays.filter(day => !isWeekend(day)).length;

      // Fetch selections for current month
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(
        selectionsRef,
        where('userId', '==', currentUser?.uid),
        where('date', '>=', format(start, 'yyyy-MM-dd')),
        where('date', '<=', format(end, 'yyyy-MM-dd'))
      );

      const querySnapshot = await getDocs(q);
      const monthSelections: MenuSelection[] = [];
      
      // Only include selections with dishes
      querySnapshot.forEach((doc) => {
        const data = doc.data() as MenuSelection;
        if (data.selectedItems && data.selectedItems.length > 0) {
          monthSelections.push(data);
        }
      });

      // Fetch all dishes to get their categories
      const dishesRef = collection(db, 'dishes');
      const dishesSnapshot = await getDocs(dishesRef);
      const dishesMap = new Map<string, Dish>();
      const dishesArray: Dish[] = [];
      dishesSnapshot.forEach((doc) => {
        const dish = doc.data() as Dish;
        dishesMap.set(dish.dishName, dish);
        dishesArray.push(dish);
      });
      setDishes(dishesArray);

      // Calculate category breakdown using actual dish categories
      const categoryCount: Record<string, number> = {
        'Primo': 0,
        'Secondo': 0,
        'Contorno': 0,
        'Altro': 0
      };

      monthSelections.forEach(selection => {
        selection.selectedItems.forEach(itemName => {
          const dish = dishesMap.get(itemName);
          if (dish) {
            categoryCount[dish.category] = (categoryCount[dish.category] || 0) + 1;
          } else {
            categoryCount['Altro'] = (categoryCount['Altro'] || 0) + 1;
          }
        });
      });

      // Calculate streak (only counting days with actual selections)
      let currentStreak = 0;
      const today = new Date();
      const sortedDates = monthSelections
        .map(s => new Date(s.date))
        .sort((a, b) => b.getTime() - a.getTime());

      if (sortedDates.length > 0) {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = sortedDates[i-1].getTime() - sortedDates[i].getTime();
          if (diff === 86400000) { // One day difference
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Fetch trend data for last 6 months - only count days with actual selections
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(currentMonth, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthQuery = query(
          selectionsRef,
          where('userId', '==', currentUser?.uid),
          where('date', '>=', format(monthStart, 'yyyy-MM-dd')),
          where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
        );

        const monthSnapshot = await getDocs(monthQuery);
        const validSelections = monthSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.selectedItems && data.selectedItems.length > 0;
        });

        trendData.push({
          month: format(monthDate, 'MMM', { locale: it }),
          count: validSelections.length
        });
      }

      // Filter out categories with zero count
      const filteredCategoryCount = Object.fromEntries(
        Object.entries(categoryCount).filter(([_, count]) => count > 0)
      );

      setMonthlyStats({
        total: monthSelections.length, // Only counts days with actual selections
        workingDays,
        streak: currentStreak,
        categoryBreakdown: filteredCategoryCount,
        monthlyTrend: trendData
      });

      setSelections(monthSelections);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast.error('Errore nel caricamento dei dati mensili');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prevMonth => 
      direction === 'next' ? addMonths(prevMonth, 1) : subMonths(prevMonth, 1)
    );
  };

  const handleNavigateToCalendar = () => {
    console.log('Navigating to calendar view...');
    navigate('/calendar');
  };

  const getPieChartData = () => [
    { name: 'Selezionati', value: monthlyStats.total },
    { name: 'Rimanenti', value: monthlyStats.workingDays - monthlyStats.total }
  ];

  const getMotivationalMessage = () => {
    const percentage = (monthlyStats.total / monthlyStats.workingDays) * 100;
    
    if (monthlyStats.total === 0) {
      return {
        message: "Non hai ancora selezionato nessun pasto questo mese. Inizia ora!",
        cta: "Pianifica i pasti",
        action: () => handleNavigateToCalendar()
      };
    } else if (percentage < 50) {
      return {
        message: "Stai utilizzando poco il servizio mensa. Non dimenticare di prenotare il tuo prossimo pasto!",
        cta: "Seleziona più giorni",
        action: () => handleNavigateToCalendar()
      };
    } else if (monthlyStats.streak >= 5) {
      return {
        message: `Ottimo! Hai una serie di ${monthlyStats.streak} giorni consecutivi!`,
        cta: "Mantieni la serie",
        action: () => handleNavigateToCalendar()
      };
    }
    return {
      message: "Stai utilizzando bene il servizio mensa. Continua così!",
      cta: "Vai al calendario",
      action: () => handleNavigateToCalendar()
    };
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center" title={`Media voti ricevuti a ${format(currentMonth, 'MMMM', { locale: it })}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const motivationalInfo = getMotivationalMessage();

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-medium text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getPieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-gray-900">
                {monthlyStats.total} su {monthlyStats.workingDays}
              </p>
              <p className="text-sm text-gray-500">giorni lavorativi</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Streak Badge */}
            {monthlyStats.streak >= 3 && (
              <div className="bg-yellow-50 rounded-lg p-4 flex items-center">
                <Award className="h-8 w-8 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Serie Attiva!
                  </p>
                  <p className="text-xs text-yellow-600">
                    {monthlyStats.streak} giorni consecutivi
                  </p>
                </div>
              </div>
            )}

            {/* Motivational Message */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600">{motivationalInfo.message}</p>
              <button
                onClick={motivationalInfo.action}
                className="mt-3 inline-flex items-center text-sm text-green-600 hover:text-green-700 transition-colors"
              >
                {motivationalInfo.cta}
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown with Ratings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <PieChart className="h-5 w-5 text-green-500 mr-2" />
          Distribuzione Categorie e Valutazioni
        </h3>
        <div className="space-y-3">
          {Object.entries(monthlyStats.categoryBreakdown).map(([category, count]) => (
            <div key={category} className="flex items-center">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <span className="text-sm text-gray-500">{count} piatti</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(count / monthlyStats.total * 100)}%`
                    }}
                  />
                </div>
                {/* Display ratings for dishes in this category */}
                <div className="mt-2 space-y-1">
                  {selections
                    .filter(selection => selection.selectedItems.some(item => {
                      const dish = dishes.find(d => d.dishName === item);
                      return dish?.category === category;
                    }))
                    .map(selection => selection.selectedItems)
                    .flat()
                    .filter((item, index, self) => self.indexOf(item) === index)
                    .map(dishName => {
                      const rating = dishRatings[dishName];
                      if (!rating) return null;
                      return (
                        <div key={dishName} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{dishName}</span>
                          {renderStars(rating.rating)}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
          Trend Mensile
        </h3>
        {monthlyStats.monthlyTrend.some(month => month.count > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats.monthlyTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
            <p>Nessun pasto selezionato negli ultimi mesi</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlySummary;