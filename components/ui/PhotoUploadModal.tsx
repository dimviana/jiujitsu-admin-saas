import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Image: string) => void;
    currentImage?: string;
    title?: string;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, onClose, onSave, currentImage, title = "Upload de Foto" }) => {
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecione um arquivo de imagem válido.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('A imagem deve ter no máximo 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveClick = () => {
        if (preview) {
            onSave(preview);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col items-center space-y-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center">
                        {preview ? (
                            <img 
                                src={preview} 
                                alt="Preview" 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            <ImageIcon className="w-16 h-16 text-slate-300" />
                        )}
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all rounded-full">
                            <Upload className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all" />
                        </div>
                    </div>
                </div>

                <div className="w-full text-center">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:text-amber-700 font-medium text-sm"
                    >
                        Clique para selecionar uma nova foto
                    </button>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG ou GIF (Máx. 5MB)</p>
                </div>

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                />

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg w-full text-center">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 w-full pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSaveClick} disabled={!preview || !!error}>
                        Salvar Foto
                    </Button>
                </div>
            </div>
        </Modal>
    );
};