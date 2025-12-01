
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Student, User, ClassSchedule, Graduation, ThemeSettings, AttendanceRecord } from '../types';
import { AppContext } from '../context/AppContext';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_OF_WEEK_MAP: { [key: number]: string } = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };

// --- Payment Modal ---
const PaymentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    student: Student | null;
    onConfirm: (studentId: string) => void;
}> = ({ isOpen, onClose, student, onConfirm }) => {
    if (!isOpen || !student) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pagamento">
            <div className="space-y-4">
                <p>Confirmar recebimento de mensalidade de <strong>{student.name}</strong>?</p>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onConfirm(student.id)}>Confirmar Pagamento</Button>
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
    updateStudentPayment,
    attendanceRecords
}) => {
    // --- State ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);

    // --- Calculated Data ---
    const totalStudents = students.length;
    const totalProfessors = users.filter(u => u.role !== 'student').length;
    const activeClasses = schedules.length;
    const scholarshipCount = students.filter(s => s.paymentStatus === 'scholarship').length;

    const eligibleStudentsCount = useMemo(() => {
        // Simplified eligibility logic for dashboard summary
        let count = 0;
        students.forEach(s => {
            const belt = graduations.find(g => g.id === s.beltId);
            if(belt) {
                // Mock logic: if time in belt > minTime (simplified)
               const promoDate = s.lastPromotionDate || s.firstGraduationDate;
               if(promoDate) {
                   const months = (new Date().getFullYear() - new Date(promoDate).getFullYear()) * 12 + (new Date().getMonth() - new Date(promoDate).getMonth());
                   if(months >= belt.minTimeInMonths) count++;
               }
            }
        });
        return count;
    }, [students, graduations]);

    const overdueStudents = useMemo(() => students.filter(s => s.paymentStatus === 'unpaid').slice(0, 5), [students]);

    // --- Charts Data ---
    
    // 1. Distribution by Belt (instead of "Turmas" for better visual)
    const beltDistributionData = useMemo(() => {
        const counts: Record<string, number> = {};
        students.forEach(s => {
            const beltName = graduations.find(g => g.id === s.beltId)?.name || 'Outros';
            counts[beltName] = (counts[beltName] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [students, graduations]);

    const beltColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

    // 2. Financial Status
    const financialData = [
        { name: 'Em Dia', value: students.filter(s => s.paymentStatus === 'paid').length, color: '#10b981' },
        { name: 'Pendente', value: students.filter(s => s.paymentStatus === 'unpaid').length, color: '#ef4444' },
        { name: 'Bolsista', value: scholarshipCount, color: '#f59e0b' }
    ];

    // 3. Attendance Trend (Last 6 months)
    const attendanceTrendData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
            const monthRecords = attendanceRecords.filter(r => r.date.startsWith(monthKey));
            const present = monthRecords.filter(r => r.status === 'present').length;
            const total = monthRecords.length;
            const percentage = total > 0 ? (present / total) * 100 : 0;
            
            data.push({
                name: MONTH_NAMES[d.getMonth()].substring(0, 3),
                percentage: Math.round(percentage)
            });
        }
        return data;
    }, [attendanceRecords]);

    // --- Calendar Logic ---
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const days = [];
        // Prev Month
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, isCurrent: false });
        }
        // Current Month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrent: true, isToday: i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() });
        }
        // Next Month (Fill grid)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isCurrent: false });
        }
        return days;
    }, [currentDate]);

    // --- Classes Today ---
    const todaysClasses = useMemo(() => {
        const todayName = DAYS_OF_WEEK_MAP[new Date().getDay()];
        return schedules.filter(s => s.dayOfWeek === todayName).sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [schedules]);

    // --- Handlers ---
    const handleConfirmPayment = async (studentId: string) => {
        await updateStudentPayment(studentId, 'paid');
        setPaymentStudent(null);
    };

    return (
        <div className="dashboard-container -m-6 md:-m-10 p-6 md:p-10 min-h-screen text-slate-100">
            <style>{`
                :root {
                    --primary: #0f172a;
                    --secondary: #1e293b;
                    --accent: #3b82f6;
                    --accent-light: #60a5fa;
                    --text: #f8fafc;
                    --text-secondary: #cbd5e1;
                    --success: #10b981;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --glass: rgba(255, 255, 255, 0.05);
                    --border: rgba(255, 255, 255, 0.1);
                }

                .dashboard-container {
                    background: linear-gradient(135deg, var(--primary), #0a0f1f);
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                    gap: 20px;
                    grid-template-areas:
                        "header header header header header header header header header header header header"
                        "stats stats stats stats stats stats stats stats stats stats stats stats"
                        "frequencia frequencia frequencia graduacao graduacao graduacao graduacao graduacao graduacao pendencias pendencias pendencias"
                        "grafico1 grafico1 grafico1 grafico1 grafico2 grafico2 grafico2 grafico2 grafico3 grafico3 grafico3 grafico3"
                        "calendario calendario aulas aulas aulas turmas turmas turmas turmas turmas turmas turmas"
                        "footer footer footer footer footer footer footer footer footer footer footer footer";
                }

                .d-card {
                    background: var(--glass);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                .d-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                }

                .area-header { grid-area: header; }
                .area-stats { grid-area: stats; }
                .area-frequencia { grid-area: frequencia; }
                .area-graduacao { grid-area: graduacao; }
                .area-pendencias { grid-area: pendencias; }
                .area-grafico1 { grid-area: grafico1; }
                .area-grafico2 { grid-area: grafico2; }
                .area-grafico3 { grid-area: grafico3; }
                .area-calendario { grid-area: calendario; }
                .area-aulas { grid-area: aulas; }
                .area-turmas { grid-area: turmas; }
                .area-footer { grid-area: footer; }

                .stat-card {
                    background: linear-gradient(135deg, var(--secondary), rgba(30, 41, 59, 0.7));
                    position: relative;
                    overflow: hidden;
                }
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 4px;
                    background: linear-gradient(90deg, var(--accent), var(--accent-light));
                }
                .stat-card.success::before { background: linear-gradient(90deg, var(--success), #34d399); }
                .stat-card.warning::before { background: linear-gradient(90deg, var(--warning), #fbbf24); }
                .stat-card.danger::before { background: linear-gradient(90deg, var(--danger), #f87171); }

                @media (max-width: 1200px) {
                    .dashboard-grid {
                        grid-template-columns: repeat(6, 1fr);
                        grid-template-areas:
                            "header header header header header header"
                            "stats stats stats stats stats stats"
                            "frequencia frequencia frequencia graduacao graduacao graduacao"
                            "pendencias pendencias pendencias pendencias pendencias pendencias"
                            "grafico1 grafico1 grafico1 grafico2 grafico2 grafico2"
                            "grafico3 grafico3 grafico3 grafico3 grafico3 grafico3"
                            "calendario calendario aulas aulas turmas turmas"
                            "footer footer footer footer footer footer";
                    }
                }

                @media (max-width: 768px) {
                    .dashboard-grid {
                        display: flex;
                        flex-direction: column;
                    }
                }
            `}</style>

            <div className="dashboard-grid">
                {/* Header */}
                <div className="d-card area-header text-center border-b border-white/10 mb-5">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200 mb-2">
                        Dashboard Administrativo
                    </h1>
                    <p className="text-slate-400 text-lg">Visão geral completa do desempenho e atividades acadêmicas</p>
                </div>

                {/* Stats */}
                <div className="area-stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="d-card stat-card text-center py-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-2">Total de Alunos</h3>
                        <div className="text-4xl font-bold text-white">{totalStudents}</div>
                    </div>
                    <div className="d-card stat-card success text-center py-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-2">Professores</h3>
                        <div className="text-4xl font-bold text-white">{totalProfessors}</div>
                    </div>
                    <div className="d-card stat-card warning text-center py-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-2">Turmas Ativas</h3>
                        <div className="text-4xl font-bold text-white">{activeClasses}</div>
                    </div>
                    <div className="d-card stat-card danger text-center py-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-widest mb-2">Bolsistas</h3>
                        <div className="text-4xl font-bold text-white">{scholarshipCount}</div>
                    </div>
                </div>

                {/* Frequencia */}
                <div className="d-card area-frequencia">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-5 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Status de Graduação
                    </h2>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center mt-4">
                        <h3 className="text-emerald-400 mb-2 font-medium">Aptos para Graduação</h3>
                        <div className="text-4xl font-bold text-white">{eligibleStudentsCount}</div>
                    </div>
                </div>

                {/* Graduacao Breakdown */}
                <div className="d-card area-graduacao">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-5 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Distribuição por Faixa
                    </h2>
                    <ul className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {beltDistributionData.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <span className="text-slate-300">{item.name}</span>
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-bold">{item.value}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Pendencias */}
                <div className="d-card area-pendencias">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-5 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Pendências Financeiras
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 text-xs uppercase tracking-wider text-blue-300 border-b border-white/10">Nome</th>
                                    <th className="p-3 text-xs uppercase tracking-wider text-blue-300 border-b border-white/10">Status</th>
                                    <th className="p-3 text-xs uppercase tracking-wider text-blue-300 border-b border-white/10 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueStudents.map(s => (
                                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-sm text-slate-300">{s.name.split(' ')[0]}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Pendente</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => setPaymentStudent(s)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors"
                                            >
                                                Pagar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {overdueStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-4 text-center text-slate-500 text-sm">Nenhuma pendência recente.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="d-card area-grafico1 flex flex-col">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-4 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Alunos por Faixa
                    </h2>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={beltDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {beltDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={beltColors[index % beltColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} 
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="d-card area-grafico2 flex flex-col">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-4 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Status Financeiro
                    </h2>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {financialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="d-card area-grafico3 flex flex-col">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-4 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Frequência (Tendência)
                    </h2>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attendanceTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                />
                                <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Calendario */}
                <div className="d-card area-calendario">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold capitalize text-slate-200">
                            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                            >
                                &lt;
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {['D','S','T','Q','Q','S','S'].map(d => (
                            <div key={d} className="text-xs font-bold text-blue-400 py-2">{d}</div>
                        ))}
                        {calendarDays.map((d, i) => (
                            <div 
                                key={i} 
                                className={`
                                    py-2 text-xs rounded-md
                                    ${!d.isCurrent ? 'text-slate-600' : 'text-slate-300'}
                                    ${d.isToday ? 'bg-emerald-500/20 border border-emerald-500/40 text-white font-bold' : 'hover:bg-blue-500/10'}
                                `}
                            >
                                {d.day}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aulas de Hoje */}
                <div className="d-card area-aulas">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-5 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Aulas de Hoje
                    </h2>
                    <div className="space-y-3">
                        {todaysClasses.length > 0 ? todaysClasses.map(c => (
                            <div key={c.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold mr-3">
                                    {c.startTime}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{c.className}</div>
                                    <div className="text-xs text-slate-500">Prof. {users.find(u => u.id === c.professorId)?.name?.split(' ')[0]}</div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-center text-sm py-4">Sem aulas hoje.</p>
                        )}
                    </div>
                </div>

                {/* Professores / Turmas */}
                <div className="d-card area-turmas">
                    <h2 className="text-xl font-bold text-blue-300 flex items-center mb-5 after:content-[''] after:flex-1 after:h-[1px] after:bg-white/10 after:ml-4">
                        Professores Ativos
                    </h2>
                    <div className="space-y-3">
                        {users.filter(u => u.role !== 'student').slice(0, 3).map(p => (
                            <div key={p.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white font-bold mr-3 border border-white/10">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-200">{p.name}</div>
                                    <div className="text-xs text-slate-500 capitalize">{p.role.replace('_', ' ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="area-footer text-center text-slate-500 text-sm border-t border-white/10 pt-5 mt-5">
                    <p>Dashboard Administrativo - Sistema de Gestão Acadêmica</p>
                </div>
            </div>

            {/* Modals */}
            <PaymentModal 
                isOpen={!!paymentStudent} 
                onClose={() => setPaymentStudent(null)} 
                student={paymentStudent} 
                onConfirm={handleConfirmPayment} 
            />
        </div>
    );
};
