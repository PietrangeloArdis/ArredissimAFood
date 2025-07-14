import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Star, TrendingUp, ChefHat } from 'lucide-react';
import { MenuSelection } from '../../types';
import { FavoriteButton } from './FavoriteDishes';
import toast from 'react-hot-toast';

interface DishCount {
  name: string;
  count: number;
}

const TopDishes: React.FC = () => {
  const { currentUser } = useAuth();
  const [topDishes, setTopDishes] = useState<DishCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchTopDishes();
    }
  }, [currentUser]);

  const fetchTopDishes = async () => {
    try {
      setLoading(true);
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(selectionsRef, where('userId', '==', currentUser!.uid));
      const querySnapshot = await getDocs(q);

      const dishCounts: Record<string, number> = {};
      querySnapshot.forEach((doc) => {
        const selection = doc.data() as MenuSelection;
        selection.selectedItems.forEach((item) => {
          dishCounts[item] = (dishCounts[item] || 0) + 1;
        });
      });

      const sortedDishes = Object.entries(dishCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopDishes(sortedDishes);

      // Fetch similar dishes for suggestions
      if (sortedDishes.length > 0) {
        const dishesRef = collection(db, 'dishes');
        const dishesSnapshot = await getDocs(dishesRef);
        const allDishes = dishesSnapshot.docs.map(doc => doc.data());
        
        // Simple suggestion algorithm based on category
        const topDish = sortedDishes[0];
        const topDishDoc = allDishes.find(d => d.dishName === topDish.name);
        if (topDishDoc) {
          const similarDishes = allDishes
            .filter(d => d.category === topDishDoc.category && d.dishName !== topDish.name)
            .slice(0, 3)
            .map(d => d.dishName);
          setSuggestions(similarDishes);
        }
      }
    } catch (error) {
      console.error('Error fetching top dishes:', error);
      toast.error('Errore nel caricamento dei piatti più scelti');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Dishes Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">I miei piatti più scelti</h3>
        </div>

        {topDishes.length > 0 ? (
          <div className="space-y-3">
            {topDishes.map((dish, index) => (
              <div
                key={dish.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-medium text-gray-500">#{index + 1}</span>
                  <span className="text-gray-900">{dish.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    Scelto {dish.count} {dish.count === 1 ? 'volta' : 'volte'}
                  </span>
                  <FavoriteButton dishId={dish.name} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            Non hai ancora selezionato nessun piatto
          </p>
        )}
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <ChefHat className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Ti potrebbe piacere anche...</h3>
          </div>

          <div className="space-y-3">
            {suggestions.map((dish) => (
              <div
                key={dish}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
              >
                <span className="text-gray-900">{dish}</span>
                <FavoriteButton dishId={dish} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopDishes;