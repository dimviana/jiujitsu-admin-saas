
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
        // Only run if user is logged in
        if (!user) {
            setIsVisible(false);
            setCurrentEvent(null);
            return;
        }

        const now = new Date();

        // 1. Filter and Sort Events
        // Sort by creation/start date descending (show newest valid event first)
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return dateB - dateA;
        });

        // 2. Find the first active event that matches criteria
        const activeEvent = sortedEvents.find(e => {
            if (!e.active) return false;

            // Date Check
            const start = new Date(e.startDate);
            const end = new Date(e.endDate);
            
            // Validate dates
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

            // Check if current time is within range
            if (now < start || now > end) return false;

            // Audience Check
            if (e.targetAudience && e.targetAudience.length > 0) {
                // If user is a student, check against studentId. If staff/admin, check against user.id
                const userIdToCheck = user.role === 'student' ? user.studentId : user.id;
                
                if (!userIdToCheck || !e.targetAudience.includes(userIdToCheck)) {
                    return false;
                }
            }

            return true;
        });

        if (activeEvent) {
            // Prevent resetting the timer if the same event is re-evaluated (e.g. context refresh)
            // unless it was previously closed or null
            if (currentEvent?.id !== activeEvent.id) {
                setCurrentEvent(activeEvent);
                setIsVisible(true);
                setCountdown(10);
            }
        } else {
            // If no active event fits criteria, ensure popup is closed
            setIsVisible(false);
            setCurrentEvent(null);
        }
    }, [events, user]); // Dependencies: Re-run when events list changes or user logs in

    useEffect(() => {
        let timer: any;
        if (isVisible && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (isVisible && countdown === 0) {
            handleClose();
        }
        return () => clearTimeout(timer);
    }, [isVisible, countdown]);

    const handleClose = () => {
        setIsVisible(false);
        // We don't nullify currentEvent immediately to allow for exit animation if we added one,
        // but here for simplicity we just hide it.
        setTimeout(() => setCurrentEvent(null), 300); 
    };

    if (!isVisible || !currentEvent) return null;

    // Resolve Academy Info for display
    const academy = academies.find(a => a.id === currentEvent.academyId);
    // Fallback to global theme settings if academy not found (e.g. general admin event)
    const academyLogo = academy?.imageUrl || themeSettings.logoUrl;
    const academyName = academy?.name || themeSettings.systemName;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-down">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative border border-slate-200 flex flex-col max-h-[90vh]">
                {/* Close Button & Timer */}
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                    <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center backdrop-blur-md font-mono border border-white/20">
                        <Clock className="w-3 h-3 mr-1.5" />
                        {countdown}s
                    </div>
                    <button 
                        onClick={handleClose}
                        className="bg-white text-slate-500 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-md transition-all border border-slate-200"
                        title="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {currentEvent.htmlContent ? (
                    // HTML Override Mode
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div 
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: currentEvent.htmlContent }} 
                        />
                    </div>
                ) : (
                    // Standard Layout Mode
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Header */}
                            <div className="bg-gradient-to-b from-slate-50 to-white p-6 text-center border-b border-slate-100">
                                {academyLogo && (
                                    <div className="inline-block p-1 bg-white rounded-full shadow-sm mb-3">
                                        <img 
                                            src={academyLogo} 
                                            alt="Logo" 
                                            className="h-20 w-20 object-contain rounded-full" 
                                        />
                                    </div>
                                )}
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{academyName}</h2>
                                <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">{currentEvent.title}</h1>
                            </div>

                            {/* Image */}
                            {currentEvent.imageUrl && (
                                <div className="w-full bg-slate-100">
                                    <img 
                                        src={currentEvent.imageUrl} 
                                        alt={currentEvent.title} 
                                        className="w-full max-h-64 object-contain mx-auto" 
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                                {currentEvent.description}
                            </div>

                            {/* Footer */}
                            {(currentEvent.footerContent) && (
                                <div className="bg-slate-50 p-4 border-t border-slate-100">
                                    {currentEvent.footerType === 'image' ? (
                                        <div className="flex justify-center">
                                            <img src={currentEvent.footerContent} alt="Footer" className="max-h-16 object-contain" />
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium text-slate-500 text-center">{currentEvent.footerContent}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Manual Close Bar */}
                        <div className="bg-slate-50 p-3 border-t border-slate-200">
                            <button 
                                onClick={handleClose}
                                className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-lg border border-slate-300 shadow-sm transition-colors text-sm"
                            >
                                Fechar Agora
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
