import React, { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Utensils, AlertTriangle, Lock, Star, Filter, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { isDateLocked } from '../../utils/dateUtils';
import { FavoriteButton, FavoriteDishes } from '../User/FavoriteDishes';
import DishRating from '../User/DishRating';

interface MealSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
  availableMenus: Record<string, string[]>;
  userSelections: Record<string, string[]>;
  setUserSelections: (selections: Record<string, string[]>) => void;
}

const MealSelectionModal: React.FC<MealSelectionModalProps> = ({
  isOpen,
  onClose,
  date,
  selectedItems,
  setSelectedItems,
  availableMenus,
  userSelections,
  setUserSelections
}) => {
  const { currentUser, userFullName, isAdmin } = useAuth();
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const formattedDate = format(date, 'yyyy-MM-dd');
  const displayDate = format(date, 'EEEE d MMMM yyyy', { locale: it });
  const availableItems = availableMenus[formattedDate] || [];
  const isLocked = isDateLocked(date, isAdmin);
  const [saving, setSaving] = useState(false);
  
  const [nome, cognome] = (userFullName || 'nome cognome').split(' ');

  // Debug logging for modal state
  useEffect(() => {
    console.log('🎭 MealSelectionModal props changed:', {
      isOpen,
      date: formattedDate,
      availableItems: availableItems.length,
      selectedItems: selectedItems.length,
      saving
    });
  }, [isOpen, formattedDate, availableItems.length, selectedItems.length, saving]);

  // Check for removed dishes
  const removedDishes = selectedItems.filter(item => !availableItems.includes(item));
  const hasRemovedDishes = removedDishes.length > 0;
  
  useEffect(() => {
    if (hasRemovedDishes) {
      // Automatically remove invalid dishes from selection
      setSelectedItems(selectedItems.filter(item => availableItems.includes(item)));
    }
  }, [hasRemovedDishes, availableItems, selectedItems, setSelectedItems]);
  
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

      console.log('Saving selection:', selectionData);
      
      await setDoc(selectionRef, selectionData);
      
      setUserSelections({
        ...userSelections,
        [formattedDate]: selectedItems
      });
      
      toast.success(
        selectedItems.length > 0 
          ? 'Selezione salvata con successo'
          : 'Nessun piatto selezionato per questa data'
      );
      
      onClose();
    } catch (error) {
      console.error('Error saving meal selection:', error);
      toast.error('Errore nel salvataggio della selezione');
    } finally {
      setSaving(false);
    }
  };

  const isPastDay = isBefore(startOfDay(date), startOfDay(new Date()));
  const showRatings = isPastDay && userSelections[formattedDate]?.length > 0;

  const filteredItems = showOnlyFavorites
    ? availableItems.filter(item => item)
    : availableItems;

  // CRITICAL FIX: Always render the modal when isOpen is true
  console.log('🎭 About to render modal with isOpen:', isOpen);

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        {/* Backdrop with blur effect */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal Container - PERFECTLY CENTERED */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                {/* Header - Enhanced with gradient */}
                <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-full">
                        <Utensils className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {showRatings ? 'Valuta i piatti' : 'Selezione Pasti'}
                        </h3>
                        <p className="text-sm text-white/80 capitalize">
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
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors touch-manipulation"
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
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="p-6">
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
                        {userSelections[formattedDate].map((dish) => (
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
                                >
                                  <div 
                                    className="flex items-center justify-between"
                                    onClick={() => handleToggleItem(item)}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm sm:text-base font-medium text-gray-900 block truncate">
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
                  </div>
                </div>
                
                {/* Footer - Enhanced with better spacing */}
                {!showRatings && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors touch-manipulation"
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
                      >
                        {saving ? (
                          <div className="flex items-center">
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MealSelectionModal;