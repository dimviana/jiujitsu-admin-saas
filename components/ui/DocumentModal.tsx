
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Upload, FileText, Image as ImageIcon, Trash2, Download } from 'lucide-react';
import { Student, StudentDocument } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';

interface DocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    onSave: (updatedDocuments: StudentDocument[]) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, student, onSave }) => {
    const [documents, setDocuments] = useState<StudentDocument[]>(student.documents || []);
    const [isUploading, setIsUploading] = useState(false);
    const [docToDelete, setDocToDelete] = useState<StudentDocument | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            
            if (!allowedTypes.includes(file.type)) {
                alert('Formato inválido. Apenas PDF, PNG e JPG são permitidos.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('O arquivo deve ter no máximo 5MB.');
                return;
            }

            setIsUploading(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const newDoc: StudentDocument = {
                    id: `doc_${Date.now()}`,
                    name: file.name,
                    url: base64String,
                    type: file.type.includes('pdf') ? 'pdf' : 'image',
                    date: new Date().toISOString()
                };
                
                const updatedList = [...documents, newDoc];
                setDocuments(updatedList);
                onSave(updatedList);
                setIsUploading(false);
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteClick = (doc: StudentDocument) => {
        setDocToDelete(doc);
    };

    const confirmDelete = () => {
        if (docToDelete) {
            const updatedList = documents.filter(d => d.id !== docToDelete.id);
            setDocuments(updatedList);
            onSave(updatedList);
            setDocToDelete(null);
        }
    };

    const handleDownload = (doc: StudentDocument) => {
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Documentos - ${student.name}`}>
                <div className="space-y-6">
                    {/* Upload Section */}
                    <div 
                        className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-600">Clique para enviar um novo documento</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG (Máx. 5MB)</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".pdf, .png, .jpg, .jpeg"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                        {isUploading && <p className="text-sm text-amber-500 mt-2 font-medium">Enviando...</p>}
                    </div>

                    {/* Documents List */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Anexos ({documents.length})</h4>
                        {documents.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-slate-100 rounded text-slate-500 flex-shrink-0">
                                                {doc.type === 'pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                                <p className="text-xs text-slate-400">{new Date(doc.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button 
                                                onClick={() => handleDownload(doc)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Baixar"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(doc)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic text-center py-4">Nenhum documento anexado.</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={onClose}>Fechar</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={confirmDelete}
                title="Excluir Documento"
                message={`Tem certeza que deseja excluir o documento "${docToDelete?.name}"?`}
                confirmText="Excluir"
                variant="danger"
            />
        </>
    );
};
