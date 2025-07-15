// src/components/Admin/AdminDashboard.tsx

import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import MenuManagement from './MenuManagement';
import UserSelections from './UserSelections';
import ExportData from './ExportData';
import UserManagement from './UserManagement';
import UserSync from './UserSync';
import KitchenReport from './KitchenReport';
import DishManagement from './DishManagement';
import DishStats from './DishStats';
import CleanupTool from './CleanupTool';
import { Users, Calendar, FileText, LogOut, Utensils, UserCog, RefreshCw, Menu, X, Book, Star, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MenuManagementModal } from './MenuManagementModal'; // <-- IMPORTA IL NUOVO MODALE

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // NUOVO STATO PER GESTIRE IL MODALE DI GESTIONE MENU
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [dateForMenuModal, setDateForMenuModal] = useState<Date | null>(null);

  // NUOVA FUNZIONE PER APRIRE IL MODALE
  const openMenuModal = (date: Date) => {
    setDateForMenuModal(date);
    setIsMenuModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Intestazione (nessuna modifica qui) */}
      <div className="bg-white shadow">
        {/* ... il tuo codice dell'header ... */}
      </div>
      
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-6">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-64 mb-4 sm:mb-0 sm:mr-6">
              <div className="bg-white shadow rounded-lg p-4">
                <Tab.List className="flex flex-col space-y-1">
                  {/* ... il tuo codice delle Tab ... */}
                </Tab.List>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="bg-white shadow rounded-lg p-3 sm:p-6">
                <Tab.Panels>
                  <Tab.Panel>
                    {/* PASSA LA NUOVA FUNZIONE COME PROP */}
                    <MenuManagement onDateClick={openMenuModal} />
                  </Tab.Panel>
                  <Tab.Panel><DishManagement /></Tab.Panel>
                  <Tab.Panel><UserSelections /></Tab.Panel>
                  <Tab.Panel><KitchenReport /></Tab.Panel>
                  <Tab.Panel><DishStats /></Tab.Panel>
                  <Tab.Panel><ExportData /></Tab.Panel>
                  <Tab.Panel><UserManagement /></Tab.Panel>
                  <Tab.Panel><UserSync /></Tab.Panel>
                  <Tab.Panel><CleanupTool /></Tab.Panel>
                </Tab.Panels>
              </div>
            </div>
          </div>
        </Tab.Group>
      </div>

      {/* RENDERIZZA IL NUOVO MODALE QUI, AL LIVELLO SUPERIORE */}
      {dateForMenuModal && (
        <MenuManagementModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          date={dateForMenuModal}
          onSave={() => {
            // Qui potresti aggiungere una logica per forzare l'aggiornamento del calendario
            // Ma per ora, la chiusura è sufficiente
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;