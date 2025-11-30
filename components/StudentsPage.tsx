
import React, { useState, useContext, FormEvent, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Student, Graduation } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { StudentDashboard } from './StudentDashboard';
import { Award as IconAward, FileText, Baby, Briefcase, Paperclip, MessageCircle, HeartHandshake, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { PhotoUploadModal } from './ui/PhotoUploadModal';
import { generateCertificate } from '../services/certificateService';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { DocumentModal } from './ui/DocumentModal';

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

const getBeltStyle = (grad: Graduation) => {
    if (!grad.color2) return { background: grad.color };

    const angle = grad.gradientAngle ?? 90;
    const hardness = (grad.gradientHardness ?? 0) / 100;
    const color3 = grad.color3 || grad.color2;

    const c1End = 33.33 * hardness;
    const c2Start = 50 - (16.67 * hardness);
    const c2End = 50 + (16.67 * hardness);
    const c3Start = 100 - (33.33 * hardness);

    return {
        background: `linear-gradient(${angle}deg,
            ${grad.color} 0%,
            ${grad.color} ${c1End}%,
            ${grad.color2} ${c2Start}%,
            ${grad.color2} ${c2End}%,
            ${color3} ${c3Start}%,
            ${color3} 100%
        )`
    };
};

const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }
    return age;
};

interface StudentFormProps {
    student: Partial<Student> | null;
    onSave: (student: Omit<Student, 'id' | 'paymentStatus' | 'lastSeen' | 'paymentHistory'> & { id?: string }) => void;
    onClose: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSave, onClose }) => {
    const { academies, graduations, user } = useContext(AppContext);
    const [preview, setPreview] = useState<string | null>(student?.imageUrl || null);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        cpf: '',
        fjjpe_registration: '',
        phone: '',
        address: '',
        beltId: '',
        academyId: user?.role === 'academy_admin' ? user.academyId || '' : (student?.academyId || ''),
        paymentDueDateDay: 10,
        stripes: 0,
        isCompetitor: false,
        responsibleName: '',
        responsiblePhone: '',
        isSocialProject: false,
        socialProjectName: '',
        ...student,
        // Ensure dates are correctly formatted for input fields
        birthDate: formatDateForInput(student?.birthDate),
        firstGraduationDate: formatDateForInput(student?.firstGraduationDate),
        lastPromotionDate: formatDateForInput(student?.lastPromotionDate),
        lastCompetition: student?.lastCompetition || '',
        medals: student?.medals || { gold: 0, silver: 0, bronze: 0 },
    });
    const [cpfError, setCpfError] = useState('');
    
    // Calculate Age dynamically
    const currentAge = useMemo(() => {
        return calculateAge(formData.birthDate);
    }, [formData.birthDate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const { checked } = e.target as HTMLInputElement;

        if (name === 'cpf') {
            if (value && !validateCPF(value)) {
                setCpfError('CPF inválido');
            } else {
                setCpfError('');
            }
        }
        
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name.startsWith('medals-')) {
            const medalType = name.split('-')[1] as keyof NonNullable<Student['medals']>;
             setFormData(prev => ({
                ...prev,
                medals: {
                    ...(prev.medals || { gold: 0, silver: 0, bronze: 0 }),
                    [medalType]: parseInt(value) || 0
                }
             }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (formData.cpf && !validateCPF(formData.cpf)) {
            setCpfError('Por favor, insira um CPF válido.');
            return;
        }
        
        // FIX: Remove properties that are not columns in the students table or should not be overwritten this way
        const { paymentHistory, paymentStatus, lastSeen, documents, ...safeData } = formData as any;

        // Clear responsible data if age >= 16 to keep DB clean
        if (currentAge >= 16) {
            safeData.responsibleName = null;
            safeData.responsiblePhone = null;
        }

        // Logic for Social Project
        if (safeData.isSocialProject) {
            safeData.paymentStatus = 'scholarship'; // Force scholarship/exempt status
        } else {
            safeData.socialProjectName = null; // Clear name if unchecked
        }

        // Include the preview image in the saved data
        onSave({ ...safeData, imageUrl: preview || undefined } as any);
    };

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 mb-2">
                    {preview ? (
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">Sem Foto</div>
                    )}
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsPhotoModalOpen(true)}>
                    {preview ? 'Alterar Foto' : 'Adicionar Foto'}
                </Button>
            </div>

            <Input label="Nome" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <Input 
                label="Senha" 
                name="password" 
                type="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder={student?.id ? 'Deixe em branco para manter a atual' : ''}
                required={!student?.id} 
            />
            <Input label="Registro FJJPE" name="fjjpe_registration" value={formData.fjjpe_registration} onChange={handleChange} required />
            <Input label="Data de Nascimento" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required />
            
            {/* Conditional Responsible Fields */}
            {currentAge < 16 && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-4 animate-fade-in-down">
                    <h4 className="text-sm font-bold text-amber-800 flex items-center">
                        <Baby className="w-4 h-4 mr-2" />
                        Dados do Responsável (Menor de 16 anos)
                    </h4>
                    <Input label="Nome do Responsável" name="responsibleName" value={formData.responsibleName} onChange={handleChange} required={currentAge < 16} />
                    <Input label="Telefone do Responsável" name="responsiblePhone" value={formData.responsiblePhone} onChange={handleChange} required={currentAge < 16} />
                </div>
            )}

            {/* Social Project Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                <div className="flex items-center gap-2">
                    <input 
                        id="isSocialProject" 
                        name="isSocialProject" 
                        type="checkbox" 
                        checked={!!formData.isSocialProject} 
                        onChange={handleChange} 
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="isSocialProject" className="text-sm font-bold text-blue-800 flex items-center">
                        <HeartHandshake className="w-4 h-4 mr-2" />
                        Participante de Projeto Social?
                    </label>
                </div>
                
                {formData.isSocialProject && (
                    <div className="animate-fade-in-down">
                        <Input 
                            label="Nome do Projeto Social" 
                            name="socialProjectName" 
                            value={formData.socialProjectName} 
                            onChange={handleChange} 
                            required={formData.isSocialProject} 
                            placeholder="Digite o nome do projeto"
                        />
                        <p className="text-xs text-blue-600 mt-2">
                            * Alunos de projeto social são automaticamente isentos de mensalidade.
                        </p>
                    </div>
                )}
            </div>

            <div>
              <Input label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} required />
              {cpfError && <p className="text-sm text-red-500 mt-1">{cpfError}</p>}
            </div>
            <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} required />
            <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} required />
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Graduação (Faixa)</label>
                <select name="beltId" value={formData.beltId} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500">
                    <option value="">Selecione a Graduação</option>
                    {graduations.sort((a,b) => a.rank - b.rank).map(grad => <option key={grad.id} value={grad.id}>{grad.name}</option>)}
                </select>
            </div>
             {user?.role === 'general_admin' && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Academia</label>
                    <select name="academyId" value={formData.academyId} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500">
                        <option value="">Selecione a Academia</option>
                        {academies.map(ac => <option key={ac.id} value={ac.id}>{ac.name}</option>)}
                    </select>
                </div>
             )}
            <Input label="Data da Primeira Graduação" name="firstGraduationDate" type="date" value={formData.firstGraduationDate} onChange={handleChange} required />
            <Input label="Data da Última Promoção" name="lastPromotionDate" type="date" value={formData.lastPromotionDate} onChange={handleChange} />
            <Input label="Dia do Vencimento da Mensalidade" name="paymentDueDateDay" type="number" min="1" max="31" value={formData.paymentDueDateDay} onChange={handleChange} required />
            <Input label="Graus na Faixa" name="stripes" type="number" min="0" max="9" value={formData.stripes} onChange={handleChange} />
            
            <div className="flex items-center gap-2 pt-2">
              <input 
                id="isCompetitor" 
                name="isCompetitor" 
                type="checkbox" 
                checked={!!formData.isCompetitor} 
                onChange={handleChange} 
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" 
              />
              <label htmlFor="isCompetitor" className="text-sm font-medium text-slate-700">É competidor?</label>
            </div>
            
            {formData.isCompetitor && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-fade-in-down">
                    <Input label="Última Competição" name="lastCompetition" value={formData.lastCompetition} onChange={handleChange} />
                    <fieldset className="border-t border-slate-200 pt-3">
                        <legend className="text-sm font-medium text-slate-700 mb-2">Quadro de Medalhas</legend>
                        <div className="grid grid-cols-3 gap-4">
                             <Input label="Ouro" name="medals-gold" type="number" min="0" value={formData.medals?.gold || 0} onChange={handleChange} />
                             <Input label="Prata" name="medals-silver" type="number" min="0" value={formData.medals?.silver || 0} onChange={handleChange} />
                             <Input label="Bronze" name="medals-bronze" type="number" min="0" value={formData.medals?.bronze || 0} onChange={handleChange} />
                        </div>
                    </fieldset>
                </div>
            )}


            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={!!cpfError}>Salvar</Button>
            </div>
        </form>
        
        {/* Image Upload Modal specifically for the Form context */}
        {isPhotoModalOpen && (
            <PhotoUploadModal
                isOpen={isPhotoModalOpen}
                onClose={() => setIsPhotoModalOpen(false)}
                onSave={(img) => { 
                    setPreview(img); 
                    setIsPhotoModalOpen(false);
                }}
                currentImage={preview || undefined}
                title="Selecionar Foto do Aluno"
            />
        )}
        </>
    );
};

const StudentsPage: React.FC = () => {
    const { 
        students, 
        academies, 
        saveStudent, 
        deleteStudent, 
        loading, 
        graduations, 
        attendanceRecords, 
        updateStudentStatus, 
        promoteStudentToInstructor,
        schedules, 
        themeSettings, 
        updateStudentPayment 
    } = useContext(AppContext);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Partial<Student> | null>(null);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [studentForPhoto, setStudentForPhoto] = useState<Student | null>(null);
    const [dashboardStudent, setDashboardStudent] = useState<Student | null>(null);
    const [activeTab, setActiveTab] = useState<'adults' | 'kids' | 'social_project' | 'approvals'>('adults');
    
    // Filtering and Pagination State
    const [beltFilter, setBeltFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Confirmation Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    // Instructor Promotion Modal States
    const [isInstructorPromoteModalOpen, setIsInstructorPromoteModalOpen] = useState(false);
    const [studentToPromoteInstructor, setStudentToPromoteInstructor] = useState<Student | null>(null);

    // Document Modal State
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
    const [studentForDocuments, setStudentForDocuments] = useState<Student | null>(null);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [beltFilter, activeTab]);

    const eligibilityData = useMemo(() => {
        const data = new Map<string, { eligible: boolean; nextBelt: Graduation | null; reason: string }>();
        if (!students.length || !graduations.length) return data;
        
        const sortedGraduations = [...graduations].sort((a, b) => a.rank - b.rank);

        for (const student of students) {
            const currentBelt = sortedGraduations.find(g => g.id === student.beltId);
            if (!currentBelt) {
                data.set(student.id, { eligible: false, nextBelt: null, reason: "Faixa atual não encontrada." });
                continue;
            }

            const nextBelt = sortedGraduations.find(g => g.rank > currentBelt.rank);
            if (!nextBelt) {
                data.set(student.id, { eligible: false, nextBelt: null, reason: "Graduação máxima atingida." });
                continue;
            }

            const promotionDate = student.lastPromotionDate || student.firstGraduationDate;
            if (!promotionDate) {
                 data.set(student.id, { eligible: false, nextBelt, reason: "Data de promoção não encontrada." });
                continue;
            }

            const promotionDateObj = new Date(promotionDate);
            const now = new Date();
            const monthsSincePromotion = (now.getFullYear() - promotionDateObj.getFullYear()) * 12 + (now.getMonth() - promotionDateObj.getMonth());
            
            const age = calculateAge(student.birthDate || '');

            // Kids' belt logic
            if (currentBelt.type === 'kids') {
                const adultBlueBelt = sortedGraduations.find(g => g.name === 'Azul' && g.type === 'adult');
                if (currentBelt.name === 'Verde' && age >= 16 && adultBlueBelt) {
                    data.set(student.id, { eligible: true, nextBelt: adultBlueBelt, reason: `Atingiu 16 anos na faixa verde.` });
                    continue;
                }
                
                if (nextBelt.type === 'kids' && nextBelt.minAge && age >= nextBelt.minAge) {
                    data.set(student.id, { eligible: true, nextBelt, reason: `Atingiu a idade mínima de ${nextBelt.minAge} anos.` });
                    continue;
                }
                data.set(student.id, { eligible: false, nextBelt, reason: `Idade insuficiente (${age} anos).` });
                continue; // End kids logic
            }
            
            // Adult belt logic
            if (currentBelt.type === 'adult') {
                const relevantRecords = attendanceRecords.filter(r => r.studentId === student.id && new Date(r.date) >= new Date(promotionDate));
                const presentCount = relevantRecords.filter(r => r.status === 'present').length;
                const totalRecords = relevantRecords.length;
                const frequency = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
                
                if (frequency <= 70) {
                    data.set(student.id, { eligible: false, nextBelt, reason: `Requer >70% de frequência (atualmente ${Math.round(frequency)}%).` });
                    continue;
                }

                // Black Belt to Coral
                if (currentBelt.name === 'Preta') {
                    if (student.stripes < 6) {
                        data.set(student.id, { eligible: false, nextBelt, reason: `Requer 6 graus na faixa preta (atualmente ${student.stripes}).` });
                        continue;
                    }
                    if (monthsSincePromotion >= 84) { // 7 years
                        data.set(student.id, { eligible: true, nextBelt, reason: `Cumpriu 7 anos como 6º grau.` });
                        continue;
                    }
                    data.set(student.id, { eligible: false, nextBelt, reason: `Requer 7 anos (84 meses) como 6º grau (atualmente ${monthsSincePromotion} meses).` });
                    continue;
                }

                // Coral Belt to Red
                if (currentBelt.name === 'Coral') {
                     if (student.stripes < 8) {
                        data.set(student.id, { eligible: false, nextBelt, reason: `Requer 8 graus na faixa coral (atualmente ${student.stripes}).` });
                        continue;
                    }
                     if (monthsSincePromotion >= 120) { // 10 years
                        data.set(student.id, { eligible: true, nextBelt, reason: `Cumpriu 10 anos como 8º grau.` });
                        continue;
                    }
                    data.set(student.id, { eligible: false, nextBelt, reason: `Requer 10 anos (120 meses) como 8º grau (atualmente ${monthsSincePromotion} meses).` });
                    continue;
                }

                // Standard adult belts (White, Blue, Purple, Brown)
                if (student.stripes < 4) {
                    data.set(student.id, { eligible: false, nextBelt, reason: `Requer 4 graus (atualmente ${student.stripes}).` });
                    continue;
                }

                if (monthsSincePromotion >= currentBelt.minTimeInMonths) {
                    data.set(student.id, { eligible: true, nextBelt, reason: `Cumpriu o tempo mínimo na faixa.` });
                    continue;
                }
                data.set(student.id, { eligible: false, nextBelt, reason: `Requer ${currentBelt.minTimeInMonths} meses na faixa (atualmente ${monthsSincePromotion} meses).` });
                continue;
            }
        }
        return data;
    }, [students, graduations, attendanceRecords]);

    const filteredStudents = useMemo(() => {
        // Base Filter: Tab (Adult/Kid/etc)
        let baseList = [];
        if (activeTab === 'approvals') {
            baseList = students.filter(student => student.status === 'pending');
        } else {
            const activeStudents = students.filter(s => s.status !== 'pending');
            if (activeTab === 'social_project') {
                baseList = activeStudents.filter(s => s.isSocialProject);
            } else if (activeTab === 'adults') {
                baseList = activeStudents.filter(s => !s.isSocialProject && calculateAge(s.birthDate || '') >= 16);
            } else {
                // Kids
                baseList = activeStudents.filter(s => !s.isSocialProject && calculateAge(s.birthDate || '') < 16);
            }
        }

        // Apply Belt Filter
        if (beltFilter !== 'all') {
            return baseList.filter(s => s.beltId === beltFilter);
        }

        return baseList;
    }, [students, activeTab, beltFilter]);

    // Pagination Logic
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStudents, currentPage]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    const handlePromoteStudent = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        const eligibility = eligibilityData.get(studentId);
        
        if (!student || !eligibility || !eligibility.eligible || !eligibility.nextBelt) {
            alert('Este aluno não está elegível para promoção.');
            return;
        }

        if (window.confirm(`Promover ${student.name} para a faixa ${eligibility.nextBelt.name}?`)) {
            // Destructure to remove fields that should not be passed to saveStudent and to keep the existing password
            const { paymentStatus, lastSeen, paymentHistory, password, documents, ...studentToSave } = student;
            
            const promotedStudentData = {
                ...studentToSave,
                beltId: eligibility.nextBelt.id,
                stripes: 0, // Always reset stripes to 0 upon promotion
                lastPromotionDate: new Date().toISOString().split('T')[0],
            };
            await saveStudent(promotedStudentData);
        }
    };

    const handleGenerateCertificate = (student: Student) => {
        const graduation = graduations.find(g => g.id === student.beltId);
        const academy = academies.find(a => a.id === student.academyId);
        
        if (!graduation || !academy) {
            alert("Dados de graduação ou academia não encontrados.");
            return;
        }
        
        generateCertificate(student, graduation, academy);
    };

    const handleOpenModal = (student: Partial<Student> | null = null) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
    };

    const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'paymentStatus' | 'lastSeen' | 'paymentHistory'> & { id?: string }) => {
        await saveStudent(studentData);
        handleCloseModal();
    };
    
    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (studentToDelete) {
            await deleteStudent(studentToDelete.id);
            setStudentToDelete(null);
        }
    };

    const handleOpenPhotoModal = (student: Student) => {
        setStudentForPhoto(student);
        setIsPhotoModalOpen(true);
    };

    const handleClosePhotoModal = () => {
        setIsPhotoModalOpen(false);
        setStudentForPhoto(null);
    };
    
    const handleSavePhoto = async (img: string) => {
        if (studentForPhoto) {
            const { id, name, email, birthDate, cpf, fjjpe_registration, phone, address, beltId, academyId, firstGraduationDate, paymentDueDateDay, stripes, lastPromotionDate, isCompetitor, lastCompetition, medals } = studentForPhoto;
            await saveStudent({
                id, name, email, birthDate, cpf, fjjpe_registration, phone, address, beltId, academyId, firstGraduationDate, paymentDueDateDay, stripes, lastPromotionDate, isCompetitor, lastCompetition, medals,
                imageUrl: img
            });
            handleClosePhotoModal();
        }
    };

    const handleInstructorPromotionClick = (student: Student) => {
        setStudentToPromoteInstructor(student);
        setIsInstructorPromoteModalOpen(true);
    }

    const handleConfirmInstructorPromotion = async () => {
        if (studentToPromoteInstructor) {
            await promoteStudentToInstructor(studentToPromoteInstructor.id);
            setStudentToPromoteInstructor(null);
        }
    }

    const handleApproveStudent = async (id: string) => {
        if(window.confirm('Aprovar cadastro do aluno?')) {
            await updateStudentStatus(id, 'active');
        }
    };

    const handleRejectStudent = async (id: string) => {
        if(window.confirm('Rejeitar cadastro do aluno? O registro será excluído.')) {
            await deleteStudent(id);
        }
    };

    const handleOpenDocumentModal = (student: Student) => {
        setStudentForDocuments(student);
        setIsDocumentModalOpen(true);
    }

    const handleWhatsAppClick = (student: Student) => {
        const age = calculateAge(student.birthDate || '');
        const isMinor = age < 16;
        
        let targetPhone = student.phone;
        let targetName = student.name;
        
        // Se for menor de idade e tiver dados do responsável, usa eles
        if (isMinor && student.responsiblePhone && student.responsibleName) {
            targetPhone = student.responsiblePhone;
            targetName = student.responsibleName; // O nome da pessoa com quem vou falar
        }

        if (!targetPhone) {
            alert('Telefone não disponível.');
            return;
        }

        let message = themeSettings.whatsappMessageTemplate || "Olá {nome}, tudo bem?";
        
        // Substituir variáveis
        message = message.replace(/{nome}/g, targetName);
        message = message.replace(/{aluno}/g, student.name);

        const cleanPhone = targetPhone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        
        window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, '_blank');
    };

    const pendingCount = students.filter(s => s.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Alunos</h1>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Filter className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select 
                            value={beltFilter} 
                            onChange={(e) => setBeltFilter(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        >
                            <option value="all">Todas as Graduações</option>
                            {graduations.sort((a,b) => a.rank - b.rank).map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={() => handleOpenModal({})}>Adicionar Aluno</Button>
                </div>
            </div>

            <div className="border-b border-slate-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('adults')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'adults'
                                ? 'border-amber-500 text-amber-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Adultos
                    </button>
                    <button
                        onClick={() => setActiveTab('kids')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'kids'
                                ? 'border-amber-500 text-amber-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        Infantil/Infanto Juvenil
                    </button>
                    <button
                        onClick={() => setActiveTab('social_project')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                            activeTab === 'social_project'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <HeartHandshake className="w-4 h-4 mr-2" />
                        Projetos Sociais
                    </button>
                    {/* Kept Approval logic but separated from "Pendentes" visual concept which is now Social Project */}
                    {pendingCount > 0 && (
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                                activeTab === 'approvals'
                                    ? 'border-red-500 text-red-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            Aprovações Pendentes
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                                {pendingCount}
                            </span>
                        </button>
                    )}
                </nav>
            </div>
            
            {loading ? (
                <div className="text-center p-4">Carregando...</div>
            ) : (
                <>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedStudents.length > 0 ? paginatedStudents.map(student => {
                        const belt = graduations.find(g => g.id === student.beltId);
                        const academy = academies.find(a => a.id === student.academyId);
                        const stripes = student.stripes;
                        const eligibility = eligibilityData.get(student.id);

                        const blueBeltRank = graduations.find(g => g.name === 'Azul' && g.type === 'adult')?.rank || 999;
                        const isEligibleForInstructor = belt && belt.type === 'adult' && belt.rank >= blueBeltRank && !student.isInstructor;
                        
                        // Status Badge Logic
                        let statusBadge = null;
                        if (student.isSocialProject) {
                             statusBadge = <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Projeto Social</span>;
                        } else if (student.paymentStatus === 'paid') {
                            statusBadge = <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Em Dia</span>;
                        } else if (student.paymentStatus === 'scholarship') {
                            statusBadge = <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Bolsista</span>;
                        } else {
                            statusBadge = <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Pendente</span>;
                        }

                        return (
                            <Card key={student.id} className="p-0 flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 w-[328px]">
                                <div 
                                    className="h-2" 
                                    style={{ 
                                        background: belt?.color2 
                                            ? `linear-gradient(90deg, ${belt.color} 0%, ${belt.color2} 50%, ${belt.color3 || belt.color2} 100%)` 
                                            : belt?.color || '#e2e8f0' 
                                    }}
                                ></div>
                                <div className="p-5 flex flex-col flex-grow">
                                    <div className="flex items-center mb-4 relative">
                                        <button onClick={() => handleOpenPhotoModal(student)} className="relative group flex-shrink-0">
                                            <img 
                                                src={student.imageUrl || `https://i.pravatar.cc/150?u=${student.cpf}`} 
                                                alt={student.name} 
                                                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 group-hover:opacity-75 transition-opacity"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-opacity">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                        </button>
                                        <div className="ml-4">
                                            <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
                                            <p className="text-sm text-slate-500">{academy?.name || 'N/A'}</p>
                                        </div>
                                        {/* Document Icon Button */}
                                        <button 
                                            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                                            title="Documentos"
                                            onClick={() => handleOpenDocumentModal(student)}
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3 text-sm">
                                        {activeTab !== 'approvals' && (
                                            <>
                                                {student.isSocialProject ? (
                                                    <div className="flex justify-between items-center bg-blue-50 p-1.5 rounded text-blue-800 border border-blue-100">
                                                        <span className="font-semibold text-xs truncate max-w-[200px]" title={student.socialProjectName}>
                                                            <HeartHandshake className="w-3 h-3 inline mr-1"/>
                                                            {student.socialProjectName}
                                                        </span>
                                                        <span className="text-[10px] bg-white px-1.5 rounded border border-blue-200">Isento</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-600 font-medium">Pagamento:</span>
                                                        {statusBadge}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {belt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600 font-medium">Graduação:</span>
                                                <div className="flex items-center">
                                                    <span 
                                                        className="w-4 h-4 rounded-full mr-2 border border-slate-300" 
                                                        style={getBeltStyle(belt)} // Use the gradient function here
                                                    ></span>
                                                    <span className="font-medium text-slate-700">{belt.name}</span>
                                                    {/* Visual Indicator for Kids Belt */}
                                                    {belt.type === 'kids' && (
                                                        <span title="Graduação Infantil">
                                                            <Baby className="w-4 h-4 ml-1 text-pink-400" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600 font-medium">Idade:</span>
                                            <span className="font-medium text-slate-700">{calculateAge(student.birthDate || '')} anos</span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-slate-600 font-medium">CPF:</span>
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                {student.cpf ? student.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'N/A'}
                                            </span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-slate-600 font-medium">Telefone:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-700">{student.phone}</span>
                                                <button 
                                                    className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                                                    onClick={() => handleWhatsAppClick(student)}
                                                    title="Enviar mensagem no WhatsApp"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        {student.isInstructor && (
                                            <div className="mt-2 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 text-center font-bold">
                                                Instrutor
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        <div className="pt-4 mt-4">
                                            <div 
                                                className="w-full h-7 rounded-md flex items-center justify-end" 
                                                style={{ 
                                                    background: belt?.color2 
                                                        ? `linear-gradient(90deg, ${belt.color} 0%, ${belt.color2} 50%, ${belt.color3 || belt.color2} 100%)` 
                                                        : belt?.color || '#e2e8f0', 
                                                    border: '1px solid rgba(0,0,0,0.1)' 
                                                }}
                                                title={`${belt?.name} - ${stripes} grau(s)`}
                                            >
                                                <div className="h-full w-1/4 bg-black flex items-center justify-center space-x-1 p-1">
                                                    {Array.from({ length: stripes }).map((_, index) => (
                                                        <div key={index} className="h-5 w-1 bg-white"></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {student.isCompetitor && student.medals && (student.medals.gold > 0 || student.medals.silver > 0 || student.medals.bronze > 0) && (
                                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                                                <div className="flex justify-center items-center gap-6">
                                                    <div className="flex items-center" title={`${student.medals.gold} Ouro`}>
                                                        <IconAward className="w-6 h-6 text-yellow-500" />
                                                        <span className="ml-1.5 font-bold text-lg text-slate-700">{student.medals.gold}</span>
                                                    </div>
                                                    <div className="flex items-center" title={`${student.medals.silver} Prata`}>
                                                        <IconAward className="w-6 h-6 text-slate-400" />
                                                        <span className="ml-1.5 font-bold text-lg text-slate-700">{student.medals.silver}</span>
                                                    </div>
                                                    <div className="flex items-center" title={`${student.medals.bronze} Bronze`}>
                                                        <IconAward className="w-6 h-6 text-orange-400" />
                                                        <span className="ml-1.5 font-bold text-lg text-slate-700">{student.medals.bronze}</span>
                                                    </div>
                                                </div>
                                                {student.lastCompetition && <p className="text-xs text-slate-500 mt-2 text-center">Última competição: {student.lastCompetition}</p>}
                                            </div>
                                        )}

                                        {eligibility && eligibility.eligible && eligibility.nextBelt && activeTab !== 'approvals' && (
                                            <div className="mt-4 p-3 bg-green-100 rounded-lg text-center border border-green-200">
                                                <p className="font-bold text-green-800">Elegível para {eligibility.nextBelt.name}!</p>
                                                <p className="text-xs text-green-700">{eligibility.reason}</p>
                                                <Button size="sm" variant="success" className="w-full mt-2" onClick={() => handlePromoteStudent(student.id)}>
                                                    Promover Aluno
                                                </Button>
                                            </div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-wrap justify-end gap-2">
                                            {activeTab === 'approvals' ? (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => handleApproveStudent(student.id)}>Aprovar</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleRejectStudent(student.id)}>Rejeitar</Button>
                                                </>
                                            ) : (
                                                <>
                                                    {isEligibleForInstructor && (
                                                        <Button size="sm" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleInstructorPromotionClick(student)} title="Promover a Instrutor">
                                                            <Briefcase className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="secondary" onClick={() => setDashboardStudent(student)}>Dashboard</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => handleOpenModal(student)}>Editar</Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        onClick={() => handleGenerateCertificate(student)} 
                                                        title="Gerar Certificado"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteClick(student)}>Excluir</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    }) : (
                        <div className="col-span-full text-center py-10 text-slate-500">
                            <p>Nenhum aluno encontrado nesta categoria.</p>
                        </div>
                    )}
                </div>
                
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-8 space-x-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <span className="text-sm font-medium text-slate-600">
                            Página {currentPage} de {totalPages}
                        </span>

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
                </>
             )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedStudent?.id ? 'Editar Aluno' : 'Adicionar Aluno'}>
                <StudentForm student={selectedStudent} onSave={handleSaveStudent} onClose={handleCloseModal} />
            </Modal>
            
            {isPhotoModalOpen && studentForPhoto && (
                <PhotoUploadModal
                    isOpen={isPhotoModalOpen}
                    onClose={() => setIsPhotoModalOpen(false)}
                    onSave={handleSavePhoto}
                    currentImage={studentForPhoto.imageUrl}
                    title="Atualizar Foto de Perfil"
                />
            )}

            {dashboardStudent && (
                <Modal 
                    isOpen={!!dashboardStudent} 
                    onClose={() => setDashboardStudent(null)} 
                    title={`Dashboard de ${dashboardStudent.name}`}
                    size="4xl"
                >
                    <StudentDashboard 
                        student={dashboardStudent} 
                        students={students} 
                        graduations={graduations} 
                        schedules={schedules} 
                        themeSettings={themeSettings} 
                        updateStudentPayment={updateStudentPayment} 
                    />
                </Modal>
            )}

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Aluno"
                message={`Tem certeza que deseja excluir o aluno ${studentToDelete?.name}? Esta ação não pode ser desfeita.`}
                confirmText="Sim, excluir"
                cancelText="Não"
                variant="danger"
            />

            <ConfirmationModal
                isOpen={isInstructorPromoteModalOpen}
                onClose={() => setIsInstructorPromoteModalOpen(false)}
                onConfirm={handleConfirmInstructorPromotion}
                title="Promover a Instrutor"
                message={`Deseja promover ${studentToPromoteInstructor?.name} a Instrutor? Ele será adicionado à lista de professores.`}
                confirmText="Sim, promover"
                variant="success"
            />

            {studentForDocuments && (
                <DocumentModal
                    isOpen={isDocumentModalOpen}
                    onClose={() => setIsDocumentModalOpen(false)}
                    student={studentForDocuments}
                />
            )}
        </div>
    );
};

export default StudentsPage;
