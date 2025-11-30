import React, { useContext } from 'react';
import { Home, Calendar, User, Users } from 'lucide-react';
import { AppContext } from '../context/AppContext';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { themeSettings } = useContext(AppContext);

  const links = [
    { 
      to: 'dashboard', 
      icon: Home, 
      label: 'Início', 
      visible: themeSettings.mobileNavShowDashboard !== false 
    },
    { 
      to: 'schedule', 
      icon: Calendar, 
      label: 'Horários', 
      visible: themeSettings.mobileNavShowSchedule !== false 
    },
    { 
      to: 'students', 
      icon: Users, 
      label: 'Alunos', 
      visible: themeSettings.mobileNavShowStudents !== false 
    },
    { 
      to: 'profile', 
      icon: User, 
      label: 'Meus Dados', 
      visible: themeSettings.mobileNavShowProfile !== false 
    },
  ];

  const visibleLinks = links.filter(link => link.visible);

  const navStyle: React.CSSProperties = {
    backgroundColor: themeSettings.mobileNavBgColor || '#ffffff',
    height: `${themeSettings.mobileNavHeight || 60}px`,
    borderRadius: `${themeSettings.mobileNavBorderRadius || 0}px`,
    bottom: `${themeSettings.mobileNavBottomMargin || 0}px`,
    left: themeSettings.mobileNavFloating ? '16px' : '0',
    right: themeSettings.mobileNavFloating ? '16px' : '0',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
    borderTop: themeSettings.mobileNavFloating ? 'none' : '1px solid rgba(0,0,0,0.05)',
  };

  return (
    <div 
        className="lg:hidden fixed flex justify-between items-center px-6 z-40"
        style={navStyle}
    >
      {visibleLinks.map((link) => {
        const Icon = link.icon;
        const isActive = currentPage === link.to;
        const color = isActive 
            ? (themeSettings.mobileNavActiveColor || '#f59e0b') 
            : (themeSettings.mobileNavInactiveColor || '#94a3b8');

        return (
            <button
            key={link.to}
            onClick={() => onNavigate(link.to)}
            className="flex flex-col items-center justify-center space-y-1 transition-colors"
            style={{ color }}
            >
            <Icon 
                style={{ 
                    width: `${themeSettings.mobileNavIconSize || 24}px`, 
                    height: `${themeSettings.mobileNavIconSize || 24}px` 
                }} 
            />
            <span className="text-[10px] font-medium">{link.label}</span>
            </button>
        );
      })}
    </div>
  );
};

export default BottomNav;