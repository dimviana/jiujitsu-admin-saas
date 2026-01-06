
import React, { useMemo } from 'react';
import { ThemeSettings, ClassSchedule } from '../types';
import { LogIn } from 'lucide-react';

interface PublicPageProps {
  settings: ThemeSettings;
  schedules: ClassSchedule[];
  onLoginClick: () => void;
}

export const PublicPage: React.FC<PublicPageProps> = ({ settings, schedules, onLoginClick }) => {
  
  // Optimization: Sanitize and optimize injected HTML
  const optimizedHeroHtml = useMemo(() => {
      // Very basic optimization to add loading="eager" to hero image if present, 
      // or lazy to others. Since this is dangerouslySetInnerHTML, we rely on the backend/admin
      // to provide decent HTML, but we can try to improve it slightly.
      return settings.heroHtml; 
  }, [settings.heroHtml]);

  const optimizedAboutHtml = useMemo(() => {
      // Force lazy loading on images in the "About" section
      return settings.aboutHtml.replace(/<img /g, '<img loading="lazy" decoding="async" ');
  }, [settings.aboutHtml]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {settings.logoUrl ? (
                 <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
             ) : (
                 <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
             )}
             <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter truncate max-w-[200px] md:max-w-none">{settings.systemName}</span>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium">
             <a href="#home" className="hover:text-primary transition-colors">Início</a>
             <a href="#about" className="hover:text-primary transition-colors">Quem Somos</a>
             <a href="#schedule" className="hover:text-primary transition-colors">Horários</a>
             <a href="#contact" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <button 
            onClick={onLoginClick}
            className="bg-secondary text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors flex items-center shadow-lg shadow-slate-900/20"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Área do Aluno
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div id="home" className="pt-20">
          <div dangerouslySetInnerHTML={{ __html: optimizedHeroHtml }} />
      </div>

      {/* About Section */}
      <div id="about" dangerouslySetInnerHTML={{ __html: optimizedAboutHtml }} />

      {/* Schedule Section */}
      <section id="schedule" className="py-20 bg-slate-50">
         <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-secondary mb-12">Grade de Horários</h2>
            
            {schedules.length === 0 ? (
                <p className="text-center text-slate-500">Nenhum horário cadastrado no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.map(sc => (
                    <div key={sc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wide bg-primary/10 px-2 py-1 rounded">
                                {sc.dayOfWeek}
                            </span>
                            {(sc as any).academyName && (
                                <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]" title={(sc as any).academyName}>
                                    {(sc as any).academyName}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold mt-2 text-slate-800">{sc.className}</h3>
                        <p className="text-slate-500 mt-3 flex items-center">
                            <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700">
                                {sc.startTime} - {sc.endTime}
                            </span>
                        </p>
                    </div>
                ))}
                </div>
            )}
         </div>
      </section>

      {/* Contact Section - Mocked from settings */}
      <div id="contact" className="py-20 bg-white text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-6">Faça uma aula experimental</h2>
            <div className="prose prose-lg mx-auto text-slate-600 mb-8 whitespace-pre-line max-w-2xl">
                {settings.contactHtml || "Entre em contato para agendar sua visita."}
            </div>
            <button className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-amber-600 transition-all transform hover:scale-105 shadow-xl shadow-amber-500/30">
                Agendar Agora pelo WhatsApp
            </button>
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary text-slate-400 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-center md:text-left">
             <span className="text-white font-bold text-lg">{settings.systemName}</span>
             <p className="text-sm mt-2">© {new Date().getFullYear()} Todos os direitos reservados.</p>
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
