import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

export const saveMealSelection = async (
  userId: string,
  nome: string,
  cognome: string,
  date: Date,
  selectedItems: string[]
) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const selectionRef = doc(db, 'menuSelections', `${userId}_${formattedDate}`);
  
  const selectionData = {
    userId,
    nome,
    cognome,
    date: formattedDate,
    selectedItems,
    updatedAt: new Date().toISOString()
  };

  await setDoc(selectionRef, selectionData);
  
  // Broadcast update event
  window.dispatchEvent(new CustomEvent('mealSelectionUpdated', {
    detail: { date: formattedDate, items: selectedItems }
  }));
  
  return selectionData;
};

export const calculateWeeklyStats = (
  weekDays: Date[],
  availableMenus: Record<string, string[]>,
  userSelections: Record<string, string[]>,
  today: Date
) => {
  const prenotati = weekDays.filter(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return userSelections[dateStr]?.length > 0;
  }).length;

  const daPrenotare = weekDays.filter(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const hasMenu = availableMenus[dateStr]?.length > 0;
    const hasSelection = userSelections[dateStr]?.length > 0;
    const isFuture = day > today;
    return hasMenu && !hasSelection && isFuture;
  }).length;

  const disponibili = weekDays.filter(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return availableMenus[dateStr]?.length > 0;
  }).length;

  return { prenotati, daPrenotare, disponibili };
};