// src/context/AdminModalContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminModalContextType {
  isMenuModalOpen: boolean;
  dateForMenuModal: Date | null;
  openMenuModal: (date: Date) => void;
  closeMenuModal: () => void;
  refreshCalendar: () => void; // Aggiunto per l'aggiornamento
}

const AdminModalContext = createContext<AdminModalContextType | undefined>(undefined);

export const useAdminModal = () => {
  const context = useContext(AdminModalContext);
  if (!context) {
    throw new Error('useAdminModal must be used within an AdminModalProvider');
  }
  return context;
};

export const AdminModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [dateForMenuModal, setDateForMenuModal] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openMenuModal = (date: Date) => {
    setDateForMenuModal(date);
    setIsMenuModalOpen(true);
  };

  const closeMenuModal = () => {
    setIsMenuModalOpen(false);
    setDateForMenuModal(null);
  };

  const refreshCalendar = () => {
    setRefreshKey(prev => prev + 1);
  };

  const value = {
    isMenuModalOpen,
    dateForMenuModal,
    openMenuModal,
    closeMenuModal,
    refreshCalendar,
  };

  return (
    <AdminModalContext.Provider value={{ ...value, key: refreshKey }}>
      {children}
    </AdminModalContext.Provider>
  );
};