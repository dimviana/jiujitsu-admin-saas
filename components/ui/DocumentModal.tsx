import React, { useState, useRef, useContext } from 'react';
import { Upload, Trash2, FileText, Image as ImageIcon, Loader } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { AppContext } from '../../context/AppContext';
import { Student, StudentDocument } from '../../types';

interface DocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, student }) => {
    const { saveStudent } = useContext(AppContext);
    const [documents, setDocuments] = useState<StudentDocument[]>(student.documents || []);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const newDoc: StudentDocument = {
                    id: `doc_${Date.now()}`,
                    name: file.name,
                    type: file.type.includes('pdf') ? 'pdf' : 'image',
                    url: base64String,
                    uploadDate: new Date().toISOString()
                };
                
                const updatedDocs = [...documents, newDoc];
                setDocuments(updatedDocs);
                
                // Prepare student data for update (excluding non-db fields if necessary, though saveStudent handles sanitization)
                // We construct a partial update object
                const { paymentStatus, lastSeen, paymentHistory, password, ...studentData } = student;
                
                await saveStudent({
                    ...studentData,
                    documents: updatedDocs
                });
                
                setIsUploading(false);
                // Clear input
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('Arquivo muito grande. Máximo 10MB.');
                setIsUploading(false);
                return;
            }
            
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este documento?')) {
            const updatedDocs = documents.filter(d => d.id !== docId);
            setDocuments(updatedDocs);
            
            const { paymentStatus, lastSeen, paymentHistory, password, ...studentData } = student;
            await saveStudent({
                ...studentData,
                documents: updatedDocs
            });
        }
    };

    const handleView = (doc: StudentDocument) => {
        const win = window.open();
        if (win) {
            // Basic viewer for Base64 content
            win.document.write(
                `<iframe src="${doc.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
            );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Documentos de ${student.name}`}>
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-600">
                        <p className="font-medium">Adicionar Documento</p>
                        <p className="text-xs text-slate-400">PDF, JPG ou PNG (Máx 10MB)</p>
                    </div>
                    <div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="application/pdf,image/*" 
                            onChange={handleFileUpload}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm">
                            {isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload
                        </Button>
                    </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {documents.length === 0 && (
                        <p className="text-center text-slate-400 py-8 italic">Nenhum documento anexado.</p>
                    )}
                    {documents.map(doc => (
                        <div key={doc.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded-lg ${doc.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {doc.type === 'pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate cursor-pointer hover:text-primary hover:underline" onClick={() => handleView(doc)}>{doc.name}</p>
                                    <p className="text-xs text-slate-400">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Excluir"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};