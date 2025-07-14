import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isModalOpen: boolean;
  selectedDate: Date | null;
  selectedItems: string[];
  openModal: (date: Date, currentItems: string[]) => void;
  closeModal: () => void;
  setSelectedItems: (items: string[]) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const openModal = (date: Date, currentItems: string[]) => {
    console.log('🎭 ModalContext: Opening modal for date:', date, 'with items:', currentItems);
    
    // CRITICAL FIX: Set all state synchronously and force re-render
    setSelectedDate(new Date(date)); // Create new Date object to ensure change detection
    setSelectedItems([...currentItems]); // Create a new array to avoid reference issues
    
    // CRITICAL FIX: Open modal immediately - no setTimeout needed
    setIsModalOpen(true);
    console.log('🎭 ModalContext: Modal state updated - isOpen: true');
    
    // CRITICAL FIX: Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    console.log('🎭 ModalContext: Closing modal');
    setIsModalOpen(false);
    
    // CRITICAL FIX: Restore body scroll
    document.body.style.overflow = 'unset';
    
    // CRITICAL FIX: Clear state after a short delay to allow for animations
    setTimeout(() => {
      setSelectedDate(null);
      setSelectedItems([]);
    }, 300);
  };

  const value = {
    isModalOpen,
    selectedDate,
    selectedItems,
    openModal,
    closeModal,
    setSelectedItems
  };

  console.log('🎭 ModalContext: Current state:', {
    isModalOpen,
    selectedDate: selectedDate ? selectedDate.toISOString().split('T')[0] : null,
    selectedItemsCount: selectedItems.length
  });

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};