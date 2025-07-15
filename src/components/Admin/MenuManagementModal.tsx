// src/components/Admin/MenuManagementModal.tsx

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuOptions, Dish } from '../../types';
import { Dialog } from '@headlessui/react';
import { PlusCircle, Trash2, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminModal } from '../../context/AdminModalContext';

export const MenuManagementModal: React.FC = () => {
  const { isMenuModalOpen, closeMenuModal, dateForMenuModal, refreshCalendar } = useAdminModal();

  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [newMenuItem, setNewMenuItem] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMenuModalOpen && dateForMenuModal) {
      fetchDishes();
      fetchMenuForDate(format(dateForMenuModal, 'yyyy-MM-dd'));
    }
  }, [isMenuModalOpen, dateForMenuModal]);

  const fetchDishes = async () => {
    const dishesRef = collection(db, 'dishes');
    const q = query(dishesRef, where('visible', '==', true));
    const snapshot = await getDocs(q);
    const dishesData: Dish[] = [];
    snapshot.forEach((doc) => dishesData.push({ id: doc.id, ...doc.data() } as Dish));
    setDishes(dishesData);
  };

  const fetchMenuForDate = async (dateStr: string) => {
    setLoading(true);
    const menuRef = doc(db, 'menus', dateStr);
    const menuDoc = await getDoc(menuRef);
    if (menuDoc.exists()) {
        setMenuItems(menuDoc.data().availableItems || []);
        setIsEditingExisting(true);
    } else {
        setMenuItems([]);
        setIsEditingExisting(false);
    }
    setLoading(false);
  };

  const handleAddMenuItem = () => {
    if (!newMenuItem.trim()) { toast.error('Seleziona un piatto.'); return; }
    if (menuItems.includes(newMenuItem.trim())) { toast.error('Questo piatto è già stato aggiunto.'); return; }
    setMenuItems([...menuItems, newMenuItem.trim()]);
    setNewMenuItem('');
    setSelectedCategory('');
  };

  const handleRemoveMenuItem = (index: number) => {
    const itemToRemove = menuItems[index];
    if (confirm(`Sei sicuro di voler rimuovere "${itemToRemove}"?`)) {
        setMenuItems(menuItems.filter((_, i) => i !== index));
    }
  };

  const handleSaveMenu = async () => {
    if (!dateForMenuModal) return;
    const formattedDate = format(dateForMenuModal, 'yyyy-MM-dd');
    const menuRef = doc(db, 'menus', formattedDate);
    try {
      if (menuItems.length === 0) {
        if (isEditingExisting) { await deleteDoc(menuRef); toast.success('Menù eliminato'); }
        else { toast.error('Aggiungi almeno un piatto'); return; }
      } else {
        const menuData: MenuOptions = { date: formattedDate, availableItems: menuItems };
        await setDoc(menuRef, menuData, { merge: true });
        toast.success(isEditingExisting ? 'Menù aggiornato' : 'Menù creato');
      }
      refreshCalendar();
      closeMenuModal();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  if (!isMenuModalOpen || !dateForMenuModal) return null;

  const filteredDishes = selectedCategory ? dishes.filter(d => d.category === selectedCategory) : dishes;

  return (
    <Dialog open={isMenuModalOpen} onClose={closeMenuModal} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-medium text-gray-900 flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />{isEditingExisting ? 'Modifica Menù' : 'Crea Nuovo Menù'}</Dialog.Title>
                    <button onClick={closeMenuModal} className="rounded-full p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <h3 className="font-medium text-gray-900">{format(dateForMenuModal, 'EEEE d MMMM yyyy', { locale: it })}</h3>
                {loading ? <div className="text-center py-8">Caricamento...</div> : (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filtra per Categoria</label>
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="">Tutte le categorie</option>
                                <option value="Primo">Primi</option>
                                <option value="Secondo">Secondi</option>
                                <option value="Contorno">Contorni</option>
                                <option value="Vegetariano">Vegetariani</option>
                                <option value="Altro">Altro</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <select value={newMenuItem} onChange={(e) => setNewMenuItem(e.target.value)} className="flex-1 rounded-l-md border-gray-300 shadow-sm">
                                <option value="">Seleziona un piatto</option>
                                {filteredDishes.map(d => <option key={d.id} value={d.dishName} disabled={menuItems.includes(d.dishName)}>{d.dishName}</option>)}
                            </select>
                            <button onClick={handleAddMenuItem} disabled={!newMenuItem} className="inline-flex items-center px-3 py-2 border rounded-r-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"><PlusCircle className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-2">
                            {menuItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <span>{item}</span>
                                    <button onClick={() => handleRemoveMenuItem(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                            {menuItems.length === 0 && <p className="text-center text-gray-500 py-4">Aggiungi piatti per creare il menù.</p>}
                        </div>
                    </>
                )}
            </div>
            <div className="p-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                    <button type="button" onClick={closeMenuModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annulla</button>
                    <button type="button" onClick={handleSaveMenu} disabled={loading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"><Save className="h-4 w-4 mr-1 inline" /> Salva</button>
                </div>
            </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};