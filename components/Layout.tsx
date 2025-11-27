import React, { useState, useContext } from 'react';
import { User } from '../types';
import { Menu, LogOut, Filter } from 'lucide-react';
import Sidebar from './Sidebar';
import { AppContext } from '../context/AppContext';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { academies, globalAcademyFilter, setGlobalAcademyFilter } = useContext(AppContext);

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800 capitalize hidden lg:block">
              {currentPage.replace('-', ' ')}
            </h2>
            
            {user.role === 'general_admin' && (
              <div className="relative">
                <Filter className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select 
                  value={globalAcademyFilter} 
                  onChange={(e) => setGlobalAcademyFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todas as Academias</option>
                  {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 ml-auto">
             <div className="flex items-center">
                 <img src={user.imageUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"/>
                 <div className="text-right hidden sm:block ml-3">
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

        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <BottomNav currentPage={currentPage} onNavigate={onNavigate}/>
      </div>
    </div>
  );
};
