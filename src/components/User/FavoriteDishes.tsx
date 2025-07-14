import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dish } from '../../types';

interface FavoriteDishesProps {
  onFilterChange?: (showOnlyFavorites: boolean) => void;
  showFilterToggle?: boolean;
}

export const FavoriteDishes: React.FC<FavoriteDishesProps> = ({ 
  onFilterChange,
  showFilterToggle = true
}) => {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
    }
  }, [currentUser]);

  const fetchFavorites = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser!.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setFavorites(userDoc.data().favorites || []);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (dishId: string) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let newFavorites: string[];
      if (favorites.includes(dishId)) {
        newFavorites = favorites.filter(id => id !== dishId);
        toast.success('Rimosso dai preferiti');
      } else {
        newFavorites = [...favorites, dishId];
        toast.success('Aggiunto ai preferiti');
      }
      
      await setDoc(userDocRef, {
        ...userDoc.data(),
        favorites: newFavorites
      }, { merge: true });
      
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Errore durante l\'aggiornamento dei preferiti');
    }
  };

  const handleFilterChange = (value: boolean) => {
    setShowOnlyFavorites(value);
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Caricamento preferiti...</div>;
  }

  return (
    <div>
      {showFilterToggle && (
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => handleFilterChange(!showOnlyFavorites)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              showOnlyFavorites
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Heart className={`h-4 w-4 mr-2 ${showOnlyFavorites ? 'fill-green-500' : ''}`} />
            {showOnlyFavorites ? 'Mostra tutti i piatti' : 'Mostra solo preferiti'}
          </button>
        </div>
      )}
    </div>
  );
};

export const FavoriteButton: React.FC<{ dishId: string }> = ({ dishId }) => {
  const { currentUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      checkFavoriteStatus();
    }
  }, [currentUser, dishId]);

  const checkFavoriteStatus = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser!.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const favorites = userDoc.data().favorites || [];
        setIsFavorite(favorites.includes(dishId));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      const currentFavorites = userDoc.exists() ? (userDoc.data().favorites || []) : [];
      let newFavorites: string[];
      
      if (currentFavorites.includes(dishId)) {
        newFavorites = currentFavorites.filter(id => id !== dishId);
        toast.success('Rimosso dai preferiti');
      } else {
        newFavorites = [...currentFavorites, dishId];
        toast.success('Aggiunto ai preferiti');
      }
      
      await setDoc(userDocRef, {
        ...userDoc.data(),
        favorites: newFavorites
      }, { merge: true });
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Errore durante l\'aggiornamento dei preferiti');
    }
  };

  if (loading) {
    return <div className="animate-pulse w-4 h-4 bg-gray-200 rounded-full"></div>;
  }

  return (
    <button
      onClick={toggleFavorite}
      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
      title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-green-500 text-green-500' : 'text-gray-400'}`} />
    </button>
  );
};

export default FavoriteDishes;