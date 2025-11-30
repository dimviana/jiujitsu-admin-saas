import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import { PhotoUploadModal } from './ui/PhotoUploadModal';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { Edit } from 'lucide-react';
import { Student, Graduation } from '../types';

const calculateTrainingTime = (startDateString?: string): string => {
    if (!startDateString) return "N/A";
    const startDate = new Date(startDateString);
    const now = new Date();
    
    let years = now.getFullYear() - startDate.getFullYear();
    let months = now.getMonth() - startDate.getMonth();
    let days = now.getDate() - startDate.getDate();

    if (days < 0) {
        months--;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years} anos, ${months} meses e ${days} dias`;
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

// Simplified Edit Form for Students
const StudentEditForm: React.FC<{ student: Student; onSave: (data: Partial<Student>) => void; onClose: () => void }> = ({ student, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        address: student.address || '',
        password: '', // Only update if typed
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        const updateData: Partial<Student> = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
        };

        if (formData.password) {
            updateData.password = formData.password;
        }

        onSave(updateData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
            
            <Input label="Nome Completo" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} required />
            <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} required />
            
            <hr className="my-2 border-slate-100" />
            <p className="text-xs text-slate-500">Preencha abaixo apenas se desejar alterar sua senha.</p>
            <Input label="Nova Senha" name="password" type="password" value={formData.password} onChange={handleChange} />
            <Input label="Confirmar Nova Senha" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </div>
        </form>
    );
};

const ProfilePage: React.FC = () => {
    const { user, students, academies, graduations, loading, saveStudent, themeSettings } = useContext(AppContext);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (loading) {
        return <div className="text-center text-slate-800">Carregando perfil...</div>;
    }

    const studentData = students.find(s => s.id === user?.studentId);
    if (!studentData) {
        return <div className="text-center text-red-500">Perfil de aluno não encontrado.</div>;
    }

    const academy = academies.find(a => a.id === studentData.academyId);
    const graduation = graduations.find(g => g.id === studentData.beltId);
    const trainingTime = calculateTrainingTime(studentData.firstGraduationDate);

    const handleSavePhoto = async (base64Image: string) => {
        await saveStudent({
            ...studentData,
            imageUrl: base64Image
        });
        setIsPhotoModalOpen(false);
    };

    const handleUpdateProfile = async (updatedFields: Partial<Student>) => {
        await saveStudent({
            ...studentData,
            ...updatedFields
        });
        setIsEditModalOpen(false);
    };

    // Determine financial status badge style and text
    let statusText = 'Inadimplente';
    let statusClass = 'bg-red-100 text-red-800';

    if (studentData.isSocialProject) {
        statusText = 'Projeto Social';
        statusClass = 'bg-blue-100 text-blue-800';
    } else if (studentData.paymentStatus === 'scholarship') {
        statusText = 'Isento (Bolsa)';
        statusClass = 'bg-purple-100 text-purple-800';
    } else if (studentData.paymentStatus === 'paid') {
        statusText = 'Em Dia';
        statusClass = 'bg-green-100 text-green-800';
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Meu Perfil</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <div className="flex flex-col items-center text-center">
                        <button 
                            onClick={() => setIsPhotoModalOpen(true)}
                            className="relative group mb-4 rounded-full overflow-hidden border-2 border-amber-500 w-32 h-32 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                            title="Alterar foto de perfil"
                        >
                            <img 
                                className="w-full h-full object-cover" 
                                src={studentData.imageUrl || `https://ui-avatars.com/api/?name=${studentData.name}`} 
                                alt="User" 
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                                <span className="text-white opacity-0 group-hover:opacity-100 font-medium text-sm">Alterar</span>
                            </div>
                        </button>
                        
                        <h2 className="text-2xl font-bold text-slate-800">{studentData.name}</h2>
                        <p className="text-slate-500">{academy?.name}</p>
                        <div className="mt-4 flex items-center bg-slate-100 px-3 py-1 rounded-full">
                            {graduation && (
                                <span 
                                    className="w-5 h-5 rounded-full mr-2 border border-slate-300" 
                                    style={getBeltStyle(graduation)}
                                ></span>
                            )}
                            <span className="font-semibold text-slate-700">{graduation?.name}</span>
                        </div>
                    </div>
                </Card>
                <Card className="lg:col-span-2 relative">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-amber-600">Informações</h3>
                        {themeSettings.studentProfileEditEnabled && (
                            <Button size="sm" variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar Dados
                            </Button>
                        )}
                    </div>
                    
                    <div className="space-y-3 text-slate-700">
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Data de Nascimento:</strong> {studentData.birthDate ? new Date(studentData.birthDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>CPF:</strong> {studentData.cpf}</p>
                        <p><strong>Telefone:</strong> {studentData.phone}</p>
                        <p><strong>Endereço:</strong> {studentData.address}</p>
                        <hr className="my-3 border-slate-100" />
                        <p><strong>Tempo de Treino:</strong> {trainingTime}</p>
                        <p><strong>Vencimento da Mensalidade:</strong> Dia {studentData.paymentDueDateDay} de cada mês</p>
                         <p><strong>Status Financeiro:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                {statusText}
                            </span>
                        </p>
                    </div>
                </Card>
            </div>

            {isPhotoModalOpen && (
                <PhotoUploadModal
                    isOpen={isPhotoModalOpen}
                    onClose={() => setIsPhotoModalOpen(false)}
                    onSave={handleSavePhoto}
                    currentImage={studentData.imageUrl}
                    title="Atualizar Foto de Perfil"
                />
            )}

            {isEditModalOpen && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Meus Dados">
                    <StudentEditForm student={studentData} onSave={handleUpdateProfile} onClose={() => setIsEditModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default ProfilePage;