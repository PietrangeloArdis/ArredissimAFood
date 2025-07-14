import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MenuSelection, User, MenuOptions } from '../../types';
import { Calendar, Search, User as UserIcon, Filter } from 'lucide-react';

const UserSelections: React.FC = () => {
  const [selections, setSelections] = useState<MenuSelection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const userData: User[] = [];
      usersSnapshot.forEach((doc) => {
        userData.push({
          id: doc.id,
          ...doc.data()
        } as User);
      });
      
      setUsers(userData);
      
      // Fetch available menus
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);
      
      const menus: Record<string, string[]> = {};
      menusSnapshot.forEach((doc) => {
        const menuData = doc.data() as MenuOptions;
        menus[menuData.date] = menuData.availableItems || [];
      });
      
      setAvailableMenus(menus);
      
      // Fetch selections
      const selectionsRef = collection(db, 'menuSelections');
      const selectionsSnapshot = await getDocs(selectionsRef);
      
      const selectionsData: MenuSelection[] = [];
      selectionsSnapshot.forEach((doc) => {
        const selection = doc.data() as MenuSelection;
        
        // Filter out dishes that are no longer available in the menu for that date
        const availableItems = menus[selection.date] || [];
        const validSelectedItems = selection.selectedItems.filter(item => 
          availableItems.includes(item)
        );
        
        // Only include selections that have valid items
        if (validSelectedItems.length > 0) {
          selectionsData.push({
            ...selection,
            selectedItems: validSelectedItems
          });
        }
      });
      
      setSelections(selectionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUser(e.target.value);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleClearFilters = () => {
    setSelectedDate('');
    setSelectedUser('');
    setSearchQuery('');
  };
  
  const filteredSelections = selections.filter((selection) => {
    if (selectedDate && selection.date !== selectedDate) {
      return false;
    }
    
    if (selectedUser && selection.userId !== selectedUser) {
      return false;
    }
    
    if (searchQuery) {
      const items = selection.selectedItems.join(' ').toLowerCase();
      if (!items.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
  
  const getUserFullName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.nome} ${user.cognome}` : 'Utente Sconosciuto';
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900">Scelte Utenti</h2>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-4 items-end">
        <div className="flex-1">
          <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="h-4 w-4 inline mr-1" />
            Filtra per Data
          </label>
          <input
            type="date"
            id="date-filter"
            value={selectedDate}
            onChange={handleDateChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        
        <div className="flex-1">
          <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-1">
            <UserIcon className="h-4 w-4 inline mr-1" />
            Filtra per Utente
          </label>
          <select
            id="user-filter"
            value={selectedUser}
            onChange={handleUserChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Tutti gli Utenti</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nome} {user.cognome}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
            <Search className="h-4 w-4 inline mr-1" />
            Cerca Piatti
          </label>
          <input
            type="text"
            id="search-filter"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cerca piatti..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
        >
          Cancella Filtri
        </button>
      </div>
      
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
              <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Caricamento selezioni...</p>
          </div>
        ) : filteredSelections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Piatti Scelti
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSelections.map((selection, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(selection.date), 'EEEE d MMMM yyyy', { locale: it })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getUserFullName(selection.userId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {selection.selectedItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Nessuna selezione trovata con i filtri attuali.</p>
            {(selectedDate || selectedUser || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="mt-2 inline-flex items-center px-3 py-1 text-sm text-blue-700 hover:text-blue-900"
              >
                Cancella tutti i filtri
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelections;