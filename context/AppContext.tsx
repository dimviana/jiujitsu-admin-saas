import React from 'react';
import { Student, User, Academy, Graduation, ClassSchedule, ThemeSettings, AttendanceRecord, ActivityLog, Professor } from '../types';

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
}

export const AppContext = React.createContext<AppContextType>({} as AppContextType);