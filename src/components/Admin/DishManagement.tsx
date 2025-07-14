import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Dish } from '../../types';
import { PlusCircle, Trash2, Edit2, Save, X, Search, Filter, AlertTriangle, GitMerge, Utensils, Coffee, Salad, Archive, Layers, Download, Upload, Pizza, Soup, Carrot, Coffee as CoffeeIcon } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import { findSimilarDishes, normalizeString, areSimilarStrings } from '../../utils/stringUtils';
import { format } from 'date-fns';
import { parse, unparse } from 'papaparse';

interface DuplicateGroup {
  mainDish: Dish;
  duplicates: Dish[];
}

interface MergeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateGroup[];
  onConfirm: () => void;
}

interface EditDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: Dish;
  onSave: (updatedDish: Dish) => Promise<void>;
}

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dish: Omit<Dish, 'id'>) => Promise<void>;
  existingDishes: Dish[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Per favore seleziona un file CSV valido');
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Nessun file selezionato');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        parse(event.target?.result as string, {
          header: true,
          complete: async (results) => {
            if (results.errors.length > 0) {
              setError('Errore nel parsing del file CSV');
              setLoading(false);
              return;
            }
            await onImport(results.data);
            setLoading(false);
            onClose();
          },
          error: (error) => {
            setError('Errore nella lettura del file: ' + error.message);
            setLoading(false);
          }
        });
      } catch (error) {
        setError('Errore nell\'elaborazione del file');
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Importa Piatti da CSV
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona file CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || loading}
                className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md
                  ${!file || loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importazione...
                  </>
                ) : (
                  'Importa'
                )}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingDishes
}) => {
  const [newDish, setNewDish] = useState<Omit<Dish, 'id'>>({
    dishName: '',
    category: 'Primo',
    vegetarian: false,
    visible: true,
    stagione: null,
    kitchenNote: '',
    isNew: true
  });
  const [saving, setSaving] = useState(false);
  const [similarDishes, setSimilarDishes] = useState<Dish[]>([]);

  useEffect(() => {
    if (newDish.dishName.trim()) {
      const similar = findSimilarDishes(newDish.dishName, existingDishes);
      setSimilarDishes(similar);
    } else {
      setSimilarDishes([]);
    }
  }, [newDish.dishName, existingDishes]);

  const handleSave = async () => {
    if (!newDish.dishName.trim()) {
      toast.error('Il nome del piatto è obbligatorio');
      return;
    }

    const exactMatch = existingDishes.find(
      d => normalizeString(d.dishName) === normalizeString(newDish.dishName)
    );
    if (exactMatch) {
      toast.error('Esiste già un piatto con questo nome');
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        ...newDish,
        dishName: newDish.dishName.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Error adding dish:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Aggiungi Nuovo Piatto
          </Dialog.Title>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Piatto
              </label>
              <input
                type="text"
                value={newDish.dishName}
                onChange={(e) => setNewDish({ ...newDish, dishName: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Inserisci il nome del piatto"
              />
              {similarDishes.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">Piatti simili trovati:</p>
                  <ul className="mt-1 text-sm text-yellow-700">
                    {similarDishes.map((dish, index) => (
                      <li key={index}>• {dish.dishName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={newDish.category}
                onChange={(e) => setNewDish({ ...newDish, category: e.target.value as Dish['category'] })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="Primo">Primo</option>
                <option value="Secondo">Secondo</option>
                <option value="Contorno">Contorno</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stagione
              </label>
              <select
                value={newDish.stagione || ""}
                onChange={(e) => setNewDish({ ...newDish, stagione: e.target.value || null })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tutto l'anno</option>
                <option value="Primavera">Primavera</option>
                <option value="Estate">Estate</option>
                <option value="Autunno">Autunno</option>
                <option value="Inverno">Inverno</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newDish.vegetarian}
                  onChange={(e) => setNewDish({ ...newDish, vegetarian: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Piatto vegetariano</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note per la cucina (opzionale)
              </label>
              <textarea
                value={newDish.kitchenNote}
                onChange={(e) => setNewDish({ ...newDish, kitchenNote: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Es. servire con salse a parte"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const EditDishModal: React.FC<EditDishModalProps> = ({
  isOpen,
  onClose,
  dish,
  onSave
}) => {
  const [editedDish, setEditedDish] = useState(dish);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editedDish.dishName.trim()) {
      toast.error('Il nome del piatto è obbligatorio');
      return;
    }

    setSaving(true);
    try {
      await onSave(editedDish);
      onClose();
    } catch (error) {
      console.error('Error saving dish:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Modifica Piatto
          </Dialog.Title>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Piatto
              </label>
              <input
                type="text"
                value={editedDish.dishName}
                onChange={(e) => setEditedDish({ ...editedDish, dishName: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={editedDish.category}
                onChange={(e) => setEditedDish({ ...editedDish, category: e.target.value as Dish['category'] })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="Primo">Primo</option>
                <option value="Secondo">Secondo</option>
                <option value="Contorno">Contorno</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stagione
              </label>
              <select
                value={editedDish.stagione || ""}
                onChange={(e) => setEditedDish({ ...editedDish, stagione: e.target.value || null })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Tutto l'anno</option>
                <option value="Primavera">Primavera</option>
                <option value="Estate">Estate</option>
                <option value="Autunno">Autunno</option>
                <option value="Inverno">Inverno</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedDish.vegetarian}
                  onChange={(e) => setEditedDish({ ...editedDish, vegetarian: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Piatto vegetariano</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note per la cucina (opzionale)
              </label>
              <textarea
                value={editedDish.kitchenNote || ''}
                onChange={(e) => setEditedDish({ ...editedDish, kitchenNote: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Es. servire con salse a parte"
                rows={3}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const DishManagement: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showHidden, setShowHidden] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: 'Tutti', icon: Layers, count: dishes.length },
    { 
      id: 'Primo', 
      label: 'Primi', 
      icon: Soup,
      count: dishes.filter(d => d.category === 'Primo').length 
    },
    { 
      id: 'Secondo', 
      label: 'Secondi', 
      icon: Pizza,
      count: dishes.filter(d => d.category === 'Secondo').length 
    },
    { 
      id: 'Contorno', 
      label: 'Contorni', 
      icon: Carrot,
      count: dishes.filter(d => d.category === 'Contorno').length 
    },
    { 
      id: 'Altro', 
      label: 'Altro', 
      icon: CoffeeIcon,
      count: dishes.filter(d => d.category === 'Altro').length 
    }
  ];

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      setLoading(true);
      const dishesRef = collection(db, 'dishes');
      const q = query(dishesRef, orderBy('dishName'));
      const snapshot = await getDocs(q);
      
      const dishesData: Dish[] = [];
      snapshot.forEach((doc) => {
        dishesData.push({ id: doc.id, ...doc.data() } as Dish);
      });
      
      setDishes(dishesData);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Errore nel caricamento dei piatti');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDish = async (updatedDish: Dish) => {
    try {
      const dishRef = doc(db, 'dishes', updatedDish.id);
      await updateDoc(dishRef, {
        ...updatedDish,
        updatedAt: new Date().toISOString()
      });

      setDishes(dishes.map(d => 
        d.id === updatedDish.id ? updatedDish : d
      ));

      toast.success('Piatto aggiornato con successo');
    } catch (error) {
      console.error('Error updating dish:', error);
      toast.error('Errore durante l\'aggiornamento del piatto');
      throw error;
    }
  };

  const handleToggleVisibility = async (dish: Dish) => {
    try {
      const dishRef = doc(db, 'dishes', dish.id);
      const newVisible = !dish.visible;
      
      await updateDoc(dishRef, {
        visible: newVisible,
        hiddenAt: newVisible ? null : new Date().toISOString()
      });

      setDishes(dishes.map(d => 
        d.id === dish.id 
          ? { ...d, visible: newVisible, hiddenAt: newVisible ? null : new Date().toISOString() }
          : d
      ));

      toast.success(`Piatto ${newVisible ? 'mostrato' : 'nascosto'} con successo`);
    } catch (error) {
      console.error('Error toggling dish visibility:', error);
      toast.error('Errore durante la modifica della visibilità');
    }
  };

  const handleDeleteDish = async (dish: Dish) => {
    if (!confirm(`Sei sicuro di voler eliminare "${dish.dishName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'dishes', dish.id));
      setDishes(dishes.filter(d => d.id !== dish.id));
      toast.success('Piatto eliminato con successo');
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast.error('Errore durante l\'eliminazione del piatto');
    }
  };

  const handleAddDish = async (newDish: Omit<Dish, 'id'>) => {
    try {
      const dishesRef = collection(db, 'dishes');
      const docRef = await addDoc(dishesRef, newDish);
      
      setDishes([...dishes, { id: docRef.id, ...newDish }]);
      toast.success('Piatto aggiunto con successo');
    } catch (error) {
      console.error('Error adding dish:', error);
      toast.error('Errore durante l\'aggiunta del piatto');
      throw error;
    }
  };

  const handleImport = async (data: any[]) => {
    try {
      const batch = writeBatch(db);
      let importCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const dishData: Omit<Dish, 'id'> = {
            dishName: row.dishName?.trim(),
            category: row.category || 'Altro',
            vegetarian: row.vegetarian === 'true' || row.vegetarian === '1' || row.vegetarian?.toLowerCase() === 'si',
            visible: true,
            stagione: row.stagione || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (!dishData.dishName) {
            errorCount++;
            continue;
          }

          const dishRef = doc(collection(db, 'dishes'));
          batch.set(dishRef, dishData);
          importCount++;
        } catch (error) {
          errorCount++;
          console.error('Error processing row:', error);
        }
      }

      await batch.commit();
      await fetchDishes();
      toast.success(`Importazione completata: ${importCount} piatti importati, ${errorCount} errori`);
    } catch (error) {
      console.error('Error importing dishes:', error);
      toast.error('Errore durante l\'importazione');
    }
  };

  const handleExport = () => {
    const exportData = dishes.map(dish => ({
      dishName: dish.dishName,
      category: dish.category,
      vegetarian: dish.vegetarian,
      stagione: dish.stagione || '',
      kitchenNote: dish.kitchenNote || ''
    }));

    const csv = unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `piatti_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const filteredDishes = dishes.filter(dish => {
    if (!showHidden && !dish.visible) return false;
    if (selectedCategory && dish.category !== selectedCategory) return false;
    if (searchQuery) {
      const normalizedSearch = normalizeString(searchQuery);
      const normalizedDish = normalizeString(dish.dishName);
      return normalizedDish.includes(normalizedSearch);
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Gestione Piatti</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Esporta</span> CSV
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Importa</span> CSV
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Aggiungi</span> Piatto
          </button>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-4 pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = category.id === 'all' ? selectedCategory === '' : selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === 'all' ? '' : category.id)}
                className={`flex-shrink-0 flex flex-col items-center p-4 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                style={{ minWidth: '120px' }}
              >
                <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                  {category.label}
                </span>
                <span className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                  ({category.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cerca Piatto
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Cerca per nome..."
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stagione
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Tutte le stagioni</option>
              <option value="Primavera">Primavera</option>
              <option value="Estate">Estate</option>
              <option value="Autunno">Autunno</option>
              <option value="Inverno">Inverno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibilità
            </label>
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                showHidden
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 bg-white'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showHidden ? 'Mostra tutti' : 'Nascondi non visibili'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento piatti...</p>
          </div>
        ) : filteredDishes.length > 0 ? (
          <>
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome Piatto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stagione
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDishes.map((dish) => (
                    <tr key={dish.id} className={!dish.visible ? 'bg-gray-50' : undefined}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {dish.dishName}
                            {dish.isNew && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Nuovo
                              </span>
                            )}
                          </div>
                        </div>
                        {dish.kitchenNote && (
                          <div className="mt-1 text-xs text-gray-500">
                            Note: {dish.kitchenNote}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {dish.category}
                          </span>
                          {dish.vegetarian && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Vegetariano
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {dish.stagione || "Tutto l'anno"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dish.visible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {dish.visible ? 'Visibile' : 'Nascosto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingDish(dish);
                              setEditModalOpen(true);
                            }}
                            className="p-1 rounded-full text-blue-600 hover:bg-blue-100"
                            title="Modifica"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleVisibility(dish)}
                            className={`p-1 rounded-full ${
                              dish.visible
                                ? 'text-red-600 hover:bg-red-100'
                                : 'text-green-600 hover:bg-green-100'
                            }`}
                            title={dish.visible ? 'Nascondi' : 'Mostra'}
                          >
                            {dish.visible ? 'Nascondi' : 'Mostra'}
                          </button>
                          <button
                            onClick={() => handleDeleteDish(dish)}
                            className="p-1 rounded-full text-red-600 hover:bg-red-100"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className={`p-4 ${!dish.visible ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {dish.dishName}
                        {dish.isNew && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Nuovo
                          </span>
                        )}
                      </h3>
                      {dish.kitchenNote && (
                        <p className="mt-1 text-xs text-gray-500">
                          Note: {dish.kitchenNote}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingDish(dish);
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-full text-blue-600 hover:bg-blue-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDish(dish)}
                        className="p-1.5 rounded-full text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dish.category}
                      </span>
                      {dish.vegetarian && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Vegetariano
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Stagione: {dish.stagione || "Tutto l'anno"}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        dish.visible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dish.visible ? 'Visibile' : 'Nascosto'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleVisibility(dish)}
                      className={`w-full mt-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                        dish.visible
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {dish.visible ? 'Nascondi Piatto' : 'Mostra Piatto'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">Nessun piatto trovato</p>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? 'Nessun piatto corrisponde ai criteri di ricerca.'
                : 'Non ci sono piatti nel sistema.'}
            </p>
          </div>
        )}
      </div>

      {editingDish && (
        <EditDishModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingDish(null);
          }}
          dish={editingDish}
          onSave={handleEditDish}
        />
      )}

      <AddDishModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddDish}
        existingDishes={dishes}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default DishManagement;