
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Cake, Calendar, Gift } from 'lucide-react';
import { Student } from '../types';

const isSameDayMonth = (dateString: string | undefined, targetDate: Date) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    // Handle timezone offsets by appending T12:00:00 if it's a pure YYYY-MM-DD string to ensure correct day
    // Or simpler: strictly compare Month and Date parts
    return d.getUTCDate() === targetDate.getDate() && d.getUTCMonth() === targetDate.getMonth();
};

export const BirthdayNotifications: React.FC = () => {
    const { user, students } = useContext(AppContext);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [peerModalOpen, setPeerModalOpen] = useState(false);
    const [birthdayStudents, setBirthdayStudents] = useState<Student[]>([]);
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        if (!user) return;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filter active students in the user's academy
        const academyStudents = students.filter(s => 
            s.academyId === user.academyId && 
            s.status !== 'blocked' && 
            s.status !== 'pending'
        );

        if (user.role !== 'student') {
            // --- ADMIN LOGIC: Check for Birthdays Tomorrow ---
            const upcomingBirthdays = academyStudents.filter(s => 
                isSameDayMonth(s.birthDate, tomorrow)
            );

            if (upcomingBirthdays.length > 0) {
                setBirthdayStudents(upcomingBirthdays);
                setModalTitle(`Aniversariantes de Amanhã (${tomorrow.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})})`);
                setAdminModalOpen(true);
            }
        } else {
            // --- STUDENT LOGIC: Check for PEER Birthdays Today ---
            // Exclude self
            const peerBirthdays = academyStudents.filter(s => 
                s.id !== user.studentId && 
                isSameDayMonth(s.birthDate, today)
            );

            if (peerBirthdays.length > 0) {
                setBirthdayStudents(peerBirthdays);
                setModalTitle('Aniversariantes de Hoje! 🎉');
                setPeerModalOpen(true);
            }
        }
    }, [user, students]);

    const renderStudentList = () => (
        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {birthdayStudents.map(student => (
                <div key={student.id} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <img 
                        src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                        alt={student.name} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm mr-3"
                    />
                    <div>
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">
                            {user?.role !== 'student' ? 'Complete ano amanhã' : 'Está de parabéns hoje!'}
                        </p>
                    </div>
                    <Cake className="w-5 h-5 text-pink-500 ml-auto" />
                </div>
            ))}
        </div>
    );

    return (
        <>
            {/* Admin Modal (Tomorrow) */}
            {adminModalOpen && (
                <Modal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title={modalTitle}>
                    <div className="space-y-4">
                        <div className="bg-amber-50 p-4 rounded-lg flex items-start border border-amber-100">
                            <Calendar className="w-6 h-6 text-amber-500 mr-3 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                                Atenção! Os seguintes alunos completam ano amanhã. Que tal preparar uma mensagem ou um "parabéns" no treino?
                            </p>
                        </div>
                        {renderStudentList()}
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setAdminModalOpen(false)}>Entendido</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Peer Modal (Today) */}
            {peerModalOpen && (
                <Modal isOpen={peerModalOpen} onClose={() => setPeerModalOpen(false)} title={modalTitle}>
                    <div className="space-y-4 text-center">
                        <div className="flex justify-center mb-2">
                            <div className="p-3 bg-pink-100 rounded-full animate-bounce">
                                <Gift className="w-8 h-8 text-pink-600" />
                            </div>
                        </div>
                        <p className="text-slate-600">
                            Hoje é um dia especial no tatame! Dê os parabéns aos seus colegas de treino:
                        </p>
                        {renderStudentList()}
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setPeerModalOpen(false)} variant="secondary">Fechar</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
