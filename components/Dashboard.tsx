import React, { useState, useMemo, useContext } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Student, User, ClassSchedule, DayOfWeek, Graduation, ThemeSettings, AttendanceRecord } from '../types';
import { Users, Briefcase, BookOpen, Gift, Award, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { StudentDashboard } from './StudentDashboard';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { AppContext } from '../context/AppContext';

interface DashboardProps {
  user: User;
  students: Student[];
  users: User[];
  schedules: ClassSchedule[];
  graduations: Graduation[];
  themeSettings: ThemeSettings;
  updateStudentPayment: (id: string, status: 'paid' | 'unpaid') => Promise<void>;
  attendanceRecords: AttendanceRecord[];
}

const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

const dayNameToIndex: { [key in DayOfWeek]: number } = {
    'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3,
    'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
};

// ... (Rest of the sub-components remain the same)

const BirthdayCard: React.FC<{ students: Student[], users: User[] }> = ({ students, users }) => {
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const birthdayStudents = students.filter(s => s.birthDate && s.birthDate.endsWith(todayMonthDay));
    const birthdayUsers = users.filter(u => u.role !== 'student' && u.birthDate && u.birthDate.endsWith(todayMonthDay));

    const allBirthdays = [
        ...birthdayStudents.map(s => ({ name: s.name, type: 'Aluno' })),
        ...birthdayUsers.map(u => ({ name: u.name, type: 'Professor' }))
    ];

    if (allBirthdays.length === 0) return null;

    return (
        <Card>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                <Gift className="w-5 h-5 mr-2 text-primary" />
                Aniversariantes de Hoje
            </h3>
            <div className="space-y-3">
                {allBirthdays.map((person, index) => (
                    <div key={index} className="flex items-center p-2 bg-amber-50 rounded-md border border-amber-100">
                        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-amber-700 font-bold">{person.name.charAt(0)}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 truncate">{person.name}</p>
                            <p className="text-xs text-slate-500">{person.type}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    color: string;
    bgColor: string;
}
const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, bgColor }) => (
    <Card className={`flex items-center p-4`}>
        <div className={`p-3 rounded-lg ${bgColor}`}>
            <div style={{ color }}>{icon}</div>
        </div>
        <div className="ml-4">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </Card>
);

const StudentPerformanceTable: React.FC<{ students: Student[], onPayClick: (student: Student) => void }> = ({ students, onPayClick }) => {
    const overdueStudents = students.filter(s => s.paymentStatus === 'unpaid').slice(0, 4);
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Nome</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {overdueStudents.map(student => (
                        <tr key={student.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap flex items-center">
                                <img src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}&background=random`} alt={student.name} className="w-8 h-8 rounded-full mr-3 object-cover" />
                                {student.name}
                            </td>
                            <td className="px-6 py-4">
                                <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">Pendente</span>
                            </td>
                            <td className="px-6 py-4">
                                <Button size="sm" variant="secondary" onClick={() => onPayClick(student)}>
                                    Registrar Pagamento
                                </Button>
                            </td>
                        </tr>
                    ))}
                     {overdueStudents.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-center py-6 text-slate-400">
                                Nenhum aluno com pendências.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const CommunityCard: React.FC = () => (
    <Card className="bg-primary text-center text-white relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/20 rounded-full"></div>
        <div className="absolute -bottom-8 -left-2 w-24 h-24 border-4 border-white/20 rounded-full"></div>
        <h3 className="text-xl font-bold mb-2 relative z-10">Comunidade Jiu-Jitsu Hub</h3>
        <p className="text-white/80 text-sm mb-4 relative z-10">Conecte-se com outros praticantes e evolua seu jogo.</p>
        <Button variant="secondary" className="bg-white/90 text-primary hover:bg-white w-full relative z-10">Explorar Agora</Button>
    </Card>
);

interface CalendarWidgetProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  schedules: ClassSchedule[];
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onDateChange, schedules }) => {
    const scheduledDayIndices = useMemo(() => {
        const set = new Set<number>();
        schedules.forEach(s => {
             const idx = dayNameToIndex[s.dayOfWeek as DayOfWeek];
             if (idx !== undefined) set.add(idx);
        });
        return set;
    }, [schedules]);
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const calendarCells = useMemo(() => {
        const cells = [];
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(i);
        }
        return cells;
    }, [year, month]);
    
    const changeMonth = (offset: number) => {
        const dayOfMonth = selectedDate.getDate();
        const newDate = new Date(year, month + offset, 1);
        const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
        newDate.setDate(Math.min(dayOfMonth, daysInNewMonth));
        onDateChange(newDate);
    };
    
    const today = new Date();

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 capitalize">{selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex space-x-2">
                    <button onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-primary p-1 rounded-full hover:bg-slate-100 transition-colors">&lt;</button>
                    <button onClick={() => changeMonth(1)} className="text-slate-400 hover:text-primary p-1 rounded-full hover:bg-slate-100 transition-colors">&gt;</button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center text-sm text-slate-500">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`} className="py-2 font-semibold text-slate-400">{d}</div>)}
                {calendarCells.map((d, i) => {
                    if (d === null) return <div key={`empty-${i}`}></div>;
                    const dayDate = new Date(year, month, d);
                    const isToday = toYYYYMMDD(dayDate) === toYYYYMMDD(today);
                    const isSelected = toYYYYMMDD(dayDate) === toYYYYMMDD(selectedDate);
                    const hasSchedule = scheduledDayIndices.has(dayDate.getDay());

                    return (
                        <div key={i}
                            onClick={() => onDateChange(dayDate)}
                            className={`py-2 w-8 h-8 mx-auto rounded-full relative flex items-center justify-center cursor-pointer transition-colors text-xs
                            ${isSelected ? 'bg-primary text-white font-bold' : isToday ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-100'}`}>
                            {d}
                            {hasSchedule && !isSelected && <span className="absolute -bottom-1 h-1 w-1 bg-primary/60 rounded-full"></span>}
                        </div>
                    )
                })}
            </div>
        </Card>
    );
};

interface AulasDoDiaProps {
    selectedDate: Date;
    schedules: ClassSchedule[];
    users: User[];
}
const AulasDoDia: React.FC<AulasDoDiaProps> = ({ selectedDate, schedules, users }) => {
    const DAYS_OF_WEEK_MAP: { [key: number]: DayOfWeek } = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };
    const isToday = toYYYYMMDD(new Date()) === toYYYYMMDD(selectedDate);
    
    const selectedDayOfWeek = DAYS_OF_WEEK_MAP[selectedDate.getDay()];
    
    const selectedSchedules = schedules
        .filter(s => s.dayOfWeek === selectedDayOfWeek)
        .sort((a,b) => a.startTime.localeCompare(b.startTime));

    const title = isToday ? "Aulas de Hoje" : `Aulas - ${selectedDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`;

    return (
        <Card>
            <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
            <div className="space-y-3">
                {selectedSchedules.length > 0 ? selectedSchedules.map(schedule => {
                    const professor = users.find(u => u.id === schedule.professorId);
                    return (
                        <div key={schedule.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-amber-200 transition-colors">
                            <p className="font-semibold text-slate-800 text-sm">{schedule.className}</p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                                <span>{schedule.startTime} - {schedule.endTime}</span>
                                {professor && <span className="text-primary">{professor.name.split(' ')[0]}</span>}
                            </p>
                        </div>
                    );
                }) : (
                    <p className="text-sm text-slate-400 text-center py-4 italic">Sem aulas agendadas.</p>
                )}
            </div>
        </Card>
    );
};

interface CompetitionsCardProps {
  students: Student[];
  onCompetitorClick: (student: Student) => void;
}

const CompetitionsCard: React.FC<CompetitionsCardProps> = ({ students, onCompetitorClick }) => {
    const competitors = students.filter(s => {
        let medals = s.medals;
        if (typeof medals === 'string') {
            try { medals = JSON.parse(medals); } catch { return false; }
        }
        return s.isCompetitor && medals && (medals.gold > 0 || medals.silver > 0 || medals.bronze > 0);
    });

    if (competitors.length === 0) return null;

    return (
        <Card>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-primary" />
                Competições
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {competitors.map(competitor => {
                    let medals = typeof competitor.medals === 'string' ? JSON.parse(competitor.medals) : competitor.medals;
                    return (
                        <button
                            key={competitor.id}
                            onClick={() => onCompetitorClick(competitor)}
                            className="w-full text-left flex items-center p-2 bg-slate-50 hover:bg-amber-50 rounded-md transition-colors border border-transparent hover:border-amber-100"
                        >
                            <img
                                src={competitor.imageUrl || `https://ui-avatars.com/api/?name=${competitor.name}`}
                                alt={competitor.name}
                                className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0"
                            />
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-slate-800 truncate text-sm">{competitor.name}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    {medals.gold > 0 && (
                                        <div className="flex items-center text-yellow-600" title={`${medals.gold} Ouro`}>
                                            <Award className="w-3 h-3 mr-1" /> {medals.gold}
                                        </div>
                                    )}
                                    {medals.silver > 0 && (
                                        <div className="flex items-center text-slate-400" title={`${medals.silver} Prata`}>
                                            <Award className="w-3 h-3 mr-1" /> {medals.silver}
                                        </div>
                                    )}
                                    {medals.bronze > 0 && (
                                        <div className="flex items-center text-orange-400" title={`${medals.bronze} Bronze`}>
                                            <Award className="w-3 h-3 mr-1" /> {medals.bronze}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

const AttendanceChart: React.FC<{ records: AttendanceRecord[] }> = ({ records }) => {
    const { themeSettings } = useContext(AppContext);
  
    const data = useMemo(() => {
        const last9Days = Array.from({ length: 9 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d;
        }).reverse();

        return last9Days.map(day => {
            const dateStr = toYYYYMMDD(day);
            const dailyRecords = records.filter(r => r.date === dateStr);
            return {
                name: day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
                Presentes: dailyRecords.filter(r => r.status === 'present').length,
                Ausentes: dailyRecords.filter(r => r.status === 'absent').length
            };
        });
    }, [records]);
    
    return (
      <Card className="h-full">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-semibold text-[var(--theme-text-primary)]">Relatório de Frequência</h3>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 0, 0, 0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--theme-text-primary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--theme-text-primary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                  cursor={{fill: 'rgba(245, 158, 11, 0.1)'}}
                  contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#E5E7EB',
                      color: '#1F2937',
                      borderRadius: '0.75rem',
                  }}
              />
              <Bar dataKey="Presentes" fill={themeSettings.chartColor1} radius={[5, 5, 0, 0]} barSize={10} />
              <Bar dataKey="Ausentes" fill={themeSettings.chartColor2} radius={[5, 5, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
};

// Payment Modal
const PaymentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    students: Student[];
    onConfirm: (studentId: string) => void;
}> = ({ isOpen, onClose, students, onConfirm }) => {
    const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pagamento de Mensalidade">
            <div className="space-y-4">
                <p>Selecione o aluno que realizou o pagamento:</p>
                <select 
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full border-slate-200 rounded-lg"
                >
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onConfirm(selectedStudentId)} disabled={!selectedStudentId}>Confirmar Pagamento</Button>
                </div>
            </div>
        </Modal>
    )
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    user, 
    students, 
    users, 
    schedules, 
    graduations, 
    themeSettings, 
    updateStudentPayment,
    attendanceRecords
}) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dashboardStudent, setDashboardStudent] = useState<Student | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const overdueStudents = useMemo(() => students.filter(s => s.paymentStatus === 'unpaid'), [students]);

    const handleConfirmPayment = async (studentId: string) => {
        await updateStudentPayment(studentId, 'paid');
        setIsPaymentModalOpen(false);
    }
    
    if (user?.role === 'student') {
        return <StudentDashboard 
            user={user} 
            students={students} 
            graduations={graduations} 
            schedules={schedules} 
            themeSettings={themeSettings} 
            updateStudentPayment={updateStudentPayment}
            users={users}
        />;
    }

    const totalTeachers = users.filter(u => u.role !== 'student').length;

    const stats = [
        { icon: <Users />, title: 'Total de Alunos', value: String(students.length), color: '#3B82F6', bgColor: 'bg-blue-100' },
        { icon: <Briefcase />, title: 'Professores', value: String(totalTeachers), color: '#10B981', bgColor: 'bg-green-100' },
        { icon: <BookOpen />, title: 'Turmas Ativas', value: String(schedules.length), color: '#8B5CF6', bgColor: 'bg-purple-100' },
    ];
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">Bom dia, {user?.name?.split(' ')[0]}!</h1>
                  <p className="text-slate-500 mt-1">Bem-vindo ao painel da sua academia.</p>
                </div>
                <div className="hidden md:block">
                    <Button variant="secondary"><CalendarIcon className="w-4 h-4 mr-2" /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {stats.map(stat => <StatCard key={stat.title} {...stat} />)}
                    </div>
                    <AttendanceChart records={attendanceRecords} />
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-semibold text-slate-800">Alunos com Pendências</h3>
                             <Button size="sm" onClick={() => setIsPaymentModalOpen(true)} disabled={overdueStudents.length === 0}>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pagar Mensalidade
                             </Button>
                        </div>
                        <StudentPerformanceTable students={students} onPayClick={() => {
                            setIsPaymentModalOpen(true);
                        }} />
                    </Card>
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <BirthdayCard students={students} users={users} />
                    <CommunityCard />
                    <CalendarWidget selectedDate={selectedDate} onDateChange={setSelectedDate} schedules={schedules} />
                    <AulasDoDia selectedDate={selectedDate} schedules={schedules} users={users} />
                    <CompetitionsCard students={students} onCompetitorClick={setDashboardStudent} />
                </div>
            </div>
            
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
                        users={users}
                    />
                </Modal>
            )}

            {isPaymentModalOpen && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    students={overdueStudents}
                    onConfirm={handleConfirmPayment}
                />
            )}
        </div>
    );
};