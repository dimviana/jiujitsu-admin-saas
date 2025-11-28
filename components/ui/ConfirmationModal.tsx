import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'success' | 'secondary';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Sim', 
    cancelText = 'Não',
    variant = 'danger'
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div className="flex flex-col items-center text-center p-4">
                <div className={`p-3 rounded-full mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6">{message}</p>
                <div className="flex gap-3 w-full justify-center">
                    <Button variant="secondary" onClick={onClose} className="w-1/2 justify-center">
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={() => { onConfirm(); onClose(); }} className="w-1/2 justify-center">
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
