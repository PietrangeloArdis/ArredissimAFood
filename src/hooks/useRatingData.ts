import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { format, isBefore } from 'date-fns';

export const useRatingData = () => {
  const { currentUser } = useAuth();
  const [latestUnratedDate, setLatestUnratedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const findLatestUnratedMeal = async () => {
    if (!currentUser) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all user's meal selections where date is before today AND has actual dishes
      const selectionsRef = collection(db, 'menuSelections');
      const selectionsQuery = query(
        selectionsRef,
        where('userId', '==', currentUser.uid)
      );

      const selectionsSnapshot = await getDocs(selectionsQuery);
      const validSelections: string[] = [];
      
      selectionsSnapshot.forEach((doc) => {
        const selection = doc.data();
        const selectionDate = new Date(selection.date);
        selectionDate.setHours(0, 0, 0, 0);
        
        if (selection.selectedItems && 
            selection.selectedItems.length > 0 && 
            isBefore(selectionDate, today)) {
          validSelections.push(selection.date);
        }
      });

      if (validSelections.length === 0) {
        setLatestUnratedDate(null);
        return;
      }

      // Get all user's ratings to see which dates already have feedback
      const ratingsRef = collection(db, 'menuFeedbacks');
      const ratingsQuery = query(
        ratingsRef,
        where('userId', '==', currentUser.uid)
      );

      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratedDates = new Set<string>();
      
      ratingsSnapshot.forEach((doc) => {
        const rating = doc.data();
        ratedDates.add(rating.date);
      });

      // Find selections without feedback and get the most recent one
      const unratedDates = validSelections.filter(date => !ratedDates.has(date));
      
      if (unratedDates.length > 0) {
        unratedDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setLatestUnratedDate(unratedDates[0]);
      } else {
        setLatestUnratedDate(null);
      }
    } catch (error) {
      console.error('Error finding latest unrated meal:', error);
      setLatestUnratedDate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    findLatestUnratedMeal();
  }, [currentUser]);

  return { latestUnratedDate, loading, refetch: findLatestUnratedMeal };
};