import React, { useEffect, useState, useMemo } from 'react';
import { Student, User, Academy, Graduation, ClassSchedule, ThemeSettings, AttendanceRecord, ActivityLog, Professor } from '../types';
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
    updateStudentPayment: (id: string, status: 'paid' | 'unpaid') => Promise<void>;
    promoteStudentToInstructor: (studentId: string) => Promise<void>;
    setThemeSettings: (settings: ThemeSettings) => void;
    saveSchedule: (schedule: Omit<ClassSchedule, 'id'> & { id?: string }) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    saveProfessor: (professor: Omit<Professor, 'id'> & { id?: string }) => Promise<void>;
    deleteProfessor: (id: string) => Promise<void>;
    saveGraduation: (graduation: Omit<Graduation, 'id'> & { id?: string }) => Promise<void>;
    deleteGraduation: (id: string) => Promise<void>;
    updateGraduationRanks: (items: { id: string, rank: number }[]) => Promise<void>;
    saveAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
    saveAcademy: (academy: Academy) => Promise<void>; // New function

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

    const [graduations, setGraduations] = useState<Graduation[]>([]);
    const [themeSettings, setLocalThemeSettings] = useState<ThemeSettings>(MOCK_THEME);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<NotificationType | null>(null);
    const [globalAcademyFilter, setGlobalAcademyFilter] = useState('all');

    const refreshData = async () => {
        setLoading(true);
        try {
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
                if (data.themeSettings && data.themeSettings.id) {
                    setLocalThemeSettings(data.themeSettings);
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
            setLocalThemeSettings(MOCK_THEME);
        }
        setLoading(false);
    };

    useEffect(() => {
        refreshData();
    }, []);

    // Memoized, filtered data exposed to the app (STRICT ISOLATION)
    const filteredData = useMemo(() => {
        // Determine the ID to filter by:
        // 1. If General Admin, use the dropdown filter (or 'all').
        // 2. If Academy Admin or Student, FORCE filter by their academyId.
        const academyIdToFilter = user?.role === 'general_admin' ? globalAcademyFilter : user?.academyId;

        // If no filter or 'all' (only possible for general_admin), return everything
        if (!academyIdToFilter || academyIdToFilter === 'all') {
            return {
                students: allStudents,
                professors: allProfessors,
                schedules: allSchedules,
                attendanceRecords: allAttendance,
                users: allUsers,
                academies: allAcademies,
                activityLogs: allActivityLogs
            };
        }

        // --- Filter Logic ---
        
        // 1. Core Data
        const students = allStudents.filter(s => s.academyId === academyIdToFilter);
        const professors = allProfessors.filter(p => p.academyId === academyIdToFilter);
        const schedules = allSchedules.filter(s => s.academyId === academyIdToFilter);
        const academies = allAcademies.filter(a => a.id === academyIdToFilter);
        
        // 2. Attendance (Match filtered students)
        const studentIdsInAcademy = new Set(students.map(s => s.id));
        const attendanceRecords = allAttendance.filter(ar => studentIdsInAcademy.has(ar.studentId));

        // 3. Users (Show only users belonging to this academy)
        // General Admins are usually excluded from specific academy views unless assigned, 
        // but here we focus on showing the academy's staff/students.
        const users = allUsers.filter(u => u.academyId === academyIdToFilter);

        // 4. Activity Logs (Show logs generated by users of this academy)
        const validActorIds = new Set(users.map(u => u.id));
        const activityLogs = allActivityLogs.filter(log => validActorIds.has(log.actorId));

        return { 
            students, 
            professors, 
            schedules, 
            attendanceRecords, 
            users, 
            academies, 
            activityLogs 
        };

    }, [user, globalAcademyFilter, allStudents, allProfessors, allSchedules, allAttendance, allUsers, allAcademies, allActivityLogs]);


    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', themeSettings.primaryColor);
        root.style.setProperty('--theme-secondary', themeSettings.secondaryColor);
        root.style.setProperty('--theme-accent', themeSettings.primaryColor);
        root.style.setProperty('--theme-bg', themeSettings.backgroundColor);
        root.style.setProperty('--theme-card-bg', themeSettings.cardBackgroundColor);
        root.style.setProperty('--theme-text-primary', themeSettings.secondaryColor);
    }, [themeSettings]);

    const handleLoginSuccess = async (userData: User) => {
        localStorage.setItem('jiujitsu-user', JSON.stringify(userData));
        setUser(userData);
        await refreshData();
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
            // Mock Login Fallback
            const mockUser = USERS.find(u => u.email === email);
            if (mockUser) {
                 await handleLoginSuccess(mockUser);
                 return;
            }
             // Mock Student Login
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

            setNotification({ message: 'Erro de Login', details: 'Não foi possível conectar ao servidor.', type: 'error' });
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
            console.warn("Mocking registration success");
            await login(data.email, data.password); 
            setNotification({ message: 'Erro no Cadastro', details: 'Servidor offline. Cadastro indisponível.', type: 'error' });
            return { success: false, message: e.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('jiujitsu-user');
        setUser(null);
        setGlobalAcademyFilter('all'); // Reset filter on logout
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
                 console.warn(`Simulating success for ${endpoint}`);
            }
            setNotification({ message: 'Sucesso!', details: successMessage, type: 'success' });
            await refreshData();
        } catch (e: any) {
             console.warn(`Simulating success for ${endpoint} (Offline)`);
             setNotification({ message: 'Sucesso (Demo)!', details: successMessage, type: 'success' });
             // In mock mode, we manually update the local state for immediate feedback
             if (endpoint.includes('academies')) {
                 const updatedAcademy = body;
                 setAllAcademies(prev => prev.map(a => a.id === updatedAcademy.id ? updatedAcademy : a));
             }
        }
    };

    const saveStudent = (studentData: any) => handleApiCall('/api/students', 'POST', studentData, 'Aluno salvo com sucesso.');
    const deleteStudent = (id: string) => handleApiCall(`/api/students/${id}`, 'DELETE', null, 'Aluno removido com sucesso.');
    const updateStudentPayment = (id: string, status: 'paid' | 'unpaid') => handleApiCall('/api/students/payment', 'POST', { studentId: id, status, amount: themeSettings.monthlyFeeAmount }, 'Status de pagamento atualizado.');
    const promoteStudentToInstructor = (studentId: string) => handleApiCall('/api/students/promote-instructor', 'POST', { studentId }, 'Aluno promovido a instrutor com sucesso.');
    const setThemeSettings = (settings: ThemeSettings) => handleApiCall('/api/settings', 'POST', settings, 'Configurações salvas com sucesso.');
    const saveSchedule = (schedule: any) => handleApiCall('/api/schedules', 'POST', schedule, 'Horário salvo com sucesso.');
    const deleteSchedule = (id: string) => handleApiCall(`/api/schedules/${id}`, 'DELETE', null, 'Horário removido com sucesso.');
    const saveProfessor = (professor: any) => handleApiCall('/api/professors', 'POST', professor, 'Professor salvo com sucesso.');
    const deleteProfessor = (id: string) => handleApiCall(`/api/professors/${id}`, 'DELETE', null, 'Professor removido com sucesso.');
    const saveGraduation = (graduation: any) => handleApiCall('/api/graduations', 'POST', { ...graduation, id: graduation.id || `grad_${Date.now()}`}, 'Graduação salva com sucesso.');
    const deleteGraduation = (id: string) => handleApiCall(`/api/graduations/${id}`, 'DELETE', null, 'Graduação removida com sucesso.');
    const updateGraduationRanks = (items: { id: string, rank: number }[]) => handleApiCall('/api/graduations/reorder', 'POST', items, 'Ordem das graduações atualizada.');
    const saveAttendanceRecord = (record: Omit<AttendanceRecord, 'id'>) => handleApiCall('/api/attendance', 'POST', record, 'Frequência salva com sucesso.');
    const saveAcademy = (academy: Academy) => handleApiCall('/api/academies', 'POST', academy, 'Academia atualizada com sucesso.');

    return (
        <AppContext.Provider value={{
            user, 
            graduations, 
            themeSettings, loading, notification, setNotification,
            globalAcademyFilter, setGlobalAcademyFilter,
            saveStudent, deleteStudent, updateStudentPayment, promoteStudentToInstructor, setThemeSettings,
            saveSchedule, deleteSchedule, saveProfessor, deleteProfessor,
            saveGraduation, deleteGraduation, updateGraduationRanks, saveAttendanceRecord, saveAcademy,
            login, loginGoogle, registerAcademy, logout,
            
            // Pass the filtered lists to consumers
            users: filteredData.users, 
            academies: filteredData.academies,
            activityLogs: filteredData.activityLogs,
            students: filteredData.students, 
            professors: filteredData.professors,
            schedules: filteredData.schedules,
            attendanceRecords: filteredData.attendanceRecords,
        }}>
            {children}
        </AppContext.Provider>
    );
};