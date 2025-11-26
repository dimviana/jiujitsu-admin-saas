import React, { useEffect } from 'react';
import { Student, User, Academy, Graduation, ClassSchedule, ThemeSettings, AttendanceRecord, ActivityLog, Professor } from '../types';
import { MOCK_THEME } from '../constants';

type NotificationType = { message: string; details: string; type: 'error' | 'success' };

interface AppContextType {
    user: User | null;
    users: User[];
    students: Student[];
    academies: Academy[];
    schedules: ClassSchedule[];
    graduations: Graduation[];
    professors: Professor[];
    themeSettings: ThemeSettings;
    attendanceRecords: AttendanceRecord[];
    activityLogs: ActivityLog[];
    loading: boolean;
    notification: NotificationType | null;
    setNotification: (notification: NotificationType | null) => void;
    
    saveStudent: (student: Omit<Student, 'id' | 'paymentStatus' | 'lastSeen' | 'paymentHistory'> & { id?: string }) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    updateStudentPayment: (id: string, status: 'paid' | 'unpaid') => Promise<void>;
    setThemeSettings: (settings: ThemeSettings) => void;
    saveSchedule: (schedule: Omit<ClassSchedule, 'id'> & { id?: string }) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    saveProfessor: (professor: Omit<Professor, 'id'> & { id?: string }) => Promise<void>;
    deleteProfessor: (id: string) => Promise<void>;
    saveGraduation: (graduation: Omit<Graduation, 'id'> & { id?: string }) => Promise<void>;
    deleteGraduation: (id: string) => Promise<void>;
    updateGraduationRanks: (items: { id: string, rank: number }[]) => Promise<void>;
    saveAttendanceRecord: (record: Partial<AttendanceRecord> & { studentId: string; scheduleId: string; date: string; status: 'present' | 'absent' }) => Promise<void>;

    login: (email: string, pass: string) => Promise<void>;
    loginGoogle: (credential: string) => Promise<void>;
    registerAcademy: (data: any) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

export const AppContext = React.createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = React.useState<User | null>(null);
    const [students, setStudents] = React.useState<Student[]>([]);
    const [users, setUsers] = React.useState<User[]>([]);
    const [academies, setAcademies] = React.useState<Academy[]>([]);
    const [schedules, setSchedules] = React.useState<ClassSchedule[]>([]);
    const [graduations, setGraduations] = React.useState<Graduation[]>([]);
    const [professors, setProfessors] = React.useState<Professor[]>([]);
    const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceRecord[]>([]);
    const [activityLogs, setActivityLogs] = React.useState<ActivityLog[]>([]);
    const [themeSettings, setLocalThemeSettings] = React.useState<ThemeSettings>(MOCK_THEME);
    const [loading, setLoading] = React.useState(false);
    const [notification, setNotification] = React.useState<NotificationType | null>(null);

    const refreshData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/initial-data');
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students);
                setUsers(data.users);
                setAcademies(data.academies);
                setGraduations(data.graduations);
                setProfessors(data.professors);
                setSchedules(data.schedules);
                setAttendanceRecords(data.attendanceRecords);
                setActivityLogs(data.activityLogs);
                if (data.themeSettings && data.themeSettings.id) {
                    setLocalThemeSettings(data.themeSettings);
                }
            }
        } catch (error) {
            console.error("Failed to fetch initial data", error);
            setNotification({ message: 'Erro de Rede', details: 'Não foi possível carregar os dados do sistema.', type: 'error'});
        }
        setLoading(false);
    };

    useEffect(() => {
        refreshData();
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', themeSettings.primaryColor);
        root.style.setProperty('--theme-secondary', themeSettings.secondaryColor);
        root.style.setProperty('--theme-accent', themeSettings.primaryColor);
        root.style.setProperty('--theme-bg', themeSettings.backgroundColor);
        root.style.setProperty('--theme-card-bg', themeSettings.cardBackgroundColor);
        root.style.setProperty('--theme-text-primary', themeSettings.secondaryColor);
    }, [themeSettings]);

    const login = async (email: string, pass: string) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                await refreshData();
                setNotification({ message: `Bem-vindo, ${data.user.name.split(' ')[0]}!`, details: 'Login realizado com sucesso.', type: 'success' });
            } else {
                const err = await res.json();
                throw new Error(err.message || 'Login falhou');
            }
        } catch(e: any) {
            setNotification({ message: 'Erro de Login', details: e.message, type: 'error' });
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
                await login(data.email, data.password);
                 setNotification({ message: 'Cadastro Realizado', details: 'Sua academia foi cadastrada com sucesso!', type: 'success' });
                return { success: true };
            } else {
                 const err = await res.json();
                 throw new Error(err.message || 'Erro no cadastro');
            }
        } catch (e: any) {
             setNotification({ message: 'Erro no Cadastro', details: e.message, type: 'error' });
            return { success: false, message: e.message };
        }
    };

    const logout = () => {
        setUser(null);
        setNotification({ message: 'Até logo!', details: 'Você saiu do sistema com segurança.', type: 'success' });
    };

    const handleApiCall = async (endpoint: string, method: string, body: any, successMessage: string) => {
        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Operação falhou');
            }
            setNotification({ message: 'Sucesso!', details: successMessage, type: 'success' });
            await refreshData();
        } catch (e: any) {
            setNotification({ message: 'Erro na Operação', details: e.message, type: 'error' });
        }
    };

    const saveStudent = (studentData: any) => handleApiCall('/api/students', 'POST', studentData, 'Aluno salvo com sucesso.');
    const deleteStudent = (id: string) => handleApiCall(`/api/students/${id}`, 'DELETE', null, 'Aluno removido com sucesso.');
    const updateStudentPayment = (id: string, status: 'paid' | 'unpaid') => handleApiCall('/api/students/payment', 'POST', { studentId: id, status, amount: themeSettings.monthlyFeeAmount }, 'Status de pagamento atualizado.');
    const setThemeSettings = (settings: ThemeSettings) => handleApiCall('/api/settings', 'POST', settings, 'Configurações salvas com sucesso.');
    const saveSchedule = (schedule: any) => handleApiCall('/api/schedules', 'POST', schedule, 'Horário salvo com sucesso.');
    const deleteSchedule = (id: string) => handleApiCall(`/api/schedules/${id}`, 'DELETE', null, 'Horário removido com sucesso.');
    const saveProfessor = (professor: any) => handleApiCall('/api/professors', 'POST', professor, 'Professor salvo com sucesso.');
    const deleteProfessor = (id: string) => handleApiCall(`/api/professors/${id}`, 'DELETE', null, 'Professor removido com sucesso.');
    const saveGraduation = (graduation: any) => handleApiCall('/api/graduations', 'POST', { ...graduation, id: graduation.id || `grad_${Date.now()}`}, 'Graduação salva com sucesso.');
    const deleteGraduation = (id: string) => handleApiCall(`/api/graduations/${id}`, 'DELETE', null, 'Graduação removida com sucesso.');
    const updateGraduationRanks = (items: { id: string, rank: number }[]) => handleApiCall('/api/graduations/reorder', 'POST', items, 'Ordem das graduações atualizada.');
    const saveAttendanceRecord = (record: any) => handleApiCall('/api/attendance', 'POST', { ...record, id: record.id || `att_${Date.now()}_${Math.random().toString(36).substr(2,9)}` }, 'Frequência salva com sucesso.');

    return (
        <AppContext.Provider value={{
            user, users, students, academies, schedules, graduations, professors,
            themeSettings, attendanceRecords, activityLogs, loading, notification, setNotification,
            saveStudent, deleteStudent, updateStudentPayment, setThemeSettings,
            saveSchedule, deleteSchedule, saveProfessor, deleteProfessor,
            saveGraduation, deleteGraduation, updateGraduationRanks, saveAttendanceRecord,
            login, loginGoogle, registerAcademy, logout
        }}>
            {children}
        </AppContext.Provider>
    );
};