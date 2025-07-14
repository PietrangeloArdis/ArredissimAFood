import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Utility function to clean up inconsistent menu selections
 * This removes dishes from user selections that are no longer available in the menu
 */
export const cleanupInconsistentSelections = async (date?: string) => {
  try {
    console.log('Starting cleanup of inconsistent menu selections...');
    
    // If no date provided, get all selections
    const selectionsRef = collection(db, 'menuSelections');
    let selectionsQuery = query(selectionsRef);
    
    if (date) {
      selectionsQuery = query(selectionsRef, where('date', '==', date));
    }
    
    const selectionsSnapshot = await getDocs(selectionsQuery);
    
    if (selectionsSnapshot.empty) {
      console.log('No selections found to clean up');
      return { cleaned: 0, errors: 0 };
    }

    // Get all menus
    const menusRef = collection(db, 'menus');
    const menusSnapshot = await getDocs(menusRef);
    const menusByDate = new Map<string, string[]>();
    
    menusSnapshot.forEach(doc => {
      const menu = doc.data();
      menusByDate.set(menu.date, menu.availableItems || []);
    });

    const batch = writeBatch(db);
    let cleanedCount = 0;
    let errorCount = 0;

    // Process each selection
    for (const selectionDoc of selectionsSnapshot.docs) {
      try {
        const selection = selectionDoc.data();
        const selectionDate = selection.date;
        const availableItems = menusByDate.get(selectionDate) || [];
        
        // Filter out dishes that are no longer available
        const validSelectedItems = selection.selectedItems.filter((item: string) => 
          availableItems.includes(item)
        );
        
        // If there are invalid items, update the selection
        if (validSelectedItems.length !== selection.selectedItems.length) {
          batch.update(selectionDoc.ref, {
            selectedItems: validSelectedItems,
            updatedAt: new Date().toISOString(),
            cleanedAt: new Date().toISOString()
          });
          
          cleanedCount++;
          console.log(`Cleaned selection for user ${selection.userId} on ${selectionDate}: removed ${selection.selectedItems.length - validSelectedItems.length} invalid dishes`);
        }
      } catch (error) {
        console.error('Error processing selection:', error);
        errorCount++;
      }
    }

    // Commit all updates
    if (cleanedCount > 0) {
      await batch.commit();
      console.log(`Cleanup completed: ${cleanedCount} selections cleaned, ${errorCount} errors`);
    } else {
      console.log('No inconsistencies found');
    }

    return { cleaned: cleanedCount, errors: errorCount };
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
};

/**
 * Validate a single user's selection against the menu
 */
export const validateUserSelection = async (userId: string, date: string): Promise<boolean> => {
  try {
    // Get user's selection
    const selectionRef = doc(db, 'menuSelections', `${userId}_${date}`);
    const selectionDoc = await getDoc(selectionRef);
    
    if (!selectionDoc.exists()) {
      return true; // No selection to validate
    }
    
    const selection = selectionDoc.data();
    
    // Get menu for that date
    const menuRef = doc(db, 'menus', date);
    const menuDoc = await getDoc(menuRef);
    
    if (!menuDoc.exists()) {
      return false; // No menu available
    }
    
    const menu = menuDoc.data();
    const availableItems = menu.availableItems || [];
    
    // Check if all selected items are available
    return selection.selectedItems.every((item: string) => availableItems.includes(item));
  } catch (error) {
    console.error('Error validating user selection:', error);
    return false;
  }
};