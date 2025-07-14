import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuOptions } from '../types';

export const useMenuData = () => {
  const [availableMenus, setAvailableMenus] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const menusRef = collection(db, 'menus');
      const menusSnapshot = await getDocs(menusRef);

      if (menusSnapshot.empty) {
        setAvailableMenus({});
        setError('Nessun menù trovato nel database');
        return;
      }
      
      const menus: Record<string, string[]> = {};
      let validDocuments = 0;
      let invalidDocuments = 0;
      
      menusSnapshot.forEach((doc) => {
        try {
          const menuData = doc.data() as MenuOptions;

          if (!menuData.date) {
            invalidDocuments++;
            return;
          }

          if (!Array.isArray(menuData.availableItems)) {
            invalidDocuments++;
            return;
          }

          menus[menuData.date] = menuData.availableItems || [];
          validDocuments++;
        } catch (docError) {
          invalidDocuments++;
        }
      });
      
      setAvailableMenus(menus);
      
      if (Object.keys(menus).length === 0) {
        setError('Nessun menù valido trovato nel database');
      }
    } catch (error) {
      setError(error?.message || 'Errore sconosciuto nel caricamento menù');
      setAvailableMenus({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  return { availableMenus, loading, error, refetch: fetchMenus };
};