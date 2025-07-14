export interface MenuSelection {
  userId: string;
  nome: string;
  cognome: string;
  date: string;
  selectedItems: string[];
  updatedAt: string;
}

export interface MenuOptions {
  date: string;
  availableItems: string[];
}

export interface User {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  role: string;
  createdAt: string;
  active: boolean;
}

export interface DailyReport {
  date: string;
  meals: {
    [key: string]: number;
  };
  absent: number;
}

export interface UserReport {
  nome: string;
  cognome: string;
  totalSelections: number;
  daysWithoutMeal: number;
  selections: {
    [date: string]: string[];
  };
}

export interface Dish {
  id: string;
  dishName: string;
  category: "Primo" | "Secondo" | "Contorno" | "Altro";
  vegetarian: boolean;
  visible: boolean;
  archived?: boolean;
  hiddenAt?: string;
  stagione: string | null;
  createdAt?: string;
  updatedAt?: string;
  kitchenNote?: string;
  isNew?: boolean;
}

export interface DishStats {
  dishId: string;
  dishName: string;
  category: string;
  totalSelections: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'dish_removed' | 'rating_reminder' | 'general';
  title: string;
  message: string;
  date?: string;
  removedDish?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}