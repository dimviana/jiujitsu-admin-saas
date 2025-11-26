import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import { PhotoUploadModal } from './ui/PhotoUploadModal'; // FIX: Changed from alias to relative path
import { Student } from '../types';

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


const ProfilePage: React.FC = () => {
    const { user, students, academies, graduations, loading, saveStudent } = useContext(AppContext);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

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
        // When saving from profile page, we update the student immediately
        await saveStudent({
            ...studentData,
            imageUrl: base64Image
        });
        setIsPhotoModalOpen(false);
    };

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
                            {graduation && <span className="w-5 h-5 rounded-full mr-2 border border-slate-300" style={{ backgroundColor: graduation.color }}></span>}
                            <span className="font-semibold text-slate-700">{graduation?.name}</span>
                        </div>
                    </div>
                </Card>
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-amber-600 mb-4">Informações</h3>
                    <div className="space-y-3 text-slate-700">
                        <p><strong>Email:</strong> {user?.email}</p>
                        <p><strong>Data de Nascimento:</strong> {studentData.birthDate ? new Date(studentData.birthDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>CPF:</strong> {studentData.cpf}</p>
                        <p><strong>Telefone:</strong> {studentData.phone}</p>
                        <p><strong>Endereço:</strong> {studentData.address}</p>
                        <p><strong>Tempo de Treino:</strong> {trainingTime}</p>
                        <p><strong>Vencimento da Mensalidade:</strong> Dia {studentData.paymentDueDateDay} de cada mês</p>
                         <p><strong>Status Financeiro:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${studentData.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {studentData.paymentStatus === 'paid' ? 'Em Dia' : 'Inadimplente'}
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
        </div>
    );
};

export default ProfilePage;