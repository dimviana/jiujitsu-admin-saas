
import React, { useEffect, useState, useMemo } from 'react';
import { Student, User, Academy, Graduation, ClassSchedule, ThemeSettings, AttendanceRecord, ActivityLog, Professor, SystemEvent, Expense } from '../types';
import { 
  MOCK_THEME, STUDENTS, USERS, ACADEMIES, GRADUATIONS, 
  PROFESSORS, SCHEDULES, ATTENDANCE_RECORDS, ACTIVITY_LOGS 
} from '../constants';

type NotificationType = { message: string; details: string; type: 'error' | 'success' };

interface AppContextType {
    user: User | null;
    users: User[];
    students: Student[];
    academies: Academy[];
    schedules: ClassSchedule[];
    graduations: Graduation[];
    professors: Professor[];
    events: SystemEvent[];
    expenses: Expense[];
    themeSettings: ThemeSettings;
    attendanceRecords: AttendanceRecord[];
    activityLogs: ActivityLog[];
    loading: boolean;
    notification: NotificationType | null;
    setNotification: (notification: NotificationType | null) => void;
    globalAcademyFilter: string;
    setGlobalAcademyFilter: (filter: string) => void;
    
    saveStudent: (student: Omit<Student, 'id' | 'paymentStatus' | 'lastSeen' | 'paymentHistory'> & { id?: string }) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    updateStudentPayment: (id: string, status: 'paid' | 'unpaid' | 'scholarship') => Promise<void>;
    promoteStudentToInstructor: (studentId: string) => Promise<void>;
    demoteInstructor: (professorId: string) => Promise<void>;
    updateStudentStatus: (id: string, status: 'active' | 'blocked') => Promise<void>;
    setThemeSettings: (settings: ThemeSettings) => void;
    saveSchedule: (schedule: Omit<ClassSchedule, 'id'> & { id?: string }) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    saveProfessor: (professor: Omit<Professor, 'id'> & { id?: string }) => Promise<void>;
    deleteProfessor: (id: string) => Promise<void>;
    updateProfessorStatus: (id: string, status: 'active' | 'blocked') => Promise<void>;
    saveGraduation: (graduation: Omit<Graduation, 'id'> & { id?: string }) => Promise<void>;
    deleteGraduation: (id: string) => Promise<void>;
    updateGraduationRanks: (items: { id: string, rank: number }[]) => Promise<void>;
    saveAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
    saveAcademy: (academy: Academy) => Promise<void>;
    updateAcademyStatus: (id: string, status: 'active' | 'rejected' | 'blocked') => Promise<void>;
    
    // Event Functions
    saveEvent: (event: Omit<SystemEvent, 'id'> & { id?: string }) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    toggleEventStatus: (id: string, active: boolean) => Promise<void>;

    // Expense Functions
    saveExpense: (expense: Omit<Expense, 'id'> & { id?: string }) => Promise<void>;

    login: (email: string, pass: string) => Promise<void>;
    loginGoogle: (credential: string) => Promise<void>;
    registerAcademy: (data: any) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

export const AppContext = React.createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const savedUser = localStorage.getItem('jiujitsu-user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            return null;
        }
    });

    // Raw, unfiltered data from the API
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allProfessors, setAllProfessors] = useState<Professor[]>([]);
    const [allSchedules, setAllSchedules] = useState<ClassSchedule[]>([]);
    const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allAcademies, setAllAcademies] = useState<Academy[]>([]);
    const [allActivityLogs, setAllActivityLogs] = useState<ActivityLog[]>([]);
    const [allEvents, setAllEvents] = useState<SystemEvent[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

    const [graduations, setGraduations] = useState<Graduation[]>([]);
    const [globalThemeSettings, setGlobalThemeSettings] = useState<ThemeSettings>(MOCK_THEME);
    
    // Loading State: True initially to show spinner, false after first data load to allow background updates
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [globalAcademyFilter, setGlobalAcademyFilter] = useState('all');

    const refreshData = async (background = false) => {
        if (!background) setLoading(true);
        
        try {
            // First load data
            const res = await fetch('/api/initial-data');
            if (res.ok) {
                const data = await res.json();
                setAllStudents(data.students);
                setAllUsers(data.users);
                setAllAcademies(data.academies);
                setGraduations(data.graduations);
                setAllProfessors(data.professors);
                setAllSchedules(data.schedules);
                setAllAttendance(data.attendanceRecords);
                setAllActivityLogs(data.activityLogs);
                setAllEvents(data.events || []);
                setAllExpenses(data.expenses || []);
                if (data.themeSettings && data.themeSettings.id) {
                    setGlobalThemeSettings(data.themeSettings);
                }

                // Trigger auto promotion check in background (only once per session or explicit refresh)
                if (user && user.role !== 'student' && !background) {
                    fetch('/api/students/auto-promote-stripes', { method: 'POST' })
                        .then(res => res.json())
                        .then(res => {
                            if (res.success && res.message && !res.message.startsWith('0')) {
                                setNotification({ message: 'Graduações Automáticas', details: res.message, type: 'success' });
                                // Refresh silently to show new stripes
                                refreshData(true);
                            }
                        })
                        .catch(err => console.error("Auto promote error", err));
                }

            } else {
                throw new Error("Failed to fetch data from server");
            }
        } catch (error) {
            console.warn("Backend offline, using mock data.", error);
            // Fallback to mock data
            setAllStudents(STUDENTS);
            setAllUsers(USERS);
            setAllAcademies(ACADEMIES);
            setGraduations(GRADUATIONS);
            setAllProfessors(PROFESSORS);
            setAllSchedules(SCHEDULES);
            setAllAttendance(ATTENDANCE_RECORDS);
            setAllActivityLogs(ACTIVITY_LOGS);
            setGlobalThemeSettings(MOCK_THEME);
            setAllEvents([]);
            setAllExpenses([]);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    // Derived State: Effective Theme Settings
    const effectiveThemeSettings = useMemo(() => {
        if (user && user.role !== 'general_admin' && user.academyId) {
            const myAcademy = allAcademies.find(a => a.id === user.academyId);
            if (myAcademy && myAcademy.settings && Object.keys(myAcademy.settings).length > 0) {
                return { ...globalThemeSettings, ...myAcademy.settings };
            }
        }
        return globalThemeSettings;
    }, [user, allAcademies, globalThemeSettings]);

    // Memoized, filtered data exposed to the app (STRICT ISOLATION)
    const filteredData = useMemo(() => {
        const academyIdToFilter = user?.role === 'general_admin' ? globalAcademyFilter : user?.academyId;

        if (!academyIdToFilter || academyIdToFilter === 'all') {
            return {
                students: allStudents,
                professors: allProfessors,
                schedules: allSchedules,
                attendanceRecords: allAttendance,
                users: allUsers,
                academies: allAcademies,
                activityLogs: allActivityLogs,
                events: allEvents,
                expenses: allExpenses
            };
        }

        const students = allStudents.filter(s => s.academyId === academyIdToFilter);
        const professors = allProfessors.filter(p => p.academyId === academyIdToFilter);
        const schedules = allSchedules.filter(s => s.academyId === academyIdToFilter);
        const academies = allAcademies.filter(a => a.id === academyIdToFilter);
        const events = allEvents.filter(e => e.academyId === academyIdToFilter);
        const expenses = allExpenses.filter(e => e.academyId === academyIdToFilter);
        
        const studentIdsInAcademy = new Set(students.map(s => s.id));
        const attendanceRecords = allAttendance.filter(ar => studentIdsInAcademy.has(ar.studentId));

        const users = allUsers.filter(u => u.academyId === academyIdToFilter);
        
        const validActorIds = new Set(users.map(u => u.id));
        const activityLogs = allActivityLogs.filter(log => validActorIds.has(log.actorId));

        return { 
            students, 
            professors, 
            schedules, 
            attendanceRecords, 
            users, 
            academies, 
            activityLogs,
            events,
            expenses
        };

    }, [user, globalAcademyFilter, allStudents, allProfessors, allSchedules, allAttendance, allUsers, allAcademies, allActivityLogs, allEvents, allExpenses]);

    // Apply Theme (CSS Variables) - Always Force Light/Configured Theme
    useEffect(() => {
        const root = document.documentElement;
        
        // Always apply settings from database/mock (Light mode essentially)
        root.style.setProperty('--theme-primary', effectiveThemeSettings.primaryColor);
        root.style.setProperty('--theme-secondary', effectiveThemeSettings.secondaryColor);
        root.style.setProperty('--theme-accent', effectiveThemeSettings.primaryColor);
        root.style.setProperty('--theme-bg', effectiveThemeSettings.backgroundColor);
        root.style.setProperty('--theme-card-bg', effectiveThemeSettings.cardBackgroundColor);
        root.style.setProperty('--theme-text-primary', effectiveThemeSettings.secondaryColor);
        
        // Ensure no dark class is present
        root.classList.remove('dark');

    }, [effectiveThemeSettings]);

    const handleLoginSuccess = async (userData: User) => {
        localStorage.setItem('jiujitsu-user', JSON.stringify(userData));
        setUser(userData);
        await refreshData(false); // Trigger full refresh on login
        setNotification({ message: `Bem-vindo, ${userData.name.split(' ')[0]}!`, details: 'Login realizado com sucesso.', type: 'success' });
    };
    
    const login = async (email: string, pass: string) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });
            if (res.ok) {
                const data = await res.json();
                await handleLoginSuccess(data.user);
            } else {
                const err = await res.json();
                throw new Error(err.message || 'Login falhou');
            }
        } catch(e: any) {
             // Mock Login Fallback (For offline dev only)
             const mockUser = USERS.find(u => u.email === email);
             if (mockUser) { await handleLoginSuccess(mockUser); return; }
             const mockStudent = STUDENTS.find(s => s.email === email);
             if (mockStudent) {
                 const userObj: User = { 
                     id: `user_${mockStudent.id}`, 
                     name: mockStudent.name, 
                     email: mockStudent.email, 
                     role: 'student', 
                     academyId: mockStudent.academyId, 
                     studentId: mockStudent.id, 
                     birthDate: mockStudent.birthDate 
                 };
                 await handleLoginSuccess(userObj);
                 return;
            }
            throw e;
        }
    };

    const loginGoogle = async () => {
        await login('androiddiviana@gmail.com', 'mock_google');
    };

    const registerAcademy = async (data: any) => {
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                // Do NOT auto login for registration anymore, wait for approval
                // await login(data.email, data.password); 
                setNotification({ message: 'Cadastro Recebido', details: result.message || 'Sua academia foi cadastrada. Aguarde aprovação.', type: 'success' });
                return { success: true };
            } else {
                 const err = await res.json();
                 throw new Error(err.message || 'Erro no cadastro');
            }
        } catch (e: any) {
            console.warn("Mocking registration success");
            // Mock logic
            setNotification({ message: 'Erro no Cadastro', details: 'Servidor offline. Cadastro indisponível.', type: 'error' });
            return { success: false, message: e.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('jiujitsu-user');
        setUser(null);
        setGlobalAcademyFilter('all');
        setNotification({ message: 'Até logo!', details: 'Você saiu do sistema com segurança.', type: 'success' });
    };

    const handleApiCall = async (endpoint: string, method: string, body: any, successMessage: string) => {
        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : null
            });
            if (!res.ok) {
                // If response is not OK, try to parse error message
                const errData = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(errData.message || 'Erro na requisição');
            }
            setNotification({ message: 'Sucesso!', details: successMessage, type: 'success' });
            await refreshData(true); // Background refresh
        } catch (e: any) {
             console.error(`Error in ${endpoint}:`, e);
             setNotification({ message: 'Erro', details: e.message || 'Ocorreu um erro ao processar sua solicitação.', type: 'error' });
        }
    };

    const saveStudent = (studentData: any) => handleApiCall('/api/students', 'POST', studentData, 'Aluno salvo com sucesso.');
    const deleteStudent = (id: string) => handleApiCall(`/api/students/${id}`, 'DELETE', null, 'Aluno removido com sucesso.');
    const updateStudentPayment = (id: string, status: 'paid' | 'unpaid' | 'scholarship') => handleApiCall('/api/students/payment', 'POST', { studentId: id, status, amount: effectiveThemeSettings.monthlyFeeAmount }, 'Status de pagamento atualizado.');
    const promoteStudentToInstructor = (studentId: string) => handleApiCall('/api/students/promote-instructor', 'POST', { studentId }, 'Aluno promovido a instrutor com sucesso.');
    const demoteInstructor = (professorId: string) => handleApiCall('/api/students/demote-instructor', 'POST', { professorId }, 'Promoção de instrutor removida. O aluno retornou ao status normal.');
    const updateStudentStatus = (id: string, status: 'active' | 'blocked') => handleApiCall(`/api/students/${id}/status`, 'POST', { status }, `Status do aluno atualizado para ${status === 'active' ? 'Ativo' : 'Bloqueado'}.`);

    const setThemeSettings = (settings: ThemeSettings) => {
        const queryParams = (user?.role !== 'general_admin' && user?.academyId) ? `?academyId=${user.academyId}` : '';
        handleApiCall(`/api/settings${queryParams}`, 'POST', settings, 'Configurações salvas com sucesso.');
    };

    const saveSchedule = (schedule: any) => handleApiCall('/api/schedules', 'POST', schedule, 'Horário salvo com sucesso.');
    const deleteSchedule = (id: string) => handleApiCall(`/api/schedules/${id}`, 'DELETE', null, 'Horário removido com sucesso.');
    const saveProfessor = (professor: any) => handleApiCall('/api/professors', 'POST', professor, 'Professor salvo com sucesso.');
    const deleteProfessor = (id: string) => handleApiCall(`/api/professors/${id}`, 'DELETE', null, 'Professor removido com sucesso.');
    const updateProfessorStatus = (id: string, status: 'active' | 'blocked') => handleApiCall(`/api/professors/${id}/status`, 'POST', { status }, `Status do professor atualizado para ${status === 'active' ? 'Ativo' : 'Bloqueado'}.`);

    const saveGraduation = (graduation: any) => handleApiCall('/api/graduations', 'POST', { ...graduation, id: graduation.id || `grad_${Date.now()}`}, 'Graduação salva com sucesso.');
    const deleteGraduation = (id: string) => handleApiCall(`/api/graduations/${id}`, 'DELETE', null, 'Graduação removida com sucesso.');
    const updateGraduationRanks = (items: { id: string, rank: number }[]) => handleApiCall('/api/graduations/reorder', 'POST', items, 'Ordem das graduações atualizada.');
    const saveAttendanceRecord = (record: Omit<AttendanceRecord, 'id'>) => handleApiCall('/api/attendance', 'POST', record, 'Frequência salva com sucesso.');
    const saveAcademy = (academy: Academy) => handleApiCall('/api/academies', 'POST', academy, 'Academia atualizada com sucesso.');
    const updateAcademyStatus = (id: string, status: 'active' | 'rejected' | 'blocked') => {
        let action = '';
        if (status === 'active') action = 'aprovada/ativada';
        if (status === 'rejected') action = 'rejeitada';
        if (status === 'blocked') action = 'bloqueada';
        
        return handleApiCall(`/api/academies/${id}/status`, 'POST', { status }, `Academia ${action} com sucesso.`);
    };

    // Event Functions
    const saveEvent = (event: Omit<SystemEvent, 'id'> & { id?: string }) => {
        // Enforce academy ID for non-general admins
        const eventData = { ...event };
        if (user && user.role !== 'general_admin') {
            eventData.academyId = user.academyId;
        }
        return handleApiCall('/api/events', 'POST', eventData, 'Evento salvo com sucesso.');
    };
    const deleteEvent = (id: string) => handleApiCall(`/api/events/${id}`, 'DELETE', null, 'Evento excluído com sucesso.');
    const toggleEventStatus = (id: string, active: boolean) => handleApiCall(`/api/events/${id}/status`, 'POST', { active }, `Evento ${active ? 'ativado' : 'desativado'} com sucesso.`);

    // Expense Functions
    const saveExpense = (expense: Omit<Expense, 'id'> & { id?: string }) => {
        const expenseData = { ...expense };
        if (user && user.role !== 'general_admin') {
            expenseData.academyId = user.academyId || '';
        } else if (!expenseData.academyId && user?.role === 'academy_admin') {
             expenseData.academyId = user.academyId || '';
        }
        
        if (!expenseData.id) {
            expenseData.id = `exp_${Date.now()}`;
        }

        return handleApiCall('/api/expenses', 'POST', expenseData, 'Despesa registrada com sucesso.');
    };

    return (
        <AppContext.Provider value={{
            user, 
            graduations, 
            themeSettings: effectiveThemeSettings, 
            loading, notification, setNotification,
            globalAcademyFilter, setGlobalAcademyFilter,
            saveStudent, deleteStudent, updateStudentPayment, promoteStudentToInstructor, demoteInstructor, updateStudentStatus, setThemeSettings,
            saveSchedule, deleteSchedule, saveProfessor, deleteProfessor, updateProfessorStatus,
            saveGraduation, deleteGraduation, updateGraduationRanks, saveAttendanceRecord, saveAcademy, updateAcademyStatus,
            saveEvent, deleteEvent, toggleEventStatus,
            saveExpense,
            login, loginGoogle, registerAcademy, logout,
            
            users: filteredData.users, 
            academies: filteredData.academies,
            activityLogs: filteredData.activityLogs,
            students: filteredData.students, 
            professors: filteredData.professors,
            schedules: filteredData.schedules,
            attendanceRecords: filteredData.attendanceRecords,
            events: filteredData.events,
            expenses: filteredData.expenses
        }}>
            {children}
        </AppContext.Provider>
    );
};
