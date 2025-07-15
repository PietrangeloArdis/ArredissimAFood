// src/components/Admin/MenuManagement.tsx

import React, { useState, useEffect } from 'react';
import { format, isWeekend } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuOptions } from '../../types';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomCalendar from '../Calendar/CustomCalendar';
import { useAdminModal } from '../../context/AdminModalContext';

const MenuManagement: React.FC = () => {
  const { openMenuModal, refreshCalendar } = useAdminModal();
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const initialDate = new Date();
  
  const fetchAvailableMenus = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableMenus();
  }, [refreshCalendar]);
  
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
    
    openMenuModal(date);
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
        <div className="flex items-start">
          <CalendarIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-green-800">Istruzioni</h4>
            <ul className="text-sm text-green-700 mt-1 space-y-1">
              <li>• <strong>Blu:</strong> Giorni con menù esistente - clicca per modificare</li>
              <li>• <strong>Verde:</strong> Giorni disponibili per creare nuovo menù</li>
              <li>• <strong>Grigio:</strong> Weekend o date passate (non modificabili)</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">Importante: Rimozione piatti</h4>
            <p className="text-sm text-amber-700 mt-1">
              Quando rimuovi un piatto da un menù, questo verrà automaticamente rimosso anche dalle selezioni degli utenti.
            </p>
          </div>
        </div>
      </div>
      {loading ? <div className="text-center py-8">Caricamento calendario...</div> : (
        <CustomCalendar
          value={initialDate}
          onClickDay={handleDateClick}
          availableMenus={availableMenus}
        />
      )}
    </div>
  );
};

export default MenuManagement;