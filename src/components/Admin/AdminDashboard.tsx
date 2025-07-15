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

  // NUOVO STATO PER GESTIRE IL MODALE
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
  
  // Funzione fittizia per far aggiornare il calendario, se necessario
  const [refreshKey, setRefreshKey] = useState(0);
  const handleMenuSave = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src="https://www.arredissima.com/wp-content/uploads/logo-arredissima.svg" alt="ArredissimA Food" className="h-6 sm:h-8 mr-2 sm:mr-3" />
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pannello Amministratore</h1>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">👑 Admin</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button onClick={() => navigate('/calendar')} className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                <Calendar className="h-4 w-4 mr-1" />
                Vista Utente
              </button>
              <button onClick={handleLogout} className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200">
                <LogOut className="h-4 w-4 mr-1" />
                Esci
              </button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          {menuOpen && (<div className="sm:hidden py-4 border-t border-gray-200">{/* Mobile menu content */}</div>)}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-6">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-64 mb-4 sm:mb-0 sm:mr-6">
              <div className="bg-white shadow rounded-lg p-4">
                <Tab.List className="flex flex-col space-y-1">
                  {/* Lista delle schede */}
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Calendar className="h-5 w-5 mr-2" /><span>Gestione Menù</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Book className="h-5 w-5 mr-2" /><span>Gestione Piatti</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Users className="h-5 w-5 mr-2" /><span>Scelte Utenti</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Utensils className="h-5 w-5 mr-2" /><span>Report Cucina</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Star className="h-5 w-5 mr-2" /><span>Valutazioni</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><FileText className="h-5 w-5 mr-2" /><span>Esporta Dati</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><UserCog className="h-5 w-5 mr-2" /><span>Gestione Utenti</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><RefreshCw className="h-5 w-5 mr-2" /><span>Sincronizzazione</span></Tab>
                  <Tab className={({ selected }) => `flex items-center px-3 py-2 rounded-md text-left transition-colors ${selected ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}><Settings className="h-5 w-5 mr-2" /><span>Manutenzione</span></Tab>
                </Tab.List>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="bg-white shadow rounded-lg p-3 sm:p-6">
                <Tab.Panels>
                  <Tab.Panel><MenuManagement onDateClick={openMenuModal} key={refreshKey} /></Tab.Panel>
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

      {/* RENDERIZZA IL NUOVO MODALE QUI */}
      {dateForMenuModal && (
        <MenuManagementModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          date={dateForMenuModal}
          onSave={handleMenuSave}
        />
      )}
    </div>
  );
};

export default AdminDashboard;