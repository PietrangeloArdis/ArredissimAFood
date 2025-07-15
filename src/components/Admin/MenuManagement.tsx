// src/components/Admin/MenuManagement.tsx

import React, { useState, useEffect } from 'react';
import { format, isWeekend } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuOptions } from '../../types';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomCalendar from '../Calendar/CustomCalendar';
import { useAdminModal } from '../../context/AdminModalContext'; // Usa il contesto

const MenuManagement: React.FC = () => {
  const { openMenuModal } = useAdminModal(); // Prendi la funzione per aprire il modale
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // ... la tua logica per fetchAvailableMenus ...
  }, []);
  
  const handleDateClick = (date: Date) => {
    // Logica di controllo data (weekend, passato) ...
    
    // Chiama la funzione del contesto per aprire il modale
    openMenuModal(date);
  };

  return (
    <div>
      {/* ... Il tuo JSX per il titolo, le istruzioni e il calendario ... */}
      {/* Il CustomCalendar userà onClickDay={handleDateClick} */}
      <CustomCalendar onClickDay={handleDateClick} /* ...altre props... */ />
      {/* ... Il tuo JSX per la legenda ... */}
    </div>
  );
};

export default MenuManagement;