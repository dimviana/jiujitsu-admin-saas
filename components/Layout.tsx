import React, { useState } from 'react';
import { User } from '../types';
import { Menu, Home, Users, DollarSign, Calendar, LogOut, Shield, Award, Activity, Settings, Briefcase, ClipboardCheck } from 'lucide-react';

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

  const NavItem = ({ icon: Icon, label, page }: { icon: any, label: string, page: string }) => (
    <button
      onClick={() => {
        onNavigate(page);
        setSidebarOpen(false);
      }}
      className={`flex items-center w-full px-6 py-3 text-left transition-colors duration-200 ${
        currentPage === page 
          ? 'bg-primary text-white border-r-4 border-white' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-30 w-64 h-screen bg-secondary text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-20 flex items-center justify-center border-b border-gray-800">
           <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold tracking-wider">BJJ HUB</h1>
           </div>
        </div>

        <nav className="mt-6 flex-1">
          <NavItem icon={Home} label="Dashboard" page="dashboard" />
          
          {user.role !== 'student' && (
            <>
              <NavItem icon={Users} label="Alunos" page="students" />
              <NavItem icon={Briefcase} label="Professores" page="professors" />
              <NavItem icon={DollarSign} label="Financeiro" page="financial" />
              <NavItem icon={Calendar} label="Agenda" page="schedule" />
              <NavItem icon={ClipboardCheck} label="Frequência" page="attendance" />
              <NavItem icon={Award} label="Graduação" page="graduation" />
              <NavItem icon={Activity} label="IA Coach" page="ai-coach" />
              <NavItem icon={Settings} label="Configurações" page="settings" />
            </>
          )}
           
           {user.role === 'student' && (
             <>
               <NavItem icon={Calendar} label="Minha Agenda" page="student-schedule" />
               <NavItem icon={DollarSign} label="Meus Pagamentos" page="student-financial" />
               <NavItem icon={Award} label="Meu Progresso" page="student-progress" />
             </>
           )}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center mb-4">
             <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
               {user.name.charAt(0)}
             </div>
             <div className="ml-3">
               <p className="text-sm font-medium text-white">{user.name}</p>
               <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 md:px-10 sticky top-0 z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-600 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {currentPage.replace('-', ' ')}
          </h2>

          <div className="flex items-center space-x-4">
             <span className="text-sm text-gray-500 hidden md:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};