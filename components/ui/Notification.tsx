import React, { useEffect } from 'react';

interface NotificationProps {
  notification: {
    message: string;
    details: string;
    type: 'error' | 'success';
  };
  onClose: () => void;
}

const IconError = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconSuccess = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// FIX: Update IconX to accept SVG props to allow className to be passed.
const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 8000); // Auto-close after 8 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const themes = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-500',
            iconColor: 'text-red-500',
            titleColor: 'text-red-800',
            detailsColor: 'text-red-700',
            Icon: IconError,
        },
        success: {
            bg: 'bg-green-50',
            border: 'border-green-500',
            iconColor: 'text-green-500',
            titleColor: 'text-green-800',
            detailsColor: 'text-green-700',
            Icon: IconSuccess,
        }
    };
    
    const theme = themes[notification.type];
    const { Icon } = theme;

    return (
        <div className="fixed top-6 right-6 z-50 w-full max-w-sm" style={{animation: 'fade-in-down 0.5s ease-out forwards'}}>
            <div className={`rounded-lg shadow-lg p-4 border-l-4 ${theme.bg} ${theme.border}`}>
                <div className="flex">
                    <div className={`flex-shrink-0 ${theme.iconColor}`}>
                        <Icon />
                    </div>
                    <div className="ml-3 flex-1">
                        <p className={`text-sm font-bold ${theme.titleColor}`}>{notification.message}</p>
                        <p className={`mt-1 text-sm ${theme.detailsColor}`}>{notification.details}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 self-start">
                        <button onClick={onClose} className={`inline-flex rounded-md p-1.5 ${theme.bg} ${theme.titleColor} hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600`}>
                           <span className="sr-only">Fechar</span>
                           <IconX className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Notification;