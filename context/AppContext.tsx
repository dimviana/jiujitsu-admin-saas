import React, { useEffect } from 'react';
import { Student, User, Academy, Graduation, ClassSchedule, ThemeSettings, AttendanceRecord, ActivityLog, Professor } from '../types';
import { MOCK_THEME } from '../constants';

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
    
    // Data Management
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

    // Authentication
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
        }
        setLoading(false);
    };

    useEffect(() => {
        // Initial fetch
        refreshData();
    }, []);

    useEffect(() => {
        // Apply dynamic theme
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', themeSettings.primaryColor);
        root.style.setProperty('--theme-secondary', themeSettings.secondaryColor);
        root.style.setProperty('--theme-accent', themeSettings.primaryColor);
        root.style.setProperty('--theme-bg', themeSettings.backgroundColor);
        root.style.setProperty('--theme-card-bg', themeSettings.cardBackgroundColor);
        root.style.setProperty('--theme-text-primary', themeSettings.secondaryColor);
    }, [themeSettings]);

    const login = async (email: string, pass: string) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            await refreshData(); // Refresh to get user-specific data if needed
        } else {
            const err = await res.json();
            throw new Error(err.message || 'Login falhou');
        }
    };

    const loginGoogle = async (credential: string) => {
        // Simulating Google Login via backend if implemented, or just logging in master for now
        // Real implementation would send token to backend verification
        await login('androiddiviana@gmail.com', 'mock_google');
    };

    const registerAcademy = async (data: any) => {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            // Auto login after register
            await login(data.email, data.password);
            return { success: true };
        } else {
            return { success: false, message: 'Erro no cadastro' };
        }
    };

    const logout = () => setUser(null);

    // --- Data Methods ---

    const saveStudent = async (studentData: any) => {
        await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        await refreshData();
    };

    const deleteStudent = async (id: string) => {
        await fetch(`/api/students/${id}`, { method: 'DELETE' });
        await refreshData();
    };

    const updateStudentPayment = async (id: string, status: 'paid' | 'unpaid') => {
        await fetch('/api/students/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: id, status, amount: themeSettings.monthlyFeeAmount })
        });
        await refreshData();
    };

    const setThemeSettings = async (settings: ThemeSettings) => {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        setLocalThemeSettings(settings); // Optimistic update
    };

    const saveSchedule = async (schedule: any) => {
        await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule)
        });
        await refreshData();
    };

    const deleteSchedule = async (id: string) => {
        await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
        await refreshData();
    };

    const saveProfessor = async (professor: any) => {
        await fetch('/api/professors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(professor)
        });
        await refreshData();
    };

    const deleteProfessor = async (id: string) => {
        await fetch(`/api/professors/${id}`, { method: 'DELETE' });
        await refreshData();
    };

    const saveGraduation = async (graduation: any) => {
        await fetch('/api/graduations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(graduation)
        });
        await refreshData();
    };

    const deleteGraduation = async (id: string) => {
        await fetch(`/api/graduations/${id}`, { method: 'DELETE' });
        await refreshData();
    };

    const updateGraduationRanks = async (items: { id: string, rank: number }[]) => {
        await fetch('/api/graduations/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items)
        });
        await refreshData();
    };

    const saveAttendanceRecord = async (record: any) => {
        await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...record, id: record.id || `att_${Date.now()}_${Math.random().toString(36).substr(2,9)}` })
        });
        await refreshData();
    };

    return (
        <AppContext.Provider value={{
            user, users, students, academies, schedules, graduations, professors,
            themeSettings, attendanceRecords, activityLogs, loading,
            saveStudent, deleteStudent, updateStudentPayment, setThemeSettings,
            saveSchedule, deleteSchedule, saveProfessor, deleteProfessor,
            saveGraduation, deleteGraduation, updateGraduationRanks, saveAttendanceRecord,
            login, loginGoogle, registerAcademy, logout
        }}>
            {children}
        </AppContext.Provider>
    );
};
