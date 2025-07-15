import React, { useState, useEffect } from 'react';
import { format, isWeekend, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc, writeBatch, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuOptions, Dish } from '../../types';
import { Dialog } from '@headlessui/react';
import { PlusCircle, Trash2, Save, X, Calendar as CalendarIcon, Edit, AlertTriangle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomCalendar from '../Calendar/CustomCalendar';
import { createPortal } from 'react-dom';

const MenuManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [newMenuItem, setNewMenuItem] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [removingDish, setRemovingDish] = useState<string | null>(null);
  
  // Imposta la data iniziale al giorno corrente
const initialDate = new Date();
  
  useEffect(() => {
    fetchAvailableMenus();
    fetchDishes();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchMenuForDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate]);
  
  const fetchAvailableMenus = async () => {
    try {
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);

      if (menusSnapshot.empty) {
        setAvailableMenus({});
        return;
      }
      
      const menus: Record<string, string[]> = {};
      let validDocuments = 0;
      let invalidDocuments = 0;
      
      menusSnapshot.forEach((doc) => {
        try {
          const menuData = doc.data() as MenuOptions;

          // Validate document structure
          if (!menuData.date) {
            invalidDocuments++;
            return;
          }

          if (!Array.isArray(menuData.availableItems)) {
            invalidDocuments++;
            return;
          }

          menus[menuData.date] = menuData.availableItems;
          validDocuments++;
        } catch (docError) {
          invalidDocuments++;
        }
      });
      
      setAvailableMenus(menus);
    } catch (error) {
      toast.error('Errore nel caricamento dei menù: ' + (error?.message || 'Errore sconosciuto'));
    }
  };

  const fetchMenuForDate = async (dateStr: string) => {
    try {
      setLoading(true);
      
      const menuRef = doc(db, 'menus', dateStr);
      const menuDoc = await getDoc(menuRef);
      
      if (menuDoc.exists()) {
        const menuData = menuDoc.data() as MenuOptions;
        setMenuItems(menuData.availableItems || []);
        setIsEditingExisting(true);
      } else {
        setMenuItems([]);
        setIsEditingExisting(false);
      }
    } catch (error) {
      toast.error('Errore nel caricamento del menù per la data selezionata');
    } finally {
      setLoading(false);
    }
  };

  const fetchDishes = async () => {
    try {
      const dishesRef = collection(db, 'dishes');
      const q = query(dishesRef, where('visible', '==', true));
      const snapshot = await getDocs(q);
      
      const dishesData: Dish[] = [];
      snapshot.forEach((doc) => {
        dishesData.push({ id: doc.id, ...doc.data() } as Dish);
      });
      
      setDishes(dishesData);
    } catch (error) {
      toast.error('Errore nel caricamento dei piatti');
    }
  };
  
  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const isWeekendDay = isWeekend(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);
    const isPastDate = clickedDate < today;
    const hasExistingMenu = availableMenus[formattedDate]?.length > 0;
    
    // Check if it's a weekend
    if (isWeekendDay) {
      toast.error('Non è possibile creare menù per i weekend');
      return;
    }
    
    // Check if it's a past date (before today)
    if (isPastDate) {
      toast.error('Non è possibile creare menù per date passate');
      return;
    }
    
    setSelectedDate(date);
    setModalOpen(true);
  };
  
  const handleAddMenuItem = () => {
    if (!newMenuItem.trim()) return;
    
    if (menuItems.includes(newMenuItem.trim())) {
      toast.error('Questo piatto è già stato aggiunto al menù');
      return;
    }
    
    setMenuItems([...menuItems, newMenuItem.trim()]);
    setNewMenuItem('');
    setSelectedCategory('');
  };
  
  const handleRemoveMenuItem = async (index: number) => {
    const removedItem = menuItems[index];
    
    if (!selectedDate) return;
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    
    // Show confirmation dialog
    const confirmed = confirm(
      `Sei sicuro di voler rimuovere "${removedItem}" dal menù del ${formattedDate}?\n\n` +
      `Questo rimuoverà automaticamente il piatto dalle selezioni di tutti gli utenti per questo giorno ` +
      `e invierà loro una notifica.`
    );
    
    if (!confirmed) return;

    try {
      setRemovingDish(removedItem);
      
      // Remove from current menu items
      const updatedItems = [...menuItems];
      updatedItems.splice(index, 1);
      setMenuItems(updatedItems);

      // Find all affected users and update their selections
      const selectionsRef = collection(db, 'menuSelections');
      const q = query(selectionsRef, where('date', '==', formattedDate));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      const affectedUsers: Array<{
        userId: string;
        email: string;
        nome: string;
        cognome: string;
      }> = [];

      // Process each selection document
      for (const selectionDoc of snapshot.docs) {
        try {
          const selection = selectionDoc.data();
          
          if (selection.selectedItems.includes(removedItem)) {
            // Get user details for notification
            const userRef = doc(db, 'users', selection.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              affectedUsers.push({
                userId: selection.userId,
                email: userData.email,
                nome: userData.nome,
                cognome: userData.cognome
              });
            }

            // Remove the dish from user's selection
            const updatedSelection = selection.selectedItems.filter((item: string) => item !== removedItem);
            batch.update(selectionDoc.ref, { 
              selectedItems: updatedSelection,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error processing selection:', error);
        }
      }

      // Commit the batch update
      await batch.commit();

      // Create notifications for affected users
      if (affectedUsers.length > 0) {
        await createNotificationsForAffectedUsers(affectedUsers, removedItem, formattedDate);
        
        toast.success(
          `Piatto rimosso dal menù e dalle selezioni di ${affectedUsers.length} utenti. ` +
          `Notifiche inviate agli utenti interessati.`
        );
      } else {
        toast.success('Piatto rimosso dal menù. Nessun utente era interessato.');
      }

    } catch (error) {
      toast.error('Errore durante la rimozione del piatto');
    } finally {
      setRemovingDish(null);
    }
  };

  const createNotificationsForAffectedUsers = async (
    affectedUsers: Array<{ userId: string; email: string; nome: string; cognome: string }>,
    removedDish: string,
    date: string
  ) => {
    try {
      const batch = writeBatch(db);
      const notificationsRef = collection(db, 'notifications');

      const formattedDate = format(new Date(date), 'EEEE d MMMM yyyy', { locale: it });

      for (const user of affectedUsers) {
        const notificationId = `${user.userId}_${date}_${removedDish.replace(/\s+/g, '_')}_${Date.now()}`;
        const notificationRef = doc(notificationsRef, notificationId);

        const notificationData = {
          userId: user.userId,
          type: 'dish_removed',
          title: '⚠️ Piatto rimosso dal menù',
          message: `Gentile ${user.nome}, il piatto "${removedDish}" che avevi selezionato per il giorno ${formattedDate} è stato rimosso dal menù. Ti invitiamo a modificare la tua selezione per non restare senza pasto.`,
          date: date,
          removedDish: removedDish,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: `/calendar?date=${date}`
        };

        batch.set(notificationRef, notificationData);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }
  };
  
  const handleSaveMenu = async () => {
    if (!selectedDate) return;
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      const menuRef = doc(db, 'menus', formattedDate);
      
      if (menuItems.length === 0) {
        // If no items, delete the menu document
        if (isEditingExisting) {
          await deleteDoc(menuRef);
          
          const newMenus = { ...availableMenus };
          delete newMenus[formattedDate];
          setAvailableMenus(newMenus);
          
          toast.success('Menù eliminato con successo');
        } else {
          toast.error('Aggiungi almeno un piatto per creare il menù');
          return;
        }
      } else {
        const menuData = {
          date: formattedDate,
          availableItems: menuItems,
          updatedAt: new Date().toISOString(),
          createdAt: isEditingExisting ? availableMenus[formattedDate] ? new Date().toISOString() : new Date().toISOString() : new Date().toISOString()
        };

        await setDoc(menuRef, menuData);
        
        setAvailableMenus({
          ...availableMenus,
          [formattedDate]: menuItems
        });
        
        toast.success(isEditingExisting ? 'Menù aggiornato con successo' : 'Menù creato con successo');
      }
      
      setModalOpen(false);
    } catch (error) {
      toast.error('Errore nel salvataggio del menù');
    }
  };
  
  const tileDisabled = ({ date }: { date: Date }) => {
    // Only disable weekends and past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return isWeekend(date) || checkDate < today;
  };
  
  const tileClassName = ({ date }: { date: Date }) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    let classes = '';
    
    if (isWeekend(date)) {
      classes += 'bg-gray-100 text-gray-400 cursor-not-allowed ';
    } else if (checkDate < today) {
      classes += 'bg-gray-100 text-gray-400 cursor-not-allowed ';
    } else {
      // Future weekdays - always clickable for admin
      classes += 'cursor-pointer hover:bg-blue-50 ';
      
      if (availableMenus[formattedDate]) {
        // Has existing menu
        classes += 'available-menu bg-blue-100 text-blue-800 border-blue-300 ';
      } else {
        // No menu yet - can create new
        classes += 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 ';
      }
    }
    
    return classes;
  };

  const filteredDishes = selectedCategory
    ? dishes.filter(dish => dish.category === selectedCategory)
    : dishes;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Gestione Menù</h2>
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>Clicca su una data per gestire il menù</span>
        </div>
      </div>

      {/* Instructions for admin */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start">
          <CalendarIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-green-800">
              Istruzioni per la gestione menù
            </h4>
            <ul className="text-sm text-green-700 mt-1 space-y-1">
              <li>• <strong>Blu:</strong> Giorni con menù esistente - clicca per modificare</li>
              <li>• <strong>Verde:</strong> Giorni disponibili per creare nuovo menù</li>
              <li>• <strong>Grigio:</strong> Weekend o date passate (non modificabili)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning about dish removal */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-amber-800">
              Importante: Rimozione piatti dal menù
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Quando rimuovi un piatto dal menù, verrà automaticamente rimosso anche dalle selezioni 
              di tutti gli utenti per quel giorno. Gli utenti interessati riceveranno una notifica 
              per informarli della modifica.
            </p>
          </div>
        </div>
      </div>
      
      <CustomCalendar
        value={initialDate}
        onClickDay={handleDateClick}
        tileDisabled={tileDisabled}
        tileClassName={tileClassName}
        minDate={initialDate}
        maxDate={new Date(2025, 11, 31)} // December 31, 2025
        availableMenus={availableMenus}
      />
      
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span className="text-sm text-gray-600">Menù Esistente (Clicca per modificare)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
          <span className="text-sm text-gray-600">Disponibile per Nuovo Menù</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-gray-300 mr-2"></div>
          <span className="text-sm text-gray-600">Weekend/Passato (Non modificabile)</span>
        </div>
      </div>
      
{modalOpen && selectedDate && createPortal(
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
          
          {/* Questo contenitore usa la classe CSS che funziona e centra il modale */}
          <div className="modal-overlay">
            <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all flex flex-col" style={{ maxHeight: '85vh' }}>
              
              {/* === INTESTAZIONE MODALE (non cambia) === */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    <span className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                      {isEditingExisting ? 'Modifica Menù' : 'Crea Nuovo Menù'}
                    </span>
                  </Dialog.Title>
                  <button onClick={() => setModalOpen(false)} className="rounded-full p-1 hover:bg-gray-100">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* === CONTENUTO SCORREVOLE (ora funziona) === */}
              <div className="flex-grow overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
                  </h3>
                  {!isEditingExisting && (
                    <p className="text-sm text-green-600 mt-1">
                      Stai creando un nuovo menù per questo giorno
                    </p>
                  )}
                </div>

                {loading ? (
                  <div className="py-8 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="px-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Filtra per Categoria
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="">Tutte le categorie</option>
                          <option value="Primo">Primi</option>
                          <option value="Secondo">Secondi</option>
                          <option value="Contorno">Contorni</option>
                          <option value="Vegetariano">Vegetariani</option>
                          <option value="Altro">Altro</option>
                        </select>
                      </div>

                      <div className="flex items-center mt-4">
                        <select
                          value={newMenuItem}
                          onChange={(e) => setNewMenuItem(e.target.value)}
                          className="flex-1 rounded-l-md border-gray-300 shadow-sm"
                        >
                          <option value="">Seleziona un piatto</option>
                          {filteredDishes.map((dish) => (
                            <option 
                              key={dish.id} 
                              value={dish.dishName}
                              disabled={menuItems.includes(dish.dishName)}
                            >
                              {dish.dishName}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMenuItem}
                          disabled={!newMenuItem}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          <PlusCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      {menuItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">{item}</div>
                          <button
                            onClick={() => handleRemoveMenuItem(index)}
                            disabled={removingDish === item}
                            className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500 disabled:opacity-50"
                            title="Rimuovi piatto (notificherà gli utenti interessati)"
                          >
                            {removingDish === item ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-500"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                      {menuItems.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          {isEditingExisting 
                            ? 'Nessun piatto nel menù. Aggiungine uno sopra.'
                            : 'Aggiungi piatti per creare il menù.'
                          }
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* === FOOTER MODALE (non cambia) === */}
              <div className="p-4 border-t border-gray-200 mt-auto">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMenu}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isEditingExisting ? 'Aggiorna Menù' : 'Crea Menù'}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>,
        document.body
      )}
    </div>
  );
};

export default MenuManagement;