import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Filter, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface RatingData {
  date: string;
  averageRating: number;
  count: number;
  formattedDate: string;
}

interface CategoryRating {
  category: string;
  averageRating: number;
  count: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const RatingsChart: React.FC = () => {
  const { currentUser } = useAuth();
  const [ratingData, setRatingData] = useState<RatingData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    if (currentUser) {
      fetchRatingsData();
    }
  }, [currentUser, timeRange]);

  const fetchRatingsData = async () => {
    try {
      setLoading(true);
      const days = timeRange === '7d' ? 7 : 30;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch user's ratings
      const ratingsRef = collection(db, 'menuFeedbacks');
      const q = query(
        ratingsRef,
        where('userId', '==', currentUser!.uid),
        where('date', '>=', startDate)
      );

      const ratingsSnapshot = await getDocs(q);
      
      // Group ratings by date
      const ratingsByDate: Record<string, { sum: number; count: number }> = {};
      const ratingsByCategory: Record<string, { sum: number; count: number }> = {};

      // Fetch dishes to get categories
      const dishesRef = collection(db, 'dishes');
      const dishesSnapshot = await getDocs(dishesRef);
      const dishCategories: Record<string, string> = {};
      
      dishesSnapshot.forEach((doc) => {
        const dish = doc.data();
        dishCategories[dish.dishName] = dish.category;
      });

      ratingsSnapshot.forEach((doc) => {
        const rating = doc.data();
        const date = rating.date;
        const dishCategory = dishCategories[rating.dishId] || 'Altro';

        // Group by date
        if (!ratingsByDate[date]) {
          ratingsByDate[date] = { sum: 0, count: 0 };
        }
        ratingsByDate[date].sum += rating.rating;
        ratingsByDate[date].count += 1;

        // Group by category
        if (!ratingsByCategory[dishCategory]) {
          ratingsByCategory[dishCategory] = { sum: 0, count: 0 };
        }
        ratingsByCategory[dishCategory].sum += rating.rating;
        ratingsByCategory[dishCategory].count += 1;
      });

      // Convert to chart data
      const chartData: RatingData[] = Object.entries(ratingsByDate)
        .map(([date, data]) => ({
          date,
          averageRating: Number((data.sum / data.count).toFixed(1)),
          count: data.count,
          formattedDate: format(new Date(date), 'EEE d', { locale: it })
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const categoryChartData: CategoryRating[] = Object.entries(ratingsByCategory)
        .map(([category, data]) => ({
          category,
          averageRating: Number((data.sum / data.count).toFixed(1)),
          count: data.count
        }))
        .sort((a, b) => b.averageRating - a.averageRating);

      setRatingData(chartData);
      setCategoryData(categoryChartData);
    } catch (error) {
      console.error('Error fetching ratings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            Media voti: <span className="font-medium text-green-600">
              {payload[0].value} ⭐
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {payload[0].payload.count} valutazioni
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (ratingData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Valutazioni recenti</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>Nessuna valutazione disponibile per il periodo selezionato</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ratings Trend Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Valutazioni recenti</h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === '7d'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ultimi 7 giorni
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === '30d'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ultimi 30 giorni
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingData}>
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, 5]} 
                tick={{ fontSize: 12 }}
                tickCount={6}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="averageRating" 
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Valutazioni per categoria</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ category, count }) => `${category} (${count})`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {categoryData.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {category.averageRating} ⭐
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} valutazioni
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsChart;