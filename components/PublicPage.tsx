import React from 'react';
import { ThemeSettings, ClassSchedule } from '../types';
import { LogIn } from 'lucide-react';

interface PublicPageProps {
  settings: ThemeSettings;
  schedules: ClassSchedule[];
  onLoginClick: () => void;
}

export const PublicPage: React.FC<PublicPageProps> = ({ settings, schedules, onLoginClick }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <img src={settings.logoUrl} alt="Logo" className="h-10 w-10" />
             <span className="text-2xl font-bold text-slate-900 tracking-tighter">{settings.systemName}</span>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium">
             <a href="#home" className="hover:text-primary transition-colors">Início</a>
             <a href="#about" className="hover:text-primary transition-colors">Quem Somos</a>
             <a href="#schedule" className="hover:text-primary transition-colors">Horários</a>
             <a href="#contact" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <button 
            onClick={onLoginClick}
            className="bg-secondary text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors flex items-center"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Área do Aluno
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div id="home" dangerouslySetInnerHTML={{ __html: settings.heroHtml }} />

      {/* About Section */}
      <div id="about" dangerouslySetInnerHTML={{ __html: settings.aboutHtml }} />

      {/* Schedule Section */}
      <section id="schedule" className="py-20 bg-slate-50">
         <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-secondary mb-12">Grade de Horários</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {schedules.map(sc => (
                  <div key={sc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                     <span className="text-xs font-bold text-primary uppercase tracking-wide">{sc.dayOfWeek}</span>
                     <h3 className="text-xl font-bold mt-2">{sc.className}</h3>
                     <p className="text-slate-500 mt-2 flex items-center">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs mr-2">{sc.startTime} - {sc.endTime}</span>
                     </p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Contact Section - Mocked from settings */}
      <div id="contact" className="py-20 bg-white text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-secondary mb-6">Faça uma aula experimental</h2>
            <p className="text-lg text-slate-600 mb-8">{settings.contactHtml}</p>
            <button className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-amber-600 transition-transform hover:scale-105 shadow-lg">
                Agendar Agora pelo WhatsApp
            </button>
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary text-slate-400 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
           <div className="mb-4 md:mb-0">
             <span className="text-white font-bold text-lg">{settings.systemName}</span>
             <p className="text-sm mt-2">© 2023 Todos os direitos reservados.</p>
           </div>
           <div className="flex space-x-6">
             <a href="#" className="hover:text-white transition-colors">Instagram</a>
             <a href="#" className="hover:text-white transition-colors">Facebook</a>
           </div>
        </div>
      </footer>
    </div>
  );
};