import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Star, TrendingUp, Filter } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

interface DishRating {
  dishName: string;
  averageRating: number;
  totalRatings: number;
  category: string;
}

const DishStats: React.FC = () => {
  const [ratings, setRatings] = useState<DishRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'1m' | '3m' | '6m' | 'all'>('1m');

  useEffect(() => {
    fetchRatings();
  }, [selectedCategory, dateRange]);

  const fetchRatings = async () => {
    try {
      setLoading(true);

      // Get date range
      let startDate;
      if (dateRange !== 'all') {
        const months = parseInt(dateRange);
        startDate = format(subMonths(new Date(), months), 'yyyy-MM-dd');
      }

      // Fetch all ratings
      const ratingsRef = collection(db, 'menuFeedbacks');
      let ratingQuery = query(ratingsRef);

      if (startDate) {
        ratingQuery = query(ratingsRef, where('date', '>=', startDate));
      }

      const ratingsSnapshot = await getDocs(ratingQuery);

      // Fetch all dishes
      const dishesRef = collection(db, 'dishes');
      const dishesSnapshot = await getDocs(dishesRef);
      const dishesMap = new Map();
      dishesSnapshot.forEach(doc => {
        const dish = doc.data();
        dishesMap.set(dish.dishName, dish);
      });

      // Fetch all menus to validate dish availability
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);
      const menusByDate = new Map();
      menusSnapshot.forEach(doc => {
        const menu = doc.data();
        menusByDate.set(menu.date, menu.availableItems || []);
      });

      // Process ratings - only include ratings for dishes that were actually available on that date
      const ratingMap = new Map<string, { sum: number; count: number; category: string }>();

      ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        const dish = dishesMap.get(rating.dishId);
        const menuItems = menusByDate.get(rating.date) || [];

        // Only include rating if dish exists and was available on that date
        if (dish && menuItems.includes(rating.dishId) && 
            (!selectedCategory || selectedCategory === 'all' || dish.category === selectedCategory)) {
          const current = ratingMap.get(rating.dishId) || { 
            sum: 0, 
            count: 0, 
            category: dish.category 
          };

          ratingMap.set(rating.dishId, {
            sum: current.sum + rating.rating,
            count: current.count + 1,
            category: dish.category
          });
        }
      });

      // Calculate averages and sort
      const processedRatings: DishRating[] = Array.from(ratingMap.entries())
        .map(([dishId, stats]) => ({
          dishName: dishId,
          averageRating: Number((stats.sum / stats.count).toFixed(1)),
          totalRatings: stats.count,
          category: stats.category
        }))
        .sort((a, b) => b.averageRating - a.averageRating);

      setRatings(processedRatings);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-900">Statistiche Valutazioni</h2>
        <div className="flex space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">Tutte le categorie</option>
            <option value="Primo">Primi</option>
            <option value="Secondo">Secondi</option>
            <option value="Contorno">Contorni</option>
            <option value="Altro">Altro</option>
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="1m">Ultimo mese</option>
            <option value="3m">Ultimi 3 mesi</option>
            <option value="6m">Ultimi 6 mesi</option>
            <option value="all">Tutto</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : ratings.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {ratings.map((dish) => (
              <li key={dish.dishName} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{dish.dishName}</h3>
                    <div className="mt-1">
                      {renderStars(dish.averageRating)}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {dish.category}
                    </span>
                    <span className="mt-1 text-sm text-gray-500">
                      {dish.totalRatings} valutazioni
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna valutazione</h3>
          <p className="mt-1 text-sm text-gray-500">
            Non ci sono ancora valutazioni per i piatti.
          </p>
        </div>
      )}
    </div>
  );
};

export default DishStats;