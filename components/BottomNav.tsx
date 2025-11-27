import React from 'react';
import { Home, Calendar, User, Users } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const links = [
    { to: 'dashboard', icon: <Home className="w-6 h-6" />, label: 'Início' },
    { to: 'schedule', icon: <Calendar className="w-6 h-6" />, label: 'Horários' },
    { to: 'students', icon: <Users className="w-6 h-6" />, label: 'Alunos' }, // Shows for students too, handled by logic but simplified here
    { to: 'profile', icon: <User className="w-6 h-6" />, label: 'Meus Dados' },
  ];

  return (
    <div className="lg:hidden bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40">
      {links.map((link) => (
        <button
          key={link.to}
          onClick={() => onNavigate(link.to)}
          className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
            currentPage === link.to ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {link.icon}
          <span className="text-[10px] font-medium">{link.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;