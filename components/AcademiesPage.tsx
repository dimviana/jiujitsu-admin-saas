



import React, { useContext, useState, FormEvent } from 'react';
import { AppContext } from '../context/AppContext';
import { Academy } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { Building, ChevronDown, ChevronRight, User, Briefcase, Edit, Mail, CheckCircle, XCircle, AlertTriangle, Lock, Unlock } from 'lucide-react';

interface AcademyFormProps {
    academy: Partial<Academy> | null;
    onSave: (academy: Academy) => void;
    onClose: () => void;
}

const AcademyForm: React.FC<AcademyFormProps> = ({ academy, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        address: '',
        responsible: '',
        responsibleRegistration: '',
        email: '',
        ...academy
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(formData as Academy);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome da Academia" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Endereço" name="address" value={formData.address || ''} onChange={handleChange} required />
            <Input label="Responsável" name="responsible" value={formData.responsible} onChange={handleChange} required />
            <Input label="CPF do Responsável" name="responsibleRegistration" value={formData.responsibleRegistration} onChange={handleChange} required />
            <Input label="Email de Contato" name="email" value={formData.email} onChange={handleChange} required type="email" />
            
            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </div>
        </form>
    );
};

const AcademiesPage: React.FC = () => {
    const { academies, professors, students, loading, saveAcademy, updateAcademyStatus, user } = useContext(AppContext);
    const [expandedAcademy, setExpandedAcademy] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
    const isGeneralAdmin = user?.role === 'general_admin';

    const toggleAcademy = (id: string) => {
        setExpandedAcademy(prev => (prev === id ? null : id));
    };

    const handleEditClick = (e: React.MouseEvent, academy: Academy) => {
        e.stopPropagation();
        setSelectedAcademy(academy);
        setIsModalOpen(true);
    };

    const handleSave = async (academyData: Academy) => {
        if (saveAcademy) {
             await saveAcademy(academyData);
             setIsModalOpen(false);
             setSelectedAcademy(null);
        } else {
            console.error("saveAcademy function not found in context");
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAcademy(null);
    };

    const handleStatusUpdate = async (e: React.MouseEvent, id: string, status: 'active' | 'rejected' | 'blocked') => {
        e.stopPropagation();
        
        let confirmMessage = '';
        if (status === 'active') confirmMessage = 'Deseja aprovar/ativar esta academia?';
        else if (status === 'rejected') confirmMessage = 'Deseja rejeitar esta academia?';
        else if (status === 'blocked') confirmMessage = 'ATENÇÃO: Ao bloquear esta academia, nenhum usuário vinculado conseguirá acessá-la. Deseja continuar?';

        if (window.confirm(confirmMessage)) {
            await updateAcademyStatus(id, status);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Academias</h1>
            
            {loading ? (
                <div className="text-center text-slate-500">Carregando academias...</div>
            ) : (
                <div className="space-y-4">
                    {academies.map(academy => {
                        const academyProfessors = professors.filter(p => p.academyId === academy.id);
                        const academyStudents = students.filter(s => s.academyId === academy.id);
                        const isExpanded = expandedAcademy === academy.id;
                        
                        const status = academy.status || 'active'; // Default to active if old data
                        const isPending = status === 'pending';
                        const isRejected = status === 'rejected';
                        const isBlocked = status === 'blocked';

                        let cardClass = '';
                        if (isPending) cardClass = 'border-l-4 border-l-amber-500';
                        else if (isRejected) cardClass = 'opacity-60 border-l-4 border-l-red-500';
                        else if (isBlocked) cardClass = 'opacity-80 border-l-4 border-l-slate-800 bg-slate-50';

                        return (
                            <Card key={academy.id} className={`p-0 overflow-hidden ${cardClass}`}>
                                <div 
                                    className="w-full text-left p-4 flex flex-col md:flex-row justify-between items-center bg-slate-50 hover:bg-slate-100 cursor-pointer gap-4"
                                    onClick={() => toggleAcademy(academy.id)}
                                >
                                    <div className="flex items-center w-full md:w-auto">
                                        <Building className={`w-8 h-8 mr-4 p-1.5 rounded-full border border-slate-200 ${isPending ? 'text-amber-500 bg-amber-50' : isBlocked ? 'text-slate-600 bg-slate-200' : 'text-primary bg-white'}`}/>
                                        <div>
                                            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                {academy.name}
                                                {isPending && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold border border-amber-200">Pendente</span>}
                                                {isRejected && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold border border-red-200">Rejeitado</span>}
                                                {isBlocked && <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-semibold border border-slate-300 flex items-center"><Lock className="w-3 h-3 mr-1"/> Bloqueado</span>}
                                            </h2>
                                            <p className="text-sm text-slate-500 flex items-center mt-1">
                                                <Mail className="w-3 h-3 mr-1" /> {academy.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4 md:space-x-6 w-full md:w-auto justify-between md:justify-end">
                                        <div className="hidden md:flex items-center space-x-6">
                                            <div className="text-center">
                                                <span className="block font-bold text-slate-700">{academyProfessors.length}</span>
                                                <span className="text-xs text-slate-500 uppercase">Profs</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block font-bold text-slate-700">{academyStudents.length}</span>
                                                <span className="text-xs text-slate-500 uppercase">Alunos</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                                            {isGeneralAdmin && (
                                                <>
                                                    {isPending && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="success" 
                                                                onClick={(e) => handleStatusUpdate(e, academy.id, 'active')}
                                                                className="px-2"
                                                                title="Aprovar"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="danger" 
                                                                onClick={(e) => handleStatusUpdate(e, academy.id, 'rejected')}
                                                                className="px-2"
                                                                title="Rejeitar"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    
                                                    {!isPending && !isRejected && (
                                                        <>
                                                            {isBlocked ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="success"
                                                                    onClick={(e) => handleStatusUpdate(e, academy.id, 'active')}
                                                                    className="px-2"
                                                                    title="Desbloquear Academia"
                                                                >
                                                                    <Unlock className="w-4 h-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="danger"
                                                                    onClick={(e) => handleStatusUpdate(e, academy.id, 'blocked')}
                                                                    className="px-2 bg-slate-800 hover:bg-slate-900 text-white border-slate-900"
                                                                    title="Bloquear Academia"
                                                                >
                                                                    <Lock className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={(e) => handleEditClick(e, academy)}
                                                className="flex items-center"
                                            >
                                                <Edit className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Editar</span>
                                            </Button>
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400"/> : <ChevronRight className="w-5 h-5 text-slate-400"/>}
                                        </div>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 bg-white animate-fade-in-down">
                                        {isPending && (
                                            <div className="col-span-full bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center">
                                                <AlertTriangle className="w-5 h-5 mr-2" />
                                                <p className="text-sm">Esta academia aguarda aprovação. O administrador responsável não poderá acessar o sistema até que ela seja ativada.</p>
                                            </div>
                                        )}
                                        {isBlocked && (
                                            <div className="col-span-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg flex items-center shadow-lg">
                                                <Lock className="w-5 h-5 mr-2" />
                                                <p className="text-sm">Esta academia está bloqueada. Nenhum usuário vinculado consegue realizar login.</p>
                                            </div>
                                        )}
                                        
                                        <div className="col-span-full mb-2">
                                            <p className="text-sm text-slate-600"><strong>Endereço:</strong> {academy.address}</p>
                                            <p className="text-sm text-slate-600"><strong>Responsável:</strong> {academy.responsible} (CPF: {academy.responsibleRegistration})</p>
                                        </div>

                                        {/* Professors List */}
                                        <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center border-b border-slate-200 pb-2">
                                                <Briefcase className="w-4 h-4 mr-2 text-primary"/> Corpo Docente
                                            </h3>
                                            <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                {academyProfessors.length > 0 ? academyProfessors.map(prof => (
                                                    <li key={prof.id} className="text-sm p-2 bg-white rounded border border-slate-100 shadow-sm flex items-center">
                                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                                        {prof.name}
                                                    </li>
                                                )) : <li className="text-sm text-slate-400 italic p-2">Nenhum professor registrado.</li>}
                                            </ul>
                                        </div>
                                        {/* Students List */}
                                        <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                            <h3 className="font-semibold text-slate-700 mb-3 flex items-center border-b border-slate-200 pb-2">
                                                <User className="w-4 h-4 mr-2 text-primary"/> Corpo Discente
                                            </h3>
                                            <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                {academyStudents.length > 0 ? academyStudents.map(stud => (
                                                    <li key={stud.id} className="text-sm p-2 bg-white rounded border border-slate-100 shadow-sm flex justify-between items-center">
                                                        <span>{stud.name}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${stud.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {stud.paymentStatus === 'paid' ? 'Em dia' : 'Pendente'}
                                                        </span>
                                                    </li>
                                                )) : <li className="text-sm text-slate-400 italic p-2">Nenhum aluno registrado.</li>}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Editar Academia">
                    <AcademyForm academy={selectedAcademy} onSave={handleSave} onClose={handleCloseModal} />
                </Modal>
            )}
        </div>
    );
};

export default AcademiesPage;