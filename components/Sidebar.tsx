import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Home, Users, DollarSign, UserCheck, Settings, X, Medal, Calendar, Briefcase, Activity } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, onNavigate }) => {
  const { themeSettings, user } = useContext(AppContext);

  const navLinks = [
    { to: "dashboard", text: "Dashboard", icon: <Home className="w-5 h-5" />, roles: ['general_admin', 'academy_admin', 'student'] },
    { to: "students", text: "Alunos", icon: <Users className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "professors", text: "Professores", icon: <Briefcase className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "graduation", text: "Graduações", icon: <Medal className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "schedule", text: "Horários", icon: <Calendar className="w-5 h-5" />, roles: ['general_admin', 'academy_admin', 'student'] },
    { to: "attendance", text: "Frequência", icon: <UserCheck className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "financial", text: "Financeiro", icon: <DollarSign className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "ai-coach", text: "IA Coach", icon: <Activity className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
    { to: "settings", text: "Configurações", icon: <Settings className="w-5 h-5" />, roles: ['general_admin', 'academy_admin'] },
  ];

  const studentLinks = [
      { to: "dashboard", text: "Meu Dashboard", icon: <Home className="w-5 h-5" /> },
      { to: "schedule", text: "Horários", icon: <Calendar className="w-5 h-5" /> },
      { to: "profile", text: "Meu Perfil", icon: <Users className="w-5 h-5" /> },
  ];

  const linksToShow = user?.role === 'student' ? studentLinks : navLinks.filter(link => link.roles.includes(user?.role || ''));

  const baseLinkClasses = "flex items-center px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-primary rounded-lg transition-colors duration-200 font-medium";
  const activeLinkClasses = "!bg-primary !text-white shadow-md shadow-amber-500/30";

  return (
    <>
      {/* Sidebar backdrop (for mobile) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      ></div>

      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-slate-200/80 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between items-center h-20 px-4 border-b border-slate-200/80">
          <button onClick={() => onNavigate('dashboard')} className="flex items-center">
            <img src={themeSettings.logoUrl} alt="Logo" className="h-10 w-auto" />
            <span className="text-slate-800 text-lg font-bold ml-3">{themeSettings.systemName}</span>
          </button>
          <button className="lg:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsOpen(false)}>
            <X />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4 flex-grow">
          <ul className="space-y-2">
            {linksToShow.map((link) => (
              <li key={link.to}>
                <button
                  onClick={() => { onNavigate(link.to); setIsOpen(false); }}
                  className={`${baseLinkClasses} w-full ${currentPage === link.to ? activeLinkClasses : ''}`}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
