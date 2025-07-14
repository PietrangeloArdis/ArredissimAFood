import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuSelection } from '../types';
import { useAuth } from '../context/AuthContext';

export const useUserSelections = () => {
  const { currentUser } = useAuth();
  const [userSelections, setUserSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchSelections = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(selectionsRef, where('userId', '==', currentUser.uid));
      const selectionsSnapshot = await getDocs(q);
      
      const selections: Record<string, string[]> = {};
      selectionsSnapshot.forEach((doc) => {
        const selectionData = doc.data() as MenuSelection;
        if (selectionData.selectedItems && selectionData.selectedItems.length > 0) {
          selections[selectionData.date] = selectionData.selectedItems;
        }
      });
      
      setUserSelections(selections);
    } catch (error) {
      console.error('Error fetching user selections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelections();
  }, [currentUser]);

  return { userSelections, setUserSelections, loading, refetch: fetchSelections };
};