import React, { useState, useContext, FormEvent, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Professor } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

const validateCPF = (cpf: string): boolean => {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

    const digits = cpf.split('').map(el => +el);

    const rest = (count: number): number => {
        let sum = 0;
        for (let i = 0; i < count; i++) {
        sum += digits[i] * (count + 1 - i);
        }
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    if (rest(9) !== digits[9]) return false;
    if (rest(10) !== digits[10]) return false;

    return true;
};

// Helper to format date string from API/DB (often includes time or is ISO) to YYYY-MM-DD for input type="date"
const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
        return dateString.split('T')[0];
    } catch (e) {
        return '';
    }
};

// Form component
interface ProfessorFormProps {
  professor: Partial<Professor> | null;
  onSave: (prof: Omit<Professor, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const ProfessorForm: React.FC<ProfessorFormProps> = ({ professor, onSave, onClose }) => {
  const { academies, graduations, user } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: '',
    fjjpe_registration: '',
    cpf: '',
    academyId: user?.role === 'academy_admin' ? user.academyId || '' : (professor?.academyId || ''),
    graduationId: '',
    ...professor,
    // Format the date properly for input field
    blackBeltDate: formatDateForInput(professor?.blackBeltDate),
  });
  const [cpfError, setCpfError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
        if (value && !validateCPF(value)) {
            setCpfError('CPF inválido');
        } else {
            setCpfError('');
        }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.cpf && !validateCPF(formData.cpf)) {
        setCpfError('Por favor, insira um CPF válido.');
        return;
    }
    onSave(formData as any);
  };

  const selectStyles = "w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nome do Professor" name="name" value={formData.name} onChange={handleChange} required />
      <Input label="Registro FJJPE" name="fjjpe_registration" value={formData.fjjpe_registration} onChange={handleChange} required />
      <div>
        <Input label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} required />
        {cpfError && <p className="text-sm text-red-500 mt-1">{cpfError}</p>}
      </div>
      
      {/* Seletor de Academia (Apenas para Admin Geral) */}
      {user?.role === 'general_admin' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academia</label>
            <select name="academyId" value={formData.academyId} onChange={handleChange} required className={selectStyles}>
              <option value="">Selecione a Academia</option>
              {academies.map(ac => <option key={ac.id} value={ac.id}>{ac.name}</option>)}
            </select>
          </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Graduação</label>
        <select name="graduationId" value={formData.graduationId} onChange={handleChange} required className={selectStyles}>
          <option value="">Selecione a Graduação</option>
          {graduations.sort((a, b) => a.rank - b.rank).map(grad => <option key={grad.id} value={grad.id}>{grad.name}</option>)}
        </select>
      </div>
      <div>
        <Input
            label="Data da Faixa Preta"
            name="blackBeltDate"
            type="date"
            value={formData.blackBeltDate}
            onChange={handleChange}
        />
        <p className="text-xs text-slate-500 mt-1 px-1">Usado para calcular os graus para faixas preta e superiores.</p>
      </div>
      <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 mt-6">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!!cpfError}>Salvar</Button>
      </div>
    </form>
  );
};

interface PhotoUploadModalProps {
    professor: Professor;
    onSave: (professor: Professor, imageUrl: string) => void;
    onClose: () => void;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ professor, onSave, onClose }) => {
    const [preview, setPreview] = useState<string | null>(professor.imageUrl || null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSaveClick = () => {
        if (preview) {
            onSave(professor, preview);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Alterar foto de ${professor.name}`}>
            <div className="flex flex-col items-center">
                <img
                    src={preview || `https://ui-avatars.com/api/?name=${professor.name}`}
                    alt="Preview"
                    className="w-40 h-40 rounded-full object-cover mb-4 border-4 border-slate-200 shadow-md"
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Escolher Arquivo
                </Button>
                <p className="text-sm text-slate-500 mt-2">Selecione uma imagem do seu computador.</p>
            </div>
            <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="button" onClick={handleSaveClick} disabled={!preview}>Salvar Foto</Button>
            </div>
        </Modal>
    );
};


// Main page component
const ProfessorsPage: React.FC = () => {
  const { professors, academies, graduations, saveProfessor, deleteProfessor, loading } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Partial<Professor> | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [professorForPhoto, setProfessorForPhoto] = useState<Professor | null>(null);

  const professorDanData = useMemo(() => {
    const data = new Map<string, { dan: number }>();
    const blackBeltRank = graduations.find(g => g.name === 'Preta')?.rank || 5;

    professors.forEach(prof => {
        const profGraduation = graduations.find(g => g.id === prof.graduationId);
        if (!prof.blackBeltDate || !profGraduation || profGraduation.rank < blackBeltRank) {
            data.set(prof.id, { dan: 0 });
            return;
        }

        const blackBeltDate = new Date(prof.blackBeltDate);
        const today = new Date();
        const yearsAsBlackBelt = (today.getTime() - blackBeltDate.getTime()) / (1000 * 3600 * 24 * 365.25);

        let dan = 0;
        if (yearsAsBlackBelt >= 48) dan = 9;
        else if (yearsAsBlackBelt >= 38) dan = 8;
        else if (yearsAsBlackBelt >= 31) dan = 7;
        else if (yearsAsBlackBelt >= 24) dan = 6;
        else if (yearsAsBlackBelt >= 19) dan = 5;
        else if (yearsAsBlackBelt >= 14) dan = 4;
        else if (yearsAsBlackBelt >= 9) dan = 3;
        else if (yearsAsBlackBelt >= 6) dan = 2;
        else if (yearsAsBlackBelt >= 3) dan = 1;

        data.set(prof.id, { dan });
    });
    return data;
  }, [professors, graduations]);


  const handleOpenModal = (prof: Partial<Professor> | null = null) => {
    setSelectedProfessor(prof);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfessor(null);
  };

  const handleSave = async (profData: Omit<Professor, 'id'> & { id?: string }) => {
    await saveProfessor(profData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este professor?')) {
      await deleteProfessor(id);
    }
  };

  const handleOpenPhotoModal = (prof: Professor) => {
    setProfessorForPhoto(prof);
    setIsPhotoModalOpen(true);
  };

  const handleClosePhotoModal = () => {
      setIsPhotoModalOpen(false);
      setProfessorForPhoto(null);
  };
  
  const handleSavePhoto = async (profToUpdate: Professor, newImageUrl: string) => {
      const { id, name, fjjpe_registration, cpf, academyId, graduationId, blackBeltDate } = profToUpdate;
      await saveProfessor({
          id, name, fjjpe_registration, cpf, academyId, graduationId, blackBeltDate,
          imageUrl: newImageUrl
      });
      handleClosePhotoModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Gerenciar Professores</h1>
        <Button onClick={() => handleOpenModal({})}>Adicionar Professor</Button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Carregando professores...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {professors.map(prof => {
                const academy = academies.find(a => a.id === prof.academyId);
                const graduation = graduations.find(g => g.id === prof.graduationId);
                const { dan } = professorDanData.get(prof.id) || { dan: 0 };
                
                return (
                    <Card key={prof.id} className="p-0 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 w-full relative">
                         {/* Visual Badge for Instructor */}
                         {prof.isInstructor && graduation && (
                            <div className="absolute top-4 right-4 z-10">
                                <span 
                                    className="px-3 py-1 text-xs font-bold rounded-full shadow-md text-white border border-white"
                                    style={{ 
                                        backgroundColor: graduation.color,
                                        color: graduation.color.toLowerCase() === '#ffffff' ? '#000' : '#fff'
                                    }}
                                >
                                    INSTRUTOR
                                </span>
                            </div>
                        )}
                        <div className="h-2" style={{ backgroundColor: graduation?.color || '#e2e8f0' }}></div>
                        <div className="p-5 flex flex-col flex-grow">
                            <div className="flex items-center mb-4">
                                <button onClick={() => handleOpenPhotoModal(prof)} className="relative group flex-shrink-0">
                                    <img 
                                        src={prof.imageUrl || `https://ui-avatars.com/api/?name=${prof.name}`} 
                                        alt={prof.name} 
                                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 group-hover:opacity-75 transition-opacity shadow-sm"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                </button>
                                <div className="ml-4 overflow-hidden">
                                    <h2 className="text-xl font-bold text-slate-800 truncate">{prof.name}</h2>
                                    <p className="text-sm text-slate-500 truncate">{academy?.name || 'Sem Academia'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 text-sm flex-grow">
                                {graduation && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 font-medium">Graduação:</span>
                                        <div className="flex items-center">
                                            <span className="w-4 h-4 rounded-full mr-2 border border-slate-300 shadow-sm" style={{ backgroundColor: graduation.color }}></span>
                                            <span className="font-medium text-slate-700">{graduation.name}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Registro:</span>
                                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">{prof.fjjpe_registration || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">CPF:</span>
                                    <span className="text-slate-700">{prof.cpf}</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="pt-4 mt-4">
                                    <div 
                                        className="w-full h-8 rounded-md flex items-center justify-end shadow-inner relative overflow-hidden" 
                                        style={{ backgroundColor: graduation?.color || '#e2e8f0', border: '1px solid rgba(0,0,0,0.1)' }}
                                        title={`${graduation?.name}${dan > 0 ? ` - ${dan}º Dan` : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none"></div>
                                        {dan > 0 && (
                                            <div className="h-full w-auto min-w-[25%] bg-red-600 flex items-center justify-center space-x-1 p-1 z-10 border-l-2 border-black">
                                                {Array.from({ length: dan }).map((_, index) => (
                                                    <div key={index} className="h-5 w-1 bg-white shadow-sm"></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleOpenModal(prof)}>Editar</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(prof.id)}>Excluir</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedProfessor?.id ? 'Editar Professor' : 'Adicionar Professor'}>
        <ProfessorForm professor={selectedProfessor} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>

      {isPhotoModalOpen && professorForPhoto && (
          <PhotoUploadModal
              professor={professorForPhoto}
              onSave={handleSavePhoto}
              onClose={handleClosePhotoModal}
          />
      )}
    </div>
  );
};

export default ProfessorsPage;