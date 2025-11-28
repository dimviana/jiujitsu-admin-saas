import React, { useState, useContext, useRef, useEffect } from 'react';
import { User } from '../types';
import { Menu, LogOut, Filter, Sun, Moon, Monitor } from 'lucide-react';
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
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const { academies, globalAcademyFilter, setGlobalAcademyFilter, themeMode, setThemeMode } = useContext(AppContext);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light': return <Sun className="w-5 h-5" />;
      case 'dark': return <Moon className="w-5 h-5" />;
      case 'system': return <Monitor className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] flex transition-colors duration-300">
      <Sidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[var(--theme-card-bg)]/80 backdrop-blur-md border-b border-[var(--theme-text-primary)]/10 h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-30 transition-colors duration-300">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[var(--theme-text-primary)] focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[var(--theme-text-primary)] capitalize hidden lg:block">
              {currentPage.replace('-', ' ')}
            </h2>
            
            {user.role === 'general_admin' && (
              <div className="relative hidden md:block">
                <Filter className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select 
                  value={globalAcademyFilter} 
                  onChange={(e) => setGlobalAcademyFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-[var(--theme-bg)] text-[var(--theme-text-primary)] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todas as Academias</option>
                  {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 ml-auto">
             {/* Theme Switcher */}
             <div className="relative" ref={themeDropdownRef}>
                <button 
                  onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                  className="p-2 text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg)] rounded-full transition-colors"
                  title="Alterar Tema"
                >
                  {getThemeIcon()}
                </button>
                {themeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-[var(--theme-card-bg)] rounded-lg shadow-xl border border-[var(--theme-text-primary)]/10 py-1 z-50 overflow-hidden">
                      <button 
                        onClick={() => { setThemeMode('light'); setThemeDropdownOpen(false); }}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-[var(--theme-bg)] transition-colors ${themeMode === 'light' ? 'text-[var(--theme-primary)] font-medium' : 'text-[var(--theme-text-primary)]'}`}
                      >
                        <Sun className="w-4 h-4 mr-2" /> Claro
                      </button>
                      <button 
                        onClick={() => { setThemeMode('dark'); setThemeDropdownOpen(false); }}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-[var(--theme-bg)] transition-colors ${themeMode === 'dark' ? 'text-[var(--theme-primary)] font-medium' : 'text-[var(--theme-text-primary)]'}`}
                      >
                        <Moon className="w-4 h-4 mr-2" /> Escuro
                      </button>
                      <button 
                        onClick={() => { setThemeMode('system'); setThemeDropdownOpen(false); }}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-[var(--theme-bg)] transition-colors ${themeMode === 'system' ? 'text-[var(--theme-primary)] font-medium' : 'text-[var(--theme-text-primary)]'}`}
                      >
                        <Monitor className="w-4 h-4 mr-2" /> Sistema
                      </button>
                  </div>
                )}
             </div>

             <div className="flex items-center">
                 <img src={user.imageUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-[var(--theme-bg)]"/>
                 <div className="text-right hidden sm:block ml-3">
                   <p className="text-sm font-medium text-[var(--theme-text-primary)]">{user.name}</p>
                   <p className="text-xs text-[var(--theme-text-primary)]/70 capitalize">{user.role.replace('_', ' ')}</p>
                 </div>
             </div>
             <button 
                onClick={onLogout}
                className="p-2 text-[var(--theme-text-primary)]/60 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Sair"
             >
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 lg:pb-10 bg-[var(--theme-bg)] transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <BottomNav currentPage={currentPage} onNavigate={onNavigate}/>
      </div>
    </div>
  );
};