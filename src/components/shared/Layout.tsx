import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {/* Add proper spacing to account for fixed header */}
      <main className="pb-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;