// src/components/Admin/MenuManagement.tsx

import React, { useState, useEffect } from 'react';
import { format, isWeekend } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuOptions } from '../../types';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomCalendar from '../Calendar/CustomCalendar';

// NUOVA PROP PER COMUNICARE CON IL PADRE
interface MenuManagementProps {
  onDateClick: (date: Date) => void;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ onDateClick }) => {
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const initialDate = new Date();
  
  useEffect(() => {
    fetchAvailableMenus();
  }, []);

  const fetchAvailableMenus = async () => {
    try {
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);
      const menus: Record<string, string[]> = {};
      menusSnapshot.forEach((doc) => {
        const menuData = doc.data() as MenuOptions;
        if (menuData.date && Array.isArray(menuData.availableItems)) {
          menus[menuData.date] = menuData.availableItems;
        }
      });
      setAvailableMenus(menus);
    } catch (error) {
      toast.error('Errore nel caricamento dei menù.');
    }
  };
  
  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);

    if (isWeekend(date)) {
      toast.error('Non è possibile creare menù per i weekend.');
      return;
    }
    if (clickedDate < today) {
      toast.error('Non è possibile creare o modificare menù per date passate.');
      return;
    }
    // Chiama la funzione del componente padre per aprire il modale
    onDateClick(date);
  };
  
  const tileDisabled = ({ date }: { date: Date }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return isWeekend(date) || checkDate < today;
  };
  
  const tileClassName = ({ date }: { date: Date }) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    let classes = 'cursor-pointer ';
    if (availableMenus[formattedDate]) {
      classes += 'bg-blue-100 text-blue-800 border-blue-300';
    } else {
      classes += 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
    }
    return classes;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Gestione Menù</h2>
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>Clicca su una data per gestire il menù</span>
        </div>
      </div>

      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        {/* ... le tue istruzioni e avvisi ... */}
      </div>
      
      <CustomCalendar
        value={initialDate}
        onClickDay={handleDateClick}
        tileDisabled={tileDisabled}
        tileClassName={tileClassName}
        availableMenus={availableMenus}
      />
      
      <div className="mt-4 flex flex-wrap gap-4">
        {/* ... la tua legenda colori ... */}
      </div>
    </div>
  );
};

export default MenuManagement;