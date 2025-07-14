import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const removeInvalidDishesFromSelections = async (
  removedDish: string,
  date: string
) => {
  const selectionsRef = collection(db, 'menuSelections');
  const q = query(selectionsRef, where('date', '==', date));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  const affectedUsers: Array<{
    userId: string;
    email: string;
    nome: string;
    cognome: string;
  }> = [];

  for (const selectionDoc of snapshot.docs) {
    const selection = selectionDoc.data();
    
    if (selection.selectedItems.includes(removedDish)) {
      // Get user details
      const userRef = doc(db, 'users', selection.userId);
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', selection.userId)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        affectedUsers.push({
          userId: selection.userId,
          email: userData.email,
          nome: userData.nome,
          cognome: userData.cognome
        });
      }

      // Remove the dish from user's selection
      const updatedSelection = selection.selectedItems.filter((item: string) => item !== removedDish);
      batch.update(selectionDoc.ref, { 
        selectedItems: updatedSelection,
        updatedAt: new Date().toISOString()
      });
    }
  }

  await batch.commit();
  return affectedUsers;
};

export const validateDishAvailability = (
  selectedItems: string[],
  availableItems: string[]
): { validItems: string[]; removedItems: string[] } => {
  const validItems = selectedItems.filter(item => availableItems.includes(item));
  const removedItems = selectedItems.filter(item => !availableItems.includes(item));
  
  return { validItems, removedItems };
};