import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, LayoutDashboard, Pencil, Check, X, Calendar, Menu, ClipboardList, PieChart, Home, User, Bell, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Header: React.FC = () => {
  const { logout, currentUser, isAdmin, loading, userFullName, updateUserName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedNome, setEditedNome] = useState('');
  const [editedCognome, setEditedCognome] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Close menus when route changes
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Close menus on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const startEditing = () => {
    const [nome, cognome] = (userFullName || '').split(' ');
    setEditedNome(nome);
    setEditedCognome(cognome);
    setIsEditing(true);
  };
  
  const handleSave = async () => {
    if (!editedNome.trim() || !editedCognome.trim()) {
      toast.error('Nome e cognome sono obbligatori');
      return;
    }

    try {
      await updateUserName(editedNome.trim(), editedCognome.trim());
      setIsEditing(false);
      toast.success('Nome aggiornato con successo');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento del nome');
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const currentDate = format(new Date(), 'EEEE d MMMM yyyy', { locale: it });

  const navigationItems = [
    { path: '/home', label: 'Home', icon: Home, shortLabel: 'Home' },
    { path: '/calendar', label: 'Calendario', icon: Calendar, shortLabel: 'Calendario' },
    { path: '/calendar/weekly', label: 'Vista Settimanale', icon: ClipboardList, shortLabel: 'Settimanale' },
    { path: '/calendar/monthly', label: 'Riepilogo Mensile', icon: PieChart, shortLabel: 'Mensile' },
  ];

  const firstName = userFullName?.split(' ')[0] || 'Utente';
  const avatarInitial = firstName.charAt(0).toUpperCase();
  
  return (
    <>
      {/* Fixed header with proper z-index */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center py-3 sm:py-4">
            {/* Logo and Brand */}
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-w-0"
              >
                <img 
                  src="https://www.arredissima.com/wp-content/uploads/logo-arredissima.svg" 
                  alt="ArredissimA Food"
                  className="h-6 sm:h-8 flex-shrink-0"
                />
                <div className="hidden sm:block min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">ArredissimA Food</h1>
                  <p className="text-xs text-gray-500 truncate">Sistema prenotazione mensa</p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1 mx-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive(item.path)
                        ? 'bg-green-100 text-green-700 shadow-sm border border-green-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right Side - User Menu and Admin */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* Date Display - Hidden on mobile */}
              <div className="hidden xl:block text-xs text-gray-500 mr-2 max-w-32 truncate">
                {currentDate}
              </div>

              {/* Admin Panel Button */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center px-2 sm:px-3 py-2 border-2 border-yellow-300 text-xs sm:text-sm font-medium rounded-lg text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                    👑
                  </span>
                </button>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700 flex-shrink-0">
                    {avatarInitial}
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-24">{firstName}</p>
                    <p className="text-xs text-gray-500">Utente</p>
                  </div>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      {!isEditing ? (
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{userFullName}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                          </div>
                          <button
                            onClick={startEditing}
                            className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Modifica nome"
                          >
                            <Pencil className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedNome}
                            onChange={(e) => setEditedNome(e.target.value)}
                            className="w-full text-sm border rounded px-2 py-1"
                            placeholder="Nome"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editedCognome}
                            onChange={(e) => setEditedCognome(e.target.value)}
                            className="w-full text-sm border rounded px-2 py-1"
                            placeholder="Cognome"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleSave}
                              className="p-1 rounded-full hover:bg-green-100 text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="p-1 rounded-full hover:bg-red-100 text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Esci
                    </button>
                  </div>
                )}
              </div>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu - Full screen overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <img 
                src="https://www.arredissima.com/wp-content/uploads/logo-arredissima.svg" 
                alt="ArredissimA Food"
                className="h-6"
              />
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Date Display */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">{currentDate}</p>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-4 rounded-xl text-left font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-green-100 text-green-700 border-2 border-green-200 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <Icon className="h-6 w-6 mr-4 flex-shrink-0" />
                    <span className="text-base">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            {isAdmin && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-xl text-left font-medium text-yellow-700 bg-yellow-50 border-2 border-yellow-200"
              >
                <LayoutDashboard className="h-6 w-6 mr-4" />
                <span>Pannello Amministratore</span>
                <span className="ml-auto">👑</span>
              </button>
            )}
            
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="w-full flex items-center px-4 py-3 rounded-xl text-left font-medium text-gray-700 hover:bg-gray-50 border-2 border-transparent"
            >
              <LogOut className="h-6 w-6 mr-4" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Header;