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
    DollarSign, Award, ChevronLeft, ChevronRight, LayoutDashboard, Phone, Mail, FileText, Paperclip, Eye, Check, X
} from 'lucide-react';
import { StudentDashboard } from './StudentDashboard';

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

// --- Document Viewer Modal ---
const DocumentViewerModal: React.FC<{
    url: string | null;
    onClose: () => void;
}> = ({ url, onClose }) => {
    if (!url) return null;

    return (
        <Modal isOpen={!!url} onClose={onClose} title="Visualizar Comprovante" size="4xl">
            <div className="h-[75vh] w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <iframe 
                    src={url} 
                    className="w-full h-full" 
                    title="Comprovante"
                    style={{ border: 'none' }} 
                />
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            </div>
        </Modal>
    );
};

// --- Financial List Modal ---
const FinancialListModal: React.FC<{
    status: 'paid' | 'unpaid' | 'scholarship' | null;
    students: Student[];
    onClose: () => void;
}> = ({ status, students, onClose }) => {
    if (!status) return null;

    const filteredStudents = students.filter(s => s.paymentStatus === status);
    
    let title = "Alunos";
    let headerColor = "text-slate-800";
    
    if (status === 'paid') { title = "Alunos em Dia"; headerColor = "text-green-600"; }
    else if (status === 'unpaid') { title = "Alunos Pendentes"; headerColor = "text-red-600"; }
    else if (status === 'scholarship') { title = "Alunos Bolsistas"; headerColor = "text-blue-600"; }

    return (
        <Modal isOpen={!!status} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className={`text-sm font-medium ${headerColor} mb-2`}>
                    Total: {filteredStudents.length} registros
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <img 
                                    src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                                    alt={student.name} 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{student.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        {student.phone && (
                                            <span className="flex items-center" title="Telefone">
                                                <Phone className="w-3 h-3 mr-1" />
                                                {student.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {status === 'unpaid' && (
                                <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                                    Dia {student.paymentDueDateDay}
                                </span>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 italic">
                            Nenhum aluno encontrado nesta categoria.
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Belt List Modal ---
const BeltListModal: React.FC<{
    beltId: string | null;
    students: Student[];
    graduations: Graduation[];
    onClose: () => void;
}> = ({ beltId, students, graduations, onClose }) => {
    if (!beltId) return null;

    const belt = graduations.find(g => g.id === beltId);
    const filteredStudents = students.filter(s => s.beltId === beltId);

    return (
        <Modal isOpen={!!beltId} onClose={onClose} title={`Alunos - ${belt?.name || 'Graduação'}`}>
            <div className="space-y-4">
                <div className="text-sm font-medium text-slate-600 mb-2">
                    Total: {filteredStudents.length} alunos
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {filteredStudents.length > 0 ? filteredStudents.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <img 
                                    src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                                    alt={student.name} 
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{student.name}</p>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500">
                                        <span className="flex items-center">
                                            <Mail className="w-3 h-3 mr-1" />
                                            {student.email}
                                        </span>
                                        {student.phone && (
                                            <span className="flex items-center">
                                                <Phone className="w-3 h-3 mr-1" />
                                                {student.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 italic">
                            Nenhum aluno nesta graduação.
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Payment Proofs Modal ---
const PaymentProofsModal: React.FC<{
    date: Date;
    payments: { dateStr: string; student: Student; amount: number; paymentId: string }[];
    onClose: () => void;
    onViewProof: (url: string) => void;
}> = ({ date, payments, onClose, onViewProof }) => {
    
    // Helper to find document corresponding to the payment date
    const getProofDocument = (student: Student, paymentDateStr: string) => {
        if (!student.documents) return null;
        // Look for a document uploaded on the same day as the payment
        // We compare the YYYY-MM-DD part
        return student.documents.find(doc => {
            const docDate = new Date(doc.uploadDate).toISOString().split('T')[0];
            return docDate === paymentDateStr;
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Comprovantes: ${date.toLocaleDateString('pt-BR')}`}>
            <div className="space-y-4">
                <div className="text-sm text-slate-500 mb-2">
                    {payments.length} pagamento(s) registrado(s) nesta data.
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {payments.length > 0 ? payments.map((item, idx) => {
                        const proofDoc = getProofDocument(item.student, item.dateStr);
                        
                        return (
                            <div key={`${item.paymentId}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={item.student.imageUrl || `https://ui-avatars.com/api/?name=${item.student.name}`} 
                                        alt={item.student.name} 
                                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                    />
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{item.student.name}</p>
                                        <div className="text-xs text-green-600 font-bold">
                                            {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${proofDoc ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 cursor-pointer' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                                    title={proofDoc ? "Visualizar Comprovante" : "Comprovante não encontrado"}
                                    onClick={() => proofDoc ? onViewProof(proofDoc.url) : alert('Nenhum comprovante anexado encontrado para esta data.')}
                                >
                                    {proofDoc ? <Eye className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                                    Comprovante
                                </button>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-8 text-slate-400 italic">
                            Nenhum pagamento encontrado.
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Financial Calendar Widget ---
const FinancialCalendarWidget: React.FC<{ 
    students: Student[]; 
    onViewProof: (url: string) => void;
}> = ({ students, onViewProof }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Flatten payment history from all students
    const paymentEvents = useMemo(() => {
        const events: { dateStr: string; student: Student; amount: number; paymentId: string }[] = [];
        students.forEach(student => {
            if (student.paymentHistory && student.paymentHistory.length > 0) {
                student.paymentHistory.forEach(pay => {
                    // Assuming pay.date is a string like "YYYY-MM-DD" or ISO
                    const dateObj = new Date(pay.date);
                    const dateStr = dateObj.toISOString().split('T')[0]; // Normalize
                    events.push({
                        dateStr,
                        student,
                        amount: pay.amount,
                        paymentId: pay.id
                    });
                });
            }
        });
        return events;
    }, [students]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const getPaymentsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return paymentEvents.filter(e => e.dateStr === dateStr);
    };

    return (
        <Card className="flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-green-600" /> Pagamentos
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
                    const dailyPayments = getPaymentsForDate(date);
                    const hasPayments = dailyPayments.length > 0;

                    return (
                        <button
                            key={day}
                            onClick={() => hasPayments && setSelectedDate(date)}
                            disabled={!hasPayments}
                            className={`
                                h-8 rounded-lg flex flex-col items-center justify-center text-xs transition-all relative
                                ${isToday ? 'bg-slate-800 text-white font-bold shadow-sm' : ''}
                                ${hasPayments ? 'hover:bg-green-50 text-slate-800 cursor-pointer font-semibold' : 'text-slate-400 cursor-default'}
                            `}
                        >
                            {day}
                            {hasPayments && (
                                <span className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {selectedDate && (
                <PaymentProofsModal 
                    date={selectedDate} 
                    payments={getPaymentsForDate(selectedDate)}
                    onClose={() => setSelectedDate(null)}
                    onViewProof={onViewProof}
                />
            )}
        </Card>
    );
};

// --- Calendar Modal ---
const DayDetailsModal: React.FC<{
    date: Date;
    schedules: ClassSchedule[];
    users: User[];
    students: Student[];
    onClose: () => void;
    onOpenDashboard: (student: Student) => void;
    attendanceRecords: AttendanceRecord[];
}> = ({ date, schedules, users, students, onClose, onOpenDashboard, attendanceRecords }) => {
    const dayOfWeek = DAYS_OF_WEEK_MAP[date.getDay()];
    const daysSchedules = schedules
        .filter(s => s.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Normalize date string for comparison
    const dateStr = date.toISOString().split('T')[0];

    return (
        <Modal isOpen={true} onClose={onClose} title={`Aulas de ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {daysSchedules.length > 0 ? (
                    daysSchedules.map(schedule => {
                        const professor = users.find(u => u.id === schedule.professorId);
                        const enrolledStudents = schedule.studentIds?.map(id => students.find(s => s.id === id)).filter((s): s is Student => !!s) || [];

                        return (
                            <div key={schedule.id} className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden">
                                {/* Header da Turma */}
                                <div className="p-3 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm">
                                    <div>
                                        <div className="font-bold text-slate-800">{schedule.className}</div>
                                        <div className="text-xs text-slate-500">Prof. {professor?.name || 'N/A'}</div>
                                    </div>
                                    <div className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-slate-700">
                                        {schedule.startTime} - {schedule.endTime}
                                    </div>
                                </div>

                                {/* Lista de Alunos */}
                                <div className="p-3">
                                    <div className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center">
                                        <Users className="w-3 h-3 mr-1" />
                                        Alunos Matriculados ({enrolledStudents.length})
                                    </div>
                                    {enrolledStudents.length > 0 ? (
                                        <div className="space-y-2">
                                            {enrolledStudents.map(student => {
                                                // Check Attendance Status
                                                const record = attendanceRecords.find(r => 
                                                    r.studentId === student.id && 
                                                    r.scheduleId === schedule.id && 
                                                    r.date === dateStr
                                                );

                                                return (
                                                    <div key={student.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-100">
                                                        <div className="flex items-center">
                                                            <img 
                                                                src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                                                                alt={student.name} 
                                                                className="w-6 h-6 rounded-full mr-2 object-cover"
                                                            />
                                                            <span className="text-slate-700 font-medium mr-2">{student.name}</span>
                                                            
                                                            {/* Attendance Indicators */}
                                                            {record?.status === 'present' && (
                                                                <span title="Presente">
                                                                    <Check className="w-4 h-4 text-green-500" />
                                                                </span>
                                                            )}
                                                            {record?.status === 'absent' && (
                                                                <span title="Ausente">
                                                                    <X className="w-4 h-4 text-red-500" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => onOpenDashboard(student)}
                                                            className="text-xs flex items-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200"
                                                            title="Abrir Dashboard do Aluno"
                                                        >
                                                            <LayoutDashboard className="w-3 h-3 mr-1" />
                                                            Dash
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic text-center py-2">
                                            Nenhum aluno vinculado a esta turma.
                                        </div>
                                    )}
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
const CalendarWidget: React.FC<{ 
    schedules: ClassSchedule[]; 
    users: User[]; 
    students: Student[];
    attendanceRecords: AttendanceRecord[];
    onOpenDashboard: (student: Student) => void;
}> = ({ schedules, users, students, attendanceRecords, onOpenDashboard }) => {
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
                    <Calendar className="w-5 h-5 mr-2 text-primary" /> Calendário de Aulas
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
                    students={students}
                    onClose={() => setSelectedDate(null)} 
                    onOpenDashboard={onOpenDashboard}
                    attendanceRecords={attendanceRecords}
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
    attendanceRecords,
    themeSettings
}) => {
    const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
    const [dashboardStudent, setDashboardStudent] = useState<Student | null>(null);
    const [financialModalStatus, setFinancialModalStatus] = useState<'paid' | 'unpaid' | 'scholarship' | null>(null);
    const [selectedBeltId, setSelectedBeltId] = useState<string | null>(null);
    const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);

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
        return graduations.map(g => {
            const count = activeStudents.filter(s => s.beltId === g.id).length;
            return {
                id: g.id,
                name: g.name,
                value: count,
                color: g.color
            };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }, [activeStudents, graduations]);

    // 2. Financial Overview
    const financialData = [
        { name: 'Em Dia', value: activeStudents.filter(s => s.paymentStatus === 'paid').length, color: '#10b981', key: 'paid' }, // emerald-500
        { name: 'Pendente', value: pendingPaymentsCount, color: '#ef4444', key: 'unpaid' }, // red-500
        { name: 'Bolsista', value: scholarshipCount, color: '#3b82f6', key: 'scholarship' } // blue-500
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
                                    onClick={(data) => setFinancialModalStatus(data.key as any)}
                                    cursor="pointer"
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

            {/* Bottom Lists & Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pending Payments List */}
                <Card className="lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Pagamentos Pendentes</h3>
                        <Button size="sm" variant="secondary">Ver Todos</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                                    <th className="py-2 px-1 font-semibold">Aluno</th>
                                    <th className="py-2 px-1 font-semibold">Dia</th>
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
                                                <span className="font-medium text-slate-700 truncate w-20 sm:w-auto">{s.name.split(' ')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-1 text-slate-500">{s.paymentDueDateDay}</td>
                                        <td className="py-3 px-1 text-right">
                                            <button 
                                                onClick={() => setPaymentStudent(s)}
                                                className="text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                                            >
                                                Pagar
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-slate-400">
                                            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            Nenhuma pendência.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Calendar, Belt Distribution & Payment Calendar */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Class Calendar Widget */}
                        <CalendarWidget 
                            schedules={schedules} 
                            users={users} 
                            students={students}
                            onOpenDashboard={(student) => setDashboardStudent(student)} 
                            attendanceRecords={attendanceRecords}
                        />

                        {/* Financial Calendar Widget */}
                        <FinancialCalendarWidget 
                            students={activeStudents} 
                            onViewProof={(url) => setViewingDocUrl(url)}
                        />
                    </div>

                    {/* Belt Distribution Mini Chart */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Alunos por Faixa</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {beltData.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                                    onClick={() => setSelectedBeltId(item.id)}
                                >
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

            {/* Financial List Modal */}
            <FinancialListModal 
                status={financialModalStatus} 
                students={activeStudents}
                onClose={() => setFinancialModalStatus(null)} 
            />

            {/* Belt List Modal */}
            <BeltListModal 
                beltId={selectedBeltId}
                students={activeStudents}
                graduations={graduations}
                onClose={() => setSelectedBeltId(null)}
            />

            {/* Dashboard Student Modal */}
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

            {/* Document Viewer Modal */}
            {viewingDocUrl && (
                <DocumentViewerModal 
                    url={viewingDocUrl} 
                    onClose={() => setViewingDocUrl(null)} 
                />
            )}
        </div>
    );
};