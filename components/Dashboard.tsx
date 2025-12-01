import React, { useState, useMemo } from 'react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Student, User, ClassSchedule, Graduation, ThemeSettings, AttendanceRecord } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { 
    Users, Calendar, TrendingUp, AlertCircle, CheckCircle, 
    DollarSign, Award, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface DashboardProps {
  user: User;
  students: Student[];
  users: User[];
  schedules: ClassSchedule[];
  graduations: Graduation[];
  themeSettings: ThemeSettings;
  updateStudentPayment: (id: string, status: 'paid' | 'unpaid' | 'scholarship') => Promise<void>;
  attendanceRecords: AttendanceRecord[];
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_OF_WEEK_MAP: { [key: number]: string } = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };

// --- Payment Confirmation Modal ---
const PaymentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    student: Student | null;
    onConfirm: (studentId: string) => void;
}> = ({ isOpen, onClose, student, onConfirm }) => {
    if (!isOpen || !student) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pagamento">
            <div className="space-y-4 text-slate-600">
                <div className="flex items-center justify-center p-4 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-center">
                    Confirmar o recebimento da mensalidade de <strong className="text-slate-900">{student.name}</strong>?
                </p>
                <div className="flex justify-center gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="success" onClick={() => onConfirm(student.id)}>Confirmar Recebimento</Button>
                </div>
            </div>
        </Modal>
    )
};

// --- Calendar Modal ---
const DayDetailsModal: React.FC<{
    date: Date;
    schedules: ClassSchedule[];
    users: User[];
    onClose: () => void;
}> = ({ date, schedules, users, onClose }) => {
    const dayOfWeek = DAYS_OF_WEEK_MAP[date.getDay()];
    const daysSchedules = schedules
        .filter(s => s.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
        <Modal isOpen={true} onClose={onClose} title={`Aulas de ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
            <div className="space-y-3">
                {daysSchedules.length > 0 ? (
                    daysSchedules.map(schedule => {
                        const professor = users.find(u => u.id === schedule.professorId);
                        return (
                            <div key={schedule.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex justify-between items-center transition-colors hover:bg-slate-100">
                                <div>
                                    <div className="font-bold text-slate-800">{schedule.className}</div>
                                    <div className="text-xs text-slate-500">Prof. {professor?.name || 'N/A'}</div>
                                </div>
                                <div className="bg-white px-2 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                                    {schedule.startTime} - {schedule.endTime}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-sm">
                        Nenhuma aula agendada para este dia.
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </div>
        </Modal>
    );
};

// --- Calendar Widget ---
const CalendarWidget: React.FC<{ schedules: ClassSchedule[]; users: User[] }> = ({ schedules, users }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <Card className="flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" /> Calendário
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 w-24 text-center capitalize select-none">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {emptyDays.map(d => <div key={`empty-${d}`} />)}
                {days.map(day => {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayOfWeek = DAYS_OF_WEEK_MAP[date.getDay()];
                    const hasClasses = schedules.some(s => s.dayOfWeek === dayOfWeek);

                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDate(date)}
                            className={`
                                h-8 rounded-lg flex flex-col items-center justify-center text-xs transition-all relative
                                ${isToday 
                                    ? 'bg-primary text-white font-bold shadow-sm' 
                                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                                }
                            `}
                        >
                            {day}
                            {hasClasses && !isToday && (
                                <span className="absolute bottom-1 w-1 h-1 bg-primary/50 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {selectedDate && (
                <DayDetailsModal 
                    date={selectedDate} 
                    schedules={schedules} 
                    users={users} 
                    onClose={() => setSelectedDate(null)} 
                />
            )}
        </Card>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
    students, 
    users, 
    schedules, 
    graduations, 
    updateStudentPayment,
    attendanceRecords
}) => {
    const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);

    // --- Statistics Calculations ---
    const activeStudents = students.filter(s => s.status !== 'blocked' && s.status !== 'pending');
    const totalStudents = activeStudents.length;
    const pendingPaymentsCount = activeStudents.filter(s => s.paymentStatus === 'unpaid').length;
    const scholarshipCount = activeStudents.filter(s => s.isSocialProject || s.paymentStatus === 'scholarship').length;
    
    // Eligible for Graduation Logic
    const eligibleStudentsCount = useMemo(() => {
        let count = 0;
        activeStudents.forEach(s => {
            const belt = graduations.find(g => g.id === s.beltId);
            if(belt) {
               const promoDate = s.lastPromotionDate || s.firstGraduationDate;
               if(promoDate) {
                   const months = (new Date().getFullYear() - new Date(promoDate).getFullYear()) * 12 + (new Date().getMonth() - new Date(promoDate).getMonth());
                   if(months >= belt.minTimeInMonths && belt.minTimeInMonths > 0) count++;
               }
            }
        });
        return count;
    }, [activeStudents, graduations]);

    // --- Chart Data ---

    // 1. Belt Distribution
    const beltData = useMemo(() => {
        const counts: Record<string, { count: number, color: string }> = {};
        
        // Initialize with all graduations to keep order/colors correct even if 0 students
        graduations.forEach(g => {
            counts[g.name] = { count: 0, color: g.color };
        });

        activeStudents.forEach(s => {
            const belt = graduations.find(g => g.id === s.beltId);
            if (belt) {
                counts[belt.name].count += 1;
            }
        });

        return Object.entries(counts)
            .map(([name, data]) => ({ name, value: data.count, color: data.color }))
            .filter(d => d.value > 0) // Hide empty segments for cleaner chart
            .sort((a, b) => b.value - a.value); // Sort by count desc
    }, [activeStudents, graduations]);

    // 2. Financial Overview
    const financialData = [
        { name: 'Em Dia', value: activeStudents.filter(s => s.paymentStatus === 'paid').length, color: '#10b981' }, // emerald-500
        { name: 'Pendente', value: pendingPaymentsCount, color: '#ef4444' }, // red-500
        { name: 'Bolsista', value: scholarshipCount, color: '#3b82f6' } // blue-500
    ];

    // 3. Attendance Trend (Last 6 Months)
    const attendanceData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
            
            // Filter records for this month
            const monthRecords = attendanceRecords.filter(r => r.date.startsWith(monthKey));
            
            // Calculate average attendance per scheduled class is complex without total classes held history
            // Simplified metric: Total "present" records in that month
            const presentCount = monthRecords.filter(r => r.status === 'present').length;
            
            data.push({
                name: MONTH_NAMES[d.getMonth()],
                presencas: presentCount
            });
        }
        return data;
    }, [attendanceRecords]);

    // --- Lists Data ---
    const overdueStudents = useMemo(() => 
        activeStudents.filter(s => s.paymentStatus === 'unpaid').slice(0, 5), 
    [activeStudents]);

    // --- Actions ---
    const handleConfirmPayment = async (studentId: string) => {
        await updateStudentPayment(studentId, 'paid');
        setPaymentStudent(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Visão Geral</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="flex items-center p-5 border-l-4 border-l-blue-500">
                    <div className="p-3 bg-blue-50 rounded-full mr-4">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total de Alunos</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
                    </div>
                </Card>

                <Card className="flex items-center p-5 border-l-4 border-l-red-500">
                    <div className="p-3 bg-red-50 rounded-full mr-4">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Pagamentos Pendentes</p>
                        <p className="text-2xl font-bold text-slate-800">{pendingPaymentsCount}</p>
                    </div>
                </Card>

                <Card className="flex items-center p-5 border-l-4 border-l-emerald-500">
                    <div className="p-3 bg-emerald-50 rounded-full mr-4">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Frequência Mensal</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {attendanceData[attendanceData.length - 1]?.presencas || 0} <span className="text-xs font-normal text-slate-400">presenças</span>
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center p-5 border-l-4 border-l-amber-500">
                    <div className="p-3 bg-amber-50 rounded-full mr-4">
                        <Award className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Elegíveis Graduação</p>
                        <p className="text-2xl font-bold text-slate-800">{eligibleStudentsCount}</p>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financial Chart */}
                <Card className="lg:col-span-1 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Status Financeiro</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {financialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Attendance Chart */}
                <Card className="lg:col-span-2 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Evolução da Frequência (Total de Presenças)</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceData}>
                                <defs>
                                    <linearGradient id="colorPresencas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="presencas" 
                                    stroke="#f59e0b" 
                                    fillOpacity={1} 
                                    fill="url(#colorPresencas)" 
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Bottom Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pending Payments List */}
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Pagamentos Pendentes</h3>
                        <Button size="sm" variant="secondary">Ver Todos</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                                    <th className="py-2 px-1 font-semibold">Aluno</th>
                                    <th className="py-2 px-1 font-semibold">Vencimento</th>
                                    <th className="py-2 px-1 font-semibold text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {overdueStudents.length > 0 ? overdueStudents.map(s => (
                                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-1">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3 text-xs font-bold text-slate-600 overflow-hidden">
                                                    {s.imageUrl ? <img src={s.imageUrl} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-700">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-1 text-slate-500">Dia {s.paymentDueDateDay}</td>
                                        <td className="py-3 px-1 text-right">
                                            <button 
                                                onClick={() => setPaymentStudent(s)}
                                                className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                                            >
                                                Registrar
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-slate-400">
                                            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            Nenhuma pendência encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Calendar & Belt Distribution */}
                <div className="space-y-6">
                    {/* Replaced 'Today's Classes' List with Calendar Widget */}
                    <CalendarWidget schedules={schedules} users={users} />

                    {/* Belt Distribution Mini Chart */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Alunos por Faixa</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {beltData.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                        <span 
                                            className="w-3 h-3 rounded-full mr-2 shadow-sm border border-black/10" 
                                            style={{ backgroundColor: item.color }}
                                        ></span>
                                        <span className="text-slate-600">{item.name}</span>
                                    </div>
                                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            <PaymentModal 
                isOpen={!!paymentStudent} 
                onClose={() => setPaymentStudent(null)} 
                student={paymentStudent} 
                onConfirm={handleConfirmPayment} 
            />
        </div>
    );
};