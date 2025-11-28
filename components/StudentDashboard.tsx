import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Student, User, Graduation, ClassSchedule, ThemeSettings } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import StudentAttendanceChart from './charts/StudentAttendanceChart';
import { Award, Calendar, DollarSign, Medal, Upload, QrCode as IconPix, CreditCard, Loader, CheckCircle } from 'lucide-react';

// ... (previous helper functions: generateBRCode, PixPaymentModal, CreditCardModal, UploadProofModal, calculateTrainingTime, calculateAge, StatCard)

// New helper for consistent belt styling
const getBeltStyle = (belt: Graduation) => {
    if (!belt) return { backgroundColor: '#e2e8f0' };
    if (!belt.color2) return { backgroundColor: belt.color };
    
    const angle = belt.gradientAngle ?? 90;
    const h = (belt.gradientHardness ?? 0) / 100;
    const c1 = belt.color;
    const c2 = belt.color2;
    const c3 = belt.color3 || belt.color2;

    if (c3 !== c2) {
        const s1 = h * 33.33;
        const s2 = 50 - (h * 16.67);
        const s3 = 50 + (h * 16.67);
        const s4 = 100 - (h * 33.33);
        return { background: `linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%, ${c2} ${s3}%, ${c3} ${s4}%)` };
    }
    const s1 = h * 50;
    const s2 = 100 - (h * 50);
    return { background: `linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%)` };
};

// ... (StudentDashboardProps interface)

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
    student: studentProp, 
    user, 
    students, 
    graduations, 
    schedules, 
    themeSettings, 
    updateStudentPayment 
}) => {
    // ... (state and effects logic remains identical)
    const [paymentModalState, setPaymentModalState] = useState<'closed' | 'pix' | 'card' | 'upload'>('closed');
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const studentDataFromContext = useMemo(() => students.find(s => s.id === user?.studentId), [students, user]);
    const studentData = studentProp || studentDataFromContext;

    const graduation = useMemo(() => graduations.find(g => g.id === studentData?.beltId), [graduations, studentData]);
    const nextGraduation = useMemo(() => graduations.sort((a,b) => a.rank - b.rank).find(g => g.rank > (graduation?.rank ?? 0)), [graduations, graduation]);

    const { totalMonths: trainingMonths } = calculateTrainingTime(studentData?.firstGraduationDate);

    const timeToNextGrad = useMemo(() => {
        if (!studentData || !graduation || !nextGraduation) return "Parabéns!";

        const age = studentData.birthDate ? calculateAge(studentData.birthDate) : 20;
        
        // Kids' system logic
        if (age < 16 && graduation.type === 'kids' && nextGraduation.minAge) {
            if (age >= nextGraduation.minAge) {
                return "Já tem idade!";
            }
            return `Elegível aos ${nextGraduation.minAge} anos`;
        }
        
        // Adult system logic
        const timeNeeded = graduation.minTimeInMonths;
        if (timeNeeded === 0) return "N/A";
        const timeRemaining = Math.max(0, timeNeeded - (trainingMonths % timeNeeded));
        return `${timeRemaining} meses`;
    }, [graduation, nextGraduation, trainingMonths, studentData]);
    
    const studentSchedules = useMemo(() => {
      if (!studentData) return [];
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const upcoming = [];
      for(let i=0; i<7; i++){
        const targetDay = (dayOfWeek + i) % 7;
        const daySchedules = schedules.filter(s => {
          const scheduleDayMap: {[key: string]: number} = {'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6};
          return s.academyId === studentData.academyId && scheduleDayMap[s.dayOfWeek] === targetDay;
        });
        upcoming.push(...daySchedules.map(s => ({...s, dayOffset: i})));
      }
      return upcoming.slice(0, 5);
    }, [schedules, studentData]);

    const shouldShowPaymentButton = useMemo(() => {
        if (!studentData || studentData.paymentStatus !== 'unpaid') {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateDay = studentData.paymentDueDateDay;

        const dueDateThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDateDay);
        const isOverdue = today > dueDateThisMonth;
        
        let upcomingDueDate = new Date(today.getFullYear(), today.getMonth(), dueDateDay);
        if (today.getDate() > dueDateDay) {
            upcomingDueDate.setMonth(upcomingDueDate.getMonth() + 1);
        }
        
        const timeDiff = upcomingDueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const isReminderPeriod = daysUntilDue <= 5;

        return isOverdue || isReminderPeriod;
    }, [studentData]);


    const handleConfirmPayment = async () => {
        if (!studentData) return;
        await updateStudentPayment(studentData.id, 'paid');
        setPaymentSuccess(true);
        setTimeout(() => {
            setPaymentSuccess(false);
        }, 3000);
    };


    if (!studentData || !graduation) {
        return <div className="text-center p-8 text-slate-500">Carregando dados do aluno...</div>;
    }

    const stripes = studentData.stripes;

    return (
        <div className="space-y-6">
            {paymentModalState === 'pix' && (
                <PixPaymentModal 
                    student={studentData}
                    themeSettings={themeSettings}
                    onClose={() => setPaymentModalState('closed')}
                    onProceedToUpload={() => setPaymentModalState('upload')}
                />
            )}
            {paymentModalState === 'card' && (
                <CreditCardModal 
                    student={studentData}
                    amount={themeSettings.monthlyFeeAmount}
                    onClose={() => setPaymentModalState('closed')}
                    onConfirm={handleConfirmPayment}
                />
            )}
            {paymentModalState === 'upload' && (
                 <UploadProofModal 
                    onClose={() => setPaymentModalState('closed')}
                    onConfirm={handleConfirmPayment}
                />
            )}

            {!studentProp && (
              <div>
                  <h1 className="text-3xl font-bold text-slate-800">Olá, {studentData.name.split(' ')[0]}!</h1>
                  <p className="text-slate-500 mt-1">Aqui está um resumo do seu progresso no Jiu-Jitsu.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Medal/>} title="Graduação Atual" color="#8B5CF6" value={graduation.name} />
                <Card className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg mr-4`} style={{ backgroundColor: `${studentData.paymentStatus === 'paid' ? '#10B981' : '#EF4444'}1A`}}>
                                <div style={{ color: studentData.paymentStatus === 'paid' ? '#10B981' : '#EF4444' }}><DollarSign/></div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Mensalidade</p>
                                {paymentSuccess ? (
                                    <p className="text-xl font-bold text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Pago</p>
                                ) : (
                                    <p className="text-xl font-bold text-slate-800">{studentData.paymentStatus === 'paid' ? 'Em Dia' : 'Pendente'}</p>
                                )}
                            </div>
                        </div>
                        {shouldShowPaymentButton && !studentProp && !paymentSuccess && (
                             <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={() => setPaymentModalState('pix')}>
                                    <IconPix className="w-4 h-4 mr-2" />
                                    PIX
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => setPaymentModalState('card')}>
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Cartão
                                </Button>
                             </div>
                        )}
                    </div>
                </Card>
                <StatCard icon={<Calendar/>} title="Tempo de Treino" color="#3B82F6" value={`${Math.floor(trainingMonths/12)}a ${trainingMonths%12}m`} />
                <StatCard icon={<Award/>} title="Próxima Graduação" color="#F59E0B" value={timeToNextGrad} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Sua Progressão</h3>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700">{graduation.name}</span>
                                <span className="font-bold text-slate-700">{nextGraduation?.name || 'Faixa Preta'}</span>
                            </div>
                             <div 
                                className="w-full h-8 rounded-md flex items-center justify-end shadow-inner relative overflow-hidden" 
                                style={{
                                    ...getBeltStyle(graduation),
                                    border: '1px solid rgba(0,0,0,0.1)' 
                                }}
                             >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/5 pointer-events-none"></div>
                                <div className="h-full w-1/4 bg-black flex items-center justify-center space-x-1 p-1 z-10 shadow-xl">
                                    {Array.from({ length: stripes }).map((_, index) => (
                                        <div key={index} className="h-5 w-1 bg-white shadow-sm"></div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 text-center">Você tem {stripes} grau(s) na sua faixa {graduation.name}.</p>
                        </div>

                         <div className="mt-6">
                            <h4 className="font-semibold text-amber-600">Dicas do Mestre</h4>
                            <ul className="list-disc list-inside mt-2 text-slate-600 space-y-1 text-sm">
                                <li>Concentre-se em refinar sua guarda-aranha.</li>
                                <li>Aumente sua participação nos treinos de sexta-feira.</li>
                                <li>Estude as defesas de chave de pé reta.</li>
                            </ul>
                         </div>
                    </Card>
                </div>
                <div>
                   <StudentAttendanceChart studentId={studentData.id} />
                </div>
            </div>

             <Card>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Próximas Aulas</h3>
                {studentSchedules.length > 0 ? (
                    <div className="space-y-3">
                    {studentSchedules.map((schedule, i) => {
                        const classDate = new Date();
                        classDate.setDate(classDate.getDate() + schedule.dayOffset);
                        return (
                            <div key={`${schedule.id}-${i}`} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-center w-14 mr-4 bg-white p-1 rounded shadow-sm">
                                    <p className="font-bold text-amber-600 uppercase text-xs">{classDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</p>
                                    <p className="text-lg font-bold text-slate-700 leading-none">{classDate.getDate()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{schedule.className}</p>
                                    <p className="text-xs text-slate-500">{schedule.startTime} - {schedule.endTime}</p>
                                </div>
                            </div>
                        )
                    })}
                    </div>
                ): (
                    <p className="text-slate-500 text-center text-sm py-4">Nenhuma aula encontrada esta semana.</p>
                )}
            </Card>
        </div>
    );
};