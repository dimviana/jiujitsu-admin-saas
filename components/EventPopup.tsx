
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Clock } from 'lucide-react';
import { SystemEvent } from '../types';

export const EventPopup: React.FC = () => {
    const { events, user, academies, themeSettings } = useContext(AppContext);
    const [currentEvent, setCurrentEvent] = useState<SystemEvent | null>(null);
    const [countdown, setCountdown] = useState(10);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsVisible(false);
            return;
        }

        // Logic to find active event
        // 1. Must be active status
        // 2. Current date must be within start/end dates
        // 3. Must belong to the user's academy (handled by context filtering usually, but double check)
        // 4. Must target the user (if targetAudience is set)
        const now = new Date();
        const activeEvent = events.find(e => {
            if (!e.active) return false;
            const start = new Date(e.startDate);
            const end = new Date(e.endDate);
            const isDateValid = now >= start && now <= end;
            
            if (!isDateValid) return false;

            // Check Audience
            if (e.targetAudience && e.targetAudience.length > 0) {
                // Determine user ID based on role/context
                const userIdToCheck = user.role === 'student' ? user.studentId : user.id;
                if (!userIdToCheck || !e.targetAudience.includes(userIdToCheck)) {
                    return false;
                }
            }

            return true;
        });

        if (activeEvent) {
            setCurrentEvent(activeEvent);
            // Check if this specific event session has been shown? 
            // Requirement says "always when... login". Assuming context refresh implies new session or page load.
            setIsVisible(true);
            setCountdown(10);
        } else {
            setIsVisible(false);
        }
    }, [events, user]);

    useEffect(() => {
        if (isVisible && countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (isVisible && countdown === 0) {
            handleClose();
        }
    }, [isVisible, countdown]);

    const handleClose = () => {
        setIsVisible(false);
        setCurrentEvent(null);
    };

    if (!isVisible || !currentEvent) return null;

    // Get current Academy details for the standard layout
    // If academy admin/student, getting from user.academyId. If general admin, uses fallback.
    const academy = academies.find(a => a.id === currentEvent.academyId);
    const academyLogo = academy?.imageUrl || themeSettings.logoUrl;
    const academyName = academy?.name || themeSettings.systemName;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-down">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative border border-slate-200">
                {/* Close Button & Timer */}
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center backdrop-blur-md">
                        <Clock className="w-3 h-3 mr-1" />
                        {countdown}s
                    </div>
                    <button 
                        onClick={handleClose}
                        className="bg-white/90 text-slate-500 hover:text-red-500 p-1.5 rounded-full shadow-sm hover:bg-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {currentEvent.htmlContent ? (
                    // HTML Override Mode
                    <div 
                        className="w-full h-full overflow-y-auto max-h-[80vh]"
                        dangerouslySetInnerHTML={{ __html: currentEvent.htmlContent }} 
                    />
                ) : (
                    // Standard Layout Mode
                    <div className="flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-50 to-white p-6 text-center border-b border-slate-100">
                            {academyLogo && (
                                <img 
                                    src={academyLogo} 
                                    alt="Logo" 
                                    className="h-20 w-20 mx-auto object-contain mb-3 rounded-full bg-white shadow-sm p-1" 
                                />
                            )}
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{academyName}</h2>
                            <h1 className="text-2xl font-bold text-slate-800 mt-1">{currentEvent.title}</h1>
                        </div>

                        {/* Image */}
                        {currentEvent.imageUrl && (
                            <div className="w-full h-48 bg-slate-100 relative">
                                <img 
                                    src={currentEvent.imageUrl} 
                                    alt={currentEvent.title} 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                            {currentEvent.description}
                        </div>

                        {/* Footer */}
                        {(currentEvent.footerContent) && (
                            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center items-center">
                                {currentEvent.footerType === 'image' ? (
                                    <img src={currentEvent.footerContent} alt="Footer" className="max-h-16 object-contain" />
                                ) : (
                                    <p className="text-sm font-medium text-slate-500 text-center">{currentEvent.footerContent}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Manual Close Bar at bottom (Optional UX improvement for mobile) */}
                <button 
                    onClick={handleClose}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-3 transition-colors border-t border-slate-200"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
