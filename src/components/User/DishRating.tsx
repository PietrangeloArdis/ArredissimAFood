import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface DishRatingProps {
  dishId: string;
  dishName: string;
  date: string;
  onRatingSubmit?: () => void;
}

const DishRating: React.FC<DishRatingProps> = ({ dishId, dishName, date, onRatingSubmit }) => {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dishExists, setDishExists] = useState<boolean>(true);

  useEffect(() => {
    if (currentUser) {
      checkDishExistence();
      fetchExistingRating();
    }
  }, [currentUser, dishId, date]);

  const checkDishExistence = async () => {
    try {
      // Check if dish still exists in the dishes collection
      const dishesRef = collection(db, 'dishes');
      const dishQuery = query(dishesRef, where('dishName', '==', dishId));
      const dishSnapshot = await getDocs(dishQuery);
      
      if (dishSnapshot.empty) {
        setDishExists(false);
        return;
      }

      // Check if dish is still available in the menu for this date
      const menuRef = doc(db, 'menus', date);
      const menuDoc = await getDoc(menuRef);
      
      if (menuDoc.exists()) {
        const menuData = menuDoc.data();
        const availableItems = menuData.availableItems || [];
        setDishExists(availableItems.includes(dishId));
      } else {
        setDishExists(false);
      }
    } catch (error) {
      console.error('Error checking dish existence:', error);
      setDishExists(false);
    }
  };

  const fetchExistingRating = async () => {
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    try {
      setError(null);
      const ratingsRef = collection(db, 'menuFeedbacks');
      const q = query(
        ratingsRef,
        where('userId', '==', currentUser.uid),
        where('dishId', '==', dishId),
        where('date', '==', date)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setRating(data.rating);
        setNote(data.note || '');
        setExistingRating(data);
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
      setError('Error loading rating');
      toast.error('Errore nel caricamento della valutazione');
    }
  };

  const handleRatingSubmit = async () => {
    if (!currentUser) {
      toast.error('Devi essere autenticato per valutare i piatti');
      return;
    }

    if (!rating) {
      toast.error('Seleziona un punteggio da 1 a 5 stelle');
      return;
    }

    if (!dishExists) {
      toast.error('Questo piatto non è più disponibile nel menù');
      return;
    }

    setLoading(true);
    try {
      const ratingId = `${currentUser.uid}_${dishId}_${date}`;
      const ratingRef = doc(db, 'menuFeedbacks', ratingId);

      const ratingData = {
        userId: currentUser.uid,
        dishId,
        dishName,
        rating,
        note: note.trim() || null,
        date,
        createdAt: existingRating?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Saving rating:', ratingData);

      await setDoc(ratingRef, ratingData);

      toast.success('Valutazione salvata con successo');
      if (onRatingSubmit) onRatingSubmit();
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error('Errore nel salvataggio della valutazione');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if dish no longer exists
  if (!dishExists) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-medium text-gray-900 mb-2">{dishName}</h4>
      
      <div 
        className="flex items-center mb-3 relative"
        onMouseEnter={() => existingRating && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(star)}
            className="p-1 focus:outline-none"
            disabled={loading}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {showTooltip && existingRating && (
          <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-10">
            Hai dato {existingRating.rating} su 5 stelle a questo piatto
          </div>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Aggiungi un commento (opzionale)"
        className="w-full px-3 py-2 border rounded-md text-sm"
        rows={2}
        disabled={loading}
      />

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      <button
        onClick={handleRatingSubmit}
        disabled={loading || !rating}
        className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Salvataggio...' : (existingRating ? 'Aggiorna Valutazione' : 'Invia Valutazione')}
      </button>
    </div>
  );
};

export default DishRating;