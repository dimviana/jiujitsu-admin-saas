import React, { useState } from 'react';
import { User } from '../types';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-800 capitalize hidden lg:block">
            {currentPage.replace('-', ' ')}
          </h2>

          <div className="flex items-center space-x-4 ml-auto">
             <div className="flex items-center">
                 <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-3">
                   {user.name.charAt(0)}
                 </div>
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-slate-800">{user.name}</p>
                   <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                 </div>
             </div>
             <button 
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Sair"
             >
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};