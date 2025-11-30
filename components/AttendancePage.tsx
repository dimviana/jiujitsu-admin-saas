
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { DayOfWeek, Student, Graduation } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Check, X, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Constants ---
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_OF_WEEK_MAP: { [key: number]: DayOfWeek } = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };

// --- Helper Functions ---
const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

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

// --- Sub-components ---

const DayScheduleModal: React.FC<{ date: Date; onClose: () => void }> = ({ date, onClose }) => {
    const { schedules, users, students, graduations, attendanceRecords, saveAttendanceRecord, setNotification } = useContext(AppContext);
    const dayOfWeek = DAYS_OF_WEEK_MAP[date.getDay()];
    
    const todaysSchedules = useMemo(() => schedules.filter(s => s.dayOfWeek === dayOfWeek).sort((a,b) => a.startTime.localeCompare(b.startTime)), [schedules, dayOfWeek]);
    const dateStr = toYYYYMMDD(date);

    // Initialize state from existing records to ensure persistence visualization (Fixed Choice)
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>(() => {
        const initialState: Record<string, 'present' | 'absent'> = {};
        // Filter records for this specific date
        const existingRecords = attendanceRecords.filter(ar => ar.date === dateStr);
        existingRecords.forEach(ar => {
            initialState[`${ar.studentId}-${ar.scheduleId}`] = ar.status;
        });
        return initialState;
    });

    const handleStatusChange = (studentId: string, scheduleId: string, status: 'present' | 'absent') => {
        setAttendance(prev => ({ ...prev, [`${studentId}-${scheduleId}`]: status }));
    };

    const handleMarkAllPresent = (scheduleId: string, eligibleStudents: Student[]) => {
        const updates: Record<string, 'present' | 'absent'> = { ...attendance };
        eligibleStudents.forEach(s => {
            updates[`${s.id}-${scheduleId}`] = 'present';
        });
        setAttendance(updates);
    };

    const handleSave = async () => {
        try {
            const promises = Object.entries(attendance).map(([key, status]) => {
                const [studentId, scheduleId] = key.split('-');
                const existingRecord = attendanceRecords.find(ar => ar.studentId === studentId && ar.scheduleId === scheduleId && ar.date === dateStr);
                
                // Only save if status changed or is new
                if (!existingRecord || existingRecord.status !== status) {
                     return saveAttendanceRecord({ studentId, scheduleId, date: dateStr, status });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            setNotification({ message: 'Frequência Salva', details: 'Os registros de presença foram atualizados com sucesso.', type: 'success' });
            onClose();
        } catch (error) {
            setNotification({ message: 'Erro ao Salvar', details: 'Houve um problema ao salvar a frequência.', type: 'error' });
        }
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Aulas de ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`} size="lg">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                {todaysSchedules.length > 0 ? todaysSchedules.map(schedule => {
                     const requiredGrad = graduations.find(g => g.id === schedule.requiredGraduationId);
                     const isKidsClass = requiredGrad?.type === 'kids';

                     const eligibleStudents = students.filter(student => {
                        if (student.academyId !== schedule.academyId) return false;
                        
                        const studentGrad = graduations.find(g => g.id === student.beltId);
                        const reqRank = requiredGrad?.rank ?? 1; 
                        
                        // Check Rank
                        if ((studentGrad?.rank ?? 0) < reqRank) return false;

                        // Check Age & Class Type Logic
                        const age = calculateAge(student.birthDate || '');

                        // Logic:
                        // < 16 years: Only allow in Kids classes.
                        // >= 16 years: Allow in both (Kids and Adult).
                        if (age < 16) {
                            return isKidsClass; 
                        } else {
                            // Age >= 16, usually adults, but allowed in both based on requirement
                            return true;
                        }
                    });

                    const professor = users.find(u => u.id === schedule.professorId);

                    return (
                        <div key={schedule.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Class Header */}
                            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{schedule.className}</h3>
                                    <p className="text-sm text-slate-500 flex items-center">
                                        <span className="font-medium mr-2">{schedule.startTime} - {schedule.endTime}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full mx-2"></span>
                                        Prof. {professor?.name || 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                                        {eligibleStudents.length} Alunos Elegíveis
                                    </span>
                                    <Button size="sm" variant="secondary" onClick={() => handleMarkAllPresent(schedule.id, eligibleStudents)} className="text-xs">
                                        <UserCheck className="w-3 h-3 mr-1" /> Todos Presentes
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Student List */}
                            <div className="divide-y divide-slate-50">
                                {eligibleStudents.map(student => {
                                    const key = `${student.id}-${schedule.id}`;
                                    // Use local state if set, otherwise fallback to existing record
                                    const currentStatus = attendance[key]; 
                                    const belt = graduations.find(g => g.id === student.beltId);

                                    return (
                                        <div key={student.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img 
                                                        src={student.imageUrl || `https://ui-avatars.com/api/?name=${student.name}`} 
                                                        alt={student.name} 
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                    />
                                                    {currentStatus === 'present' && (
                                                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700 text-sm">{student.name}</p>
                                                    {belt && (
                                                        <div className="flex items-center mt-0.5">
                                                            <div className="w-6 h-1.5 rounded-sm mr-1.5 border border-slate-200" style={getBeltStyle(belt)}></div>
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{belt.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleStatusChange(student.id, schedule.id, 'present')}
                                                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                                                        currentStatus === 'present' 
                                                            ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' 
                                                            : 'bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600'
                                                    }`}
                                                    title="Presente"
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(student.id, schedule.id, 'absent')}
                                                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                                                        currentStatus === 'absent' 
                                                            ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' 
                                                            : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600'
                                                    }`}
                                                    title="Ausente"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {eligibleStudents.length === 0 && (
                                    <div className="p-8 text-center">
                                        <p className="text-slate-400 italic text-sm">Nenhum aluno elegível para esta turma (verifique idade e graduação).</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500">Nenhuma aula agendada para este dia.</p>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Frequência</Button>
            </div>
        </Modal>
    );
};


const CalendarView: React.FC = () => {
    const { schedules } = useContext(AppContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentDate(new Date(year, parseInt(e.target.value), 1));
    };
    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newYear = parseInt(e.target.value);
        if (!isNaN(newYear) && String(newYear).length === 4) {
             setCurrentDate(new Date(newYear, month, 1));
        }
    };

    const calendarCells = useMemo(() => {
        const cells = [];
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        // Previous month days
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            cells.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }

        // Next month days
        const remaining = 42 - cells.length; // Fill up to 6 weeks
        for (let i = 1; i <= remaining; i++) {
            cells.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        }
        return cells;
    }, [year, month]);

    const getDaySchedules = (date: Date) => {
        const dayName = DAYS_OF_WEEK_MAP[date.getDay()];
        return schedules.filter(s => s.dayOfWeek === dayName).sort((a,b) => a.startTime.localeCompare(b.startTime));
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <Card>
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 capitalize w-40 text-center">
                        {MONTH_NAMES[month]} {year}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <select
                        value={month}
                        onChange={handleMonthChange}
                        className="bg-white text-slate-700 p-2 rounded-md border border-slate-300 focus:ring-primary text-sm"
                    >
                        {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <input
                        type="number"
                        value={year}
                        onChange={handleYearChange}
                        className="bg-white text-slate-700 p-2 rounded-md border border-slate-300 focus:ring-primary w-20 text-center text-sm"
                        placeholder="Ano"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-7 text-center font-bold">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide p-3 border-b border-slate-200">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 border-l border-slate-200">
                {calendarCells.map((cell) => {
                    const daySchedules = cell.isCurrentMonth ? getDaySchedules(cell.date) : [];
                    const hasSchedule = daySchedules.length > 0;
                    const isToday = toYYYYMMDD(cell.date) === toYYYYMMDD(new Date());
                    
                    let cellClasses = "min-h-[120px] p-2 border-b border-r border-slate-200 text-left align-top transition-all relative group flex flex-col";
                    
                    if (!cell.isCurrentMonth) {
                        cellClasses += " bg-slate-50/30 text-slate-400";
                    } else {
                        cellClasses += " bg-white text-slate-700 cursor-pointer hover:bg-slate-50";
                    }

                    return (
                        <div 
                            key={cell.date.toString()}
                            onClick={() => cell.isCurrentMonth && handleDayClick(cell.date)}
                            className={cellClasses}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`font-semibold text-sm inline-block w-7 h-7 text-center leading-7 rounded-full 
                                    ${isToday ? 'bg-primary text-white shadow-sm' : ''}
                                `}>
                                    {cell.day}
                                </span>
                            </div>
                            
                            {hasSchedule && cell.isCurrentMonth && (
                                <div className="mt-2 space-y-1 flex-grow">
                                    {daySchedules.slice(0, 3).map((sched, idx) => (
                                        <div key={idx} className="text-[10px] text-slate-600 bg-amber-50 px-1.5 py-0.5 rounded truncate border border-amber-100 flex items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 flex-shrink-0"></span>
                                            <span className="font-medium">{sched.startTime}</span>
                                            <span className="ml-1 opacity-80 truncate hidden xl:inline">{sched.className}</span>
                                        </div>
                                    ))}
                                    {daySchedules.length > 3 && (
                                        <div className="text-[10px] text-slate-400 pl-1">
                                            + {daySchedules.length - 3} aulas
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {selectedDate && <DayScheduleModal date={selectedDate} onClose={() => setSelectedDate(null)} />}
        </Card>
    );
};


const AttendanceGrid: React.FC<{ student: Student }> = ({ student }) => {
    const { attendanceRecords } = useContext(AppContext);
    const today = new Date();
    // Show last 6 months (approx 180 days)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 180); 

    const recordsByDate = useMemo(() => {
        const map = new Map<string, 'present' | 'absent'>();
        attendanceRecords
            .filter(r => r.studentId === student.id)
            .forEach(r => map.set(r.date, r.status));
        return map;
    }, [attendanceRecords, student.id]);

    const days = [];
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (days.length === 0) return <p>Nenhum dado para exibir.</p>;
    
    return (
        <Card>
            <h3 className="text-lg font-bold text-amber-600 mb-4">Histórico de Presença (Últimos 6 meses)</h3>
            <div className="flex flex-wrap gap-1">
                 {days.map(day => {
                    const dateStr = toYYYYMMDD(day);
                    const status = recordsByDate.get(dateStr);

                    let colorClass = 'bg-slate-100 border border-slate-200'; // Sem registro / Sem cor
                    let title = `${dateStr}: Sem registro`;
                    
                    if (status === 'present') {
                        colorClass = 'bg-green-500 border border-green-600';
                        title = `${dateStr}: Presente`;
                    } else if (status === 'absent') {
                        colorClass = 'bg-red-500 border border-red-600';
                        title = `${dateStr}: Faltou`;
                    }

                    return (
                        <div 
                            key={dateStr} 
                            className={`w-4 h-4 rounded-sm ${colorClass} transition-colors hover:opacity-80`} 
                            title={title} 
                        />
                    );
                 })}
            </div>
             <div className="flex gap-6 mt-6 text-sm items-center text-slate-600 justify-end">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-green-500 border border-green-600"/> Presente</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-red-500 border border-red-600"/> Faltou</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-slate-100 border border-slate-200"/> Sem Registro</div>
             </div>
        </Card>
    );
};


const StudentView: React.FC = () => {
    const { students, graduations, loading } = useContext(AppContext);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">Selecione um Aluno</h2>
                <input 
                    type="text" 
                    placeholder="Buscar aluno..." 
                    className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-amber-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
             {loading ? <p>Carregando alunos...</p> : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                    {filteredStudents.map(student => {
                        const belt = graduations.find(g => g.id === student.beltId);
                        const isSelected = selectedStudent?.id === student.id;
                        return (
                           <div key={student.id} onClick={() => setSelectedStudent(student)}
                            className={`bg-white p-3 rounded-lg shadow-sm cursor-pointer transition-all duration-200 border
                                ${isSelected ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-300'}`}>
                               <div className="flex items-center gap-3">
                                   <img src={student.imageUrl || `https://i.pravatar.cc/150?u=${student.cpf}`} alt={student.name} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover" />
                                   <div className="min-w-0">
                                       <h2 className="font-bold text-slate-800 text-sm truncate">{student.name}</h2>
                                       {belt && (
                                           <div className="mt-1 flex items-center text-xs text-slate-500">
                                               <span className="w-2 h-2 rounded-full mr-1.5" style={getBeltStyle(belt)}></span>
                                               {belt.name}
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                        );
                    })}
                </div>
             )}

            {selectedStudent && (
                <div className="mt-8 animate-fade-in-up">
                    <AttendanceGrid student={selectedStudent} />
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const AttendancePage: React.FC = () => {
    const { user } = useContext(AppContext);
    const isAdmin = user?.role === 'general_admin' || user?.role === 'academy_admin';
    const [view, setView] = useState<'calendar' | 'student'>(isAdmin ? 'calendar' : 'student');


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Controle de Frequência</h1>
                {isAdmin && (
                  <div className="flex gap-2 p-1 bg-slate-200 rounded-lg">
                      <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        onClick={() => setView('calendar')}
                      >
                          Visão Calendário
                      </button>
                      <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'student' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        onClick={() => setView('student')}
                      >
                          Visão por Aluno
                      </button>
                  </div>
                )}
            </div>
            {view === 'calendar' ? <CalendarView /> : <StudentView />}
        </div>
    );
};

export default AttendancePage;
