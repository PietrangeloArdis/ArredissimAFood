// src/context/AdminModalContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminModalContextType {
  isMenuModalOpen: boolean;
  dateForMenuModal: Date | null;
  openMenuModal: (date: Date) => void;
  closeMenuModal: () => void;
  refreshCalendar: () => void;
}

const AdminModalContext = createContext<AdminModalContextType | undefined>(undefined);

export const useAdminModal = () => {
  const context = useContext(AdminModalContext);
  if (!context) {
    throw new Error('useAdminModal must be used within an AdminModalProvider');
  }
  return context;
};

interface AdminModalProviderProps {
    children: ReactNode;
    onRefresh: () => void;
}

export const AdminModalProvider: React.FC<AdminModalProviderProps> = ({ children, onRefresh }) => {
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [dateForMenuModal, setDateForMenuModal] = useState<Date | null>(null);

  const openMenuModal = (date: Date) => {
    setDateForMenuModal(date);
    setIsMenuModalOpen(true);
  };

  const closeMenuModal = () => {
    setIsMenuModalOpen(false);
    setDateForMenuModal(null);
  };

  const value = {
    isMenuModalOpen,
    dateForMenuModal,
    openMenuModal,
    closeMenuModal,
    refreshCalendar: onRefresh,
  };

  return (
    <AdminModalContext.Provider value={value}>
      {children}
    </AdminModalContext.Provider>
  );
};