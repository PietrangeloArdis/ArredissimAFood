import { isToday, parseISO, isAfter } from 'date-fns';

export const isDateLocked = (date: string | Date, isAdmin: boolean): boolean => {
  // Admin users can edit any date
  if (isAdmin) {
    return false;
  }
  
  // For regular users, lock today and past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    return !isAfter(parsedDate, today);
  }
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return !isAfter(compareDate, today);
};