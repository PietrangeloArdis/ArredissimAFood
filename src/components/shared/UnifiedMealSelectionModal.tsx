import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { X, Check, Utensils, AlertTriangle, Lock, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isDateLocked } from '../../utils/dateUtils';
import { FavoriteButton, FavoriteDishes } from '../User/FavoriteDishes';
import DishRating from '../User/DishRating';
import { createPortal } from 'react-dom';

const UnifiedMealSelectionModal: React.FC = () => {
  const { currentUser, userFullName, isAdmin } = useAuth();
  const { isModalOpen, selectedDate, selectedItems, closeModal, setSelectedItems } = useModal();
  
  // Always declare all hooks at the top level
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [userSelections, setUserSelections] = useState<Record<string, string[]>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Always derive values after hooks, with safe defaults
  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const displayDate = selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: it }) : '';
  const availableItems = availableMenus[formattedDate] || [];
  const isLocked = selectedDate ? isDateLocked(selectedDate, isAdmin) : false;
  const [nome, cognome] = (userFullName || 'nome cognome').split(' ');

  // Check for removed dishes
  const removedDishes = selectedItems.filter(item => !availableItems.includes(item));
  const hasRemovedDishes = removedDishes.length > 0;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data when modal opens
  useEffect(() => {
    if (isModalOpen && selectedDate && !dataLoaded) {
      fetchModalData();
    }
  }, [isModalOpen, selectedDate, dataLoaded]);

  // Reset data loaded state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setDataLoaded(false);
      setShowOnlyFavorites(false);
      setPermissionError(null);
    }
  }, [isModalOpen]);

  // Handle removed dishes
  useEffect(() => {
    if (hasRemovedDishes && dataLoaded) {
      setSelectedItems(selectedItems.filter(item => availableItems.includes(item)));
    }
  }, [hasRemovedDishes, availableItems, selectedItems, setSelectedItems, dataLoaded]);

  const fetchModalData = async () => {
    if (!currentUser) {
      setPermissionError('Devi essere autenticato per accedere ai dati');
      setDataLoaded(true);
      return;
    }

    try {
      setPermissionError(null);
      
      // Fetch available menus with proper error handling
      try {
        const menusRef = collection(db, 'menus');
        const menusSnapshot = await getDocs(menusRef);
        
        const menus: Record<string, string[]> = {};
        menusSnapshot.forEach((doc) => {
          try {
            const menuData = doc.data();
            if (menuData.date && Array.isArray(menuData.availableItems)) {
              menus[menuData.date] = menuData.availableItems || [];
            }
          } catch (docError) {
            // Silently skip invalid documents
          }
        });
        
        setAvailableMenus(menus);
      } catch (menuError) {
        if (menuError.code === 'permission-denied') {
          setPermissionError('Permessi insufficienti per leggere i menù. Contatta l\'amministratore.');
        } else {
          setPermissionError('Errore nel caricamento dei menù: ' + menuError.message);
        }
        setAvailableMenus({});
      }

      // Fetch user selections with proper error handling
      try {
        const selectionsRef = collection(db, 'menuSelections');
        const userSelectionsQuery = query(selectionsRef, where('userId', '==', currentUser.uid));
        const selectionsSnapshot = await getDocs(userSelectionsQuery);
        
        const selections: Record<string, string[]> = {};
        selectionsSnapshot.forEach((doc) => {
          try {
            const selectionData = doc.data();
            if (selectionData.date && Array.isArray(selectionData.selectedItems) && selectionData.selectedItems.length > 0) {
              selections[selectionData.date] = selectionData.selectedItems;
            }
          } catch (docError) {
            // Silently skip invalid documents
          }
        });
        
        setUserSelections(selections);
      } catch (selectionsError) {
        if (selectionsError.code === 'permission-denied') {
          setPermissionError('Permessi insufficienti per leggere le tue selezioni. Contatta l\'amministratore.');
        } else {
          // Non-critical error for selections
        }
        setUserSelections({});
      }

      setDataLoaded(true);
    } catch (error) {
      if (error.code === 'permission-denied') {
        setPermissionError('Permessi insufficienti per accedere ai dati. Contatta l\'amministratore.');
      } else {
        setPermissionError('Errore nel caricamento dei dati: ' + (error.message || 'Errore sconosciuto'));
      }
      setDataLoaded(true);
    }
  };
  
  const handleToggleItem = (item: string) => {
    if (isLocked) {
      toast.error('Le scelte per la giornata odierna non sono più modificabili');
      return;
    }
    
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };
  
  const handleSave = async () => {
    if (!currentUser) {
      toast.error('Devi essere autenticato per salvare le selezioni');
      return;
    }
    
    if (isLocked) {
      toast.error('Le scelte per la giornata odierna non sono più modificabili');
      return;
    }
    
    if (!selectedDate) {
      toast.error('Data non valida');
      return;
    }
    
    setSaving(true);
    try {
      const selectionRef = doc(db, 'menuSelections', `${currentUser.uid}_${formattedDate}`);
      
      const selectionData = {
        userId: currentUser.uid,
        nome,
        cognome,
        date: formattedDate,
        selectedItems: selectedItems,
        updatedAt: new Date().toISOString()
      };

      await setDoc(selectionRef, selectionData);
      
      // Update local state
      setUserSelections(prev => ({
        ...prev,
        [formattedDate]: selectedItems
      }));
      
      toast.success(
        selectedItems.length > 0 
          ? 'Selezione salvata con successo'
          : 'Nessun piatto selezionato per questa data'
      );
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('mealSelectionUpdated', {
        detail: { date: formattedDate, items: selectedItems }
      }));
      
      closeModal();
    } catch (error) {
      if (error.code === 'permission-denied') {
        toast.error('Permessi insufficienti per salvare la selezione. Contatta l\'amministratore.');
      } else {
        toast.error('Errore nel salvataggio della selezione: ' + (error.message || 'Errore sconosciuto'));
      }
    } finally {
      setSaving(false);
    }
  };

  // Early return only after all hooks have been called
  if (!isModalOpen || !selectedDate) {
    return null;
  }

  const isPastDay = isBefore(startOfDay(selectedDate), startOfDay(new Date()));
  const showRatings = isPastDay && userSelections[formattedDate]?.length > 0;

  const filteredItems = showOnlyFavorites
    ? availableItems.filter(item => item)
    : availableItems;

  // Use Portal to render at document body level
  const modalContent = (
    <div 
      className="modal-overlay force-visible force-modal-z-index"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: isMobile ? '0' : '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
    >
      {/* Modal Panel - FORCED VISIBILITY with responsive design */}
      <div 
        className={`modal-panel force-visible ${isMobile ? 'w-full rounded-t-2xl' : 'w-full max-w-lg rounded-2xl mx-4'}`}
        style={{
          position: 'relative',
          zIndex: 100000,
          maxHeight: isMobile ? '90vh' : '85vh',
          overflow: 'hidden',
          backgroundColor: 'white',
          borderRadius: isMobile ? '1rem 1rem 0 0' : '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? '100%' : '32rem',
          margin: isMobile ? '0' : '0 1rem',
          transform: isMobile ? 'translateY(0)' : 'translateY(0)',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'fadeIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Enhanced with gradient */}
        <div 
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
          style={{
            background: 'linear-gradient(to right, #22c55e, #3b82f6)',
            color: 'white',
            padding: isMobile ? '1rem' : '1rem 1.5rem'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                  {showRatings ? 'Valuta i piatti' : 'Selezione Pasti'}
                </h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80 capitalize`}>
                  {displayDate}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isLocked && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <Lock className="h-3 w-3 mr-1" />
                  Bloccato
                </span>
              )}
              <button 
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-white/20 transition-colors touch-manipulation"
                style={{
                  padding: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {isLocked && (
            <div className="mt-3 p-3 bg-red-500/20 rounded-lg border border-red-300/30">
              <p className="text-sm text-red-100">
                Le scelte per la giornata odierna non sono più modificabili
              </p>
            </div>
          )}
        </div>

        {/* Content - Scrollable with better spacing */}
        <div 
          className="overflow-y-auto smooth-scroll"
          style={{
            maxHeight: isMobile ? 'calc(90vh - 200px)' : 'calc(85vh - 200px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {/* Loading state */}
            {!dataLoaded && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-3"></div>
                <p className="text-gray-600">Caricamento dati...</p>
              </div>
            )}

            {/* Permission Error */}
            {permissionError && (
              <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Errore di Permessi
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {permissionError}
                    </p>
                    <button
                      onClick={() => {
                        setPermissionError(null);
                        setDataLoaded(false);
                        fetchModalData();
                      }}
                      className="mt-3 inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Riprova
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content when data is loaded */}
            {dataLoaded && !permissionError && (
              <>
                {/* Warning for removed dishes */}
                {hasRemovedDishes && (
                  <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          Piatti rimossi dal menù
                        </p>
                        <ul className="mt-2 text-sm text-amber-700 space-y-1">
                          {removedDishes.map((dish, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                              {dish}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-sm text-amber-700 bg-amber-100 p-2 rounded-lg">
                          Questi piatti sono stati rimossi dalla tua selezione. Seleziona nuovi piatti dal menù aggiornato.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {showRatings ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Valuta la tua esperienza</h3>
                      <p className="text-sm text-gray-600">I tuoi feedback ci aiutano a migliorare</p>
                    </div>
                    {userSelections[formattedDate]?.map((dish) => (
                      <DishRating
                        key={dish}
                        dishId={dish}
                        dishName={dish}
                        date={formattedDate}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <FavoriteDishes
                      onFilterChange={setShowOnlyFavorites}
                      showFilterToggle={true}
                    />
                    
                    {availableItems.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">
                            Piatti disponibili ({filteredItems.length})
                          </h3>
                          {selectedItems.length > 0 && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              {selectedItems.length} selezionati
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {filteredItems.map((item) => (
                            <div 
                              key={item}
                              className={`group relative p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation ${
                                isLocked
                                  ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                  : selectedItems.includes(item)
                                    ? 'bg-green-50 border-green-300 shadow-sm hover:shadow-md cursor-pointer'
                                    : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/50 cursor-pointer hover:shadow-sm'
                              }`}
                              style={{
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                minHeight: '44px'
                              }}
                            >
                              <div 
                                className="flex items-center justify-between"
                                onClick={() => handleToggleItem(item)}
                              >
                                <div className="flex-1 min-w-0">
                                  <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 block truncate`}>
                                    {item}
                                  </span>
                                  {selectedItems.includes(item) && (
                                    <span className="text-xs text-green-600 mt-1 block">
                                      ✓ Selezionato
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-3 flex-shrink-0">
                                  <FavoriteButton dishId={item} />
                                  {selectedItems.includes(item) && (
                                    <div className="p-1 bg-green-500 rounded-full">
                                      <Check className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {selectedItems.length === 0 && !isLocked && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="flex items-center">
                              <AlertTriangle className="h-5 w-5 text-blue-500 mr-3" />
                              <p className="text-sm text-blue-700">
                                Seleziona almeno un piatto per confermare la prenotazione
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="p-4 bg-amber-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                          <AlertTriangle className="h-10 w-10 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun menù disponibile</h3>
                        <p className="text-sm text-gray-600">
                          Il menù per questo giorno non è ancora stato pubblicato.
                          <br />
                          Controlla più tardi o contatta l'amministrazione.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Footer - Enhanced with better spacing */}
        {!showRatings && dataLoaded && !permissionError && (
          <div 
            className="border-t border-gray-200 bg-gray-50"
            style={{
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              padding: isMobile ? '1rem' : '1rem 1.5rem'
            }}
          >
            <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-end space-x-3'}`}>
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors touch-manipulation"
                style={{
                  padding: '0.625rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLocked || availableItems.length === 0 || saving}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 touch-manipulation ${
                  (isLocked || availableItems.length === 0 || saving) 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-sm hover:shadow-md'
                }`}
                style={{
                  padding: '0.625rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'white',
                  background: (isLocked || availableItems.length === 0 || saving) 
                    ? '#9ca3af' 
                    : 'linear-gradient(to right, #22c55e, #3b82f6)',
                  borderRadius: '0.75rem',
                  cursor: (isLocked || availableItems.length === 0 || saving) ? 'not-allowed' : 'pointer',
                  border: 'none',
                  minHeight: '44px'
                }}
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Salvataggio...
                  </div>
                ) : (
                  'Salva Scelta'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use Portal to render at document body level for maximum z-index control
  return createPortal(modalContent, document.body);
};

export default UnifiedMealSelectionModal;