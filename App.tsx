import React, { useState, useEffect } from 'react';
import { User, Student, Academy, ThemeSettings, AttendanceRecord, ActivityLog, ClassSchedule, Professor, Graduation } from './types';
import { STUDENTS, USERS, MOCK_THEME, GRADUATIONS, SCHEDULES, ACADEMIES, ATTENDANCE_RECORDS, ACTIVITY_LOGS, PROFESSORS } from './constants';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import StudentsPage from './components/StudentsPage';
import { PublicPage } from './components/PublicPage';
import { Financial } from './components/Financial';
import { AICoach } from './components/AICoach';
import SettingsPage from './components/SettingsPage';
import SchedulesPage from './components/SchedulesPage';
import ProfessorsPage from './components/ProfessorsPage';
import GraduationsPage from './components/GraduationsPage';
import AttendancePage from './components/AttendancePage';
import Login from './components/Login';
import { AppContext } from './context/AppContext';

// Simple simulated Router
type Page = 'home' | 'login' | 'dashboard' | 'students' | 'professors' | 'financial' | 'schedule' | 'attendance' | 'graduation' | 'ai-coach' | 'student-schedule' | 'student-financial' | 'student-progress' | 'settings';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // App State (Simulating DB)
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [academies, setAcademies] = useState<Academy[]>(ACADEMIES);
  const [settings, setSettings] = useState<ThemeSettings>(MOCK_THEME);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(ATTENDANCE_RECORDS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(ACTIVITY_LOGS);
  const [schedules, setSchedules] = useState<ClassSchedule[]>(SCHEDULES);
  const [professors, setProfessors] = useState<Professor[]>(PROFESSORS);
  const [graduations, setGraduations] = useState<Graduation[]>(GRADUATIONS);
  
  // Apply dynamic theme variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', settings.primaryColor);
    root.style.setProperty('--theme-secondary', settings.secondaryColor);
    root.style.setProperty('--theme-accent', settings.primaryColor); // Use primary as accent for now
    root.style.setProperty('--theme-bg', settings.backgroundColor);
    root.style.setProperty('--theme-card-bg', settings.cardBackgroundColor);
    root.style.setProperty('--theme-text-primary', settings.secondaryColor); // Dark text typically
  }, [settings]);

  // Auth Logic
  const login = async (emailOrCpf: string, pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 1. Check Users (Admins)
    let foundUser = users.find(u => u.email === emailOrCpf);
    
    // 2. Check Students (Student Portal)
    if (!foundUser) {
        const foundStudent = students.find(s => s.email === emailOrCpf || s.cpf === emailOrCpf);
        if (foundStudent) {
            foundUser = {
                id: `user_${foundStudent.id}`,
                name: foundStudent.name,
                email: foundStudent.email,
                role: 'student',
                academyId: foundStudent.academyId,
                studentId: foundStudent.id,
                birthDate: foundStudent.birthDate
            };
        }
    }

    if (foundUser) {
      setCurrentUser(foundUser);
      setPage(foundUser.role === 'student' ? 'dashboard' : 'dashboard');
      setActivityLogs(prev => [{
          id: Date.now().toString(),
          actorId: foundUser!.id,
          action: 'Login',
          timestamp: new Date().toISOString(),
          details: 'Login realizado com sucesso.'
      }, ...prev]);
    } else {
      throw new Error('Usuário não encontrado');
    }
  };

  const loginGoogle = async (credential: string) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Mock Google Login: Just logs in as the first admin
      const user = users[0];
      if (user) {
          setCurrentUser(user);
          setPage('dashboard');
      }
  };

  const registerAcademy = async (data: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newAcademyId = `academy_${Date.now()}`;
      const newAcademy: Academy = {
          id: newAcademyId,
          name: data.name,
          address: data.address,
          responsible: data.responsible,
          responsibleRegistration: data.responsibleRegistration,
          email: data.email,
          password: data.password 
      };
      
      const newUser: User = {
          id: `user_${Date.now()}`,
          name: data.responsible,
          email: data.email,
          role: 'academy_admin',
          academyId: newAcademyId
      };

      setAcademies(prev => [...prev, newAcademy]);
      setUsers(prev => [...prev, newUser]);
      
      // Auto login
      setCurrentUser(newUser);
      setPage('dashboard');

      return { success: true };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('home');
  };

  // Data Logic
  const updateStudentPayment = async (studentId: string, status: 'paid' | 'unpaid') => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              const newHistory = status === 'paid' && s.paymentStatus !== 'paid'
                 ? [...(s.paymentHistory || []), { id: Date.now().toString(), studentId: s.id, date: new Date().toISOString(), amount: settings.monthlyFeeAmount }] 
                 : s.paymentHistory;
              
              return { ...s, paymentStatus: status, paymentHistory: newHistory };
          }
          return s;
      }));
  };

  const saveStudent = async (studentData: any) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (studentData.id) {
          setStudents(prev => prev.map(s => s.id === studentData.id ? { ...s, ...studentData } : s));
      } else {
          const newStudent = { 
              ...studentData, 
              id: `student_${Date.now()}`, 
              paymentStatus: 'paid', 
              paymentHistory: [] 
          };
          setStudents(prev => [...prev, newStudent]);
      }
  };

  const deleteStudent = async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents(prev => prev.filter(s => s.id !== id));
  };

  const saveSchedule = async (scheduleData: any) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (scheduleData.id) {
          setSchedules(prev => prev.map(s => s.id === scheduleData.id ? { ...s, ...scheduleData } : s));
      } else {
          const newSchedule = { ...scheduleData, id: `schedule_${Date.now()}` };
          setSchedules(prev => [...prev, newSchedule]);
      }
  };

  const deleteSchedule = async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const saveProfessor = async (profData: any) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (profData.id) {
          setProfessors(prev => prev.map(p => p.id === profData.id ? { ...p, ...profData } : p));
      } else {
          const newProf = { ...profData, id: `prof_${Date.now()}` };
          setProfessors(prev => [...prev, newProf]);
      }
  };

  const deleteProfessor = async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProfessors(prev => prev.filter(p => p.id !== id));
  };

  const saveGraduation = async (gradData: any) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (gradData.id) {
          setGraduations(prev => prev.map(g => g.id === gradData.id ? { ...g, ...gradData } : g));
      } else {
          const newGrad = { ...gradData, id: `grad_${Date.now()}` };
          setGraduations(prev => [...prev, newGrad]);
      }
  };

  const deleteGraduation = async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setGraduations(prev => prev.filter(g => g.id !== id));
  };

  const updateGraduationRanks = async (items: { id: string, rank: number }[]) => {
      setGraduations(prev => prev.map(g => {
          const item = items.find(i => i.id === g.id);
          return item ? { ...g, rank: item.rank } : g;
      }));
  };

  const saveAttendanceRecord = async (record: any) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      setAttendanceRecords(prev => {
          const existingIndex = prev.findIndex(r => 
              r.studentId === record.studentId && 
              r.scheduleId === record.scheduleId && 
              r.date === record.date
          );

          if (existingIndex >= 0) {
              const newRecords = [...prev];
              newRecords[existingIndex] = { ...newRecords[existingIndex], status: record.status };
              return newRecords;
          } else {
              return [...prev, { ...record, id: `att_${Date.now()}_${Math.random().toString(36).substr(2,9)}` }];
          }
      });
  };

  const contextValue = {
      user: currentUser,
      users,
      students,
      academies,
      schedules,
      graduations,
      professors,
      themeSettings: settings,
      attendanceRecords,
      activityLogs,
      loading: false,
      saveStudent,
      deleteStudent,
      updateStudentPayment,
      setThemeSettings: setSettings,
      saveSchedule,
      deleteSchedule,
      saveProfessor,
      deleteProfessor,
      saveGraduation,
      deleteGraduation,
      updateGraduationRanks,
      saveAttendanceRecord,
      login,
      loginGoogle,
      registerAcademy
  };

  // Router Logic
  const renderContent = () => {
    if (!currentUser) {
        if (page === 'login') {
             return (
                 <AppContext.Provider value={contextValue}>
                    <Login />
                 </AppContext.Provider>
             );
        }
        return <PublicPage settings={settings} schedules={SCHEDULES} onLoginClick={() => setPage('login')} />;
    }

    return (
      <AppContext.Provider value={contextValue}>
          <Layout user={currentUser} onLogout={handleLogout} onNavigate={(p) => setPage(p as Page)} currentPage={page}>
            {page === 'dashboard' && (
                <Dashboard 
                    user={currentUser} 
                    students={students} 
                    users={users} 
                    schedules={schedules} 
                    graduations={graduations}
                    themeSettings={settings}
                    updateStudentPayment={updateStudentPayment}
                />
            )}
            {page === 'students' && <StudentsPage />}
            {page === 'professors' && <ProfessorsPage />}
            {page === 'financial' && (
                <Financial 
                    students={students} 
                    user={currentUser}
                    graduations={graduations}
                    themeSettings={settings} 
                    setThemeSettings={setSettings}
                    updateStudentPayment={updateStudentPayment}
                />
            )}
            {page === 'schedule' && <SchedulesPage />}
            {page === 'attendance' && <AttendancePage />}
            {page === 'graduation' && <GraduationsPage />}
            {page === 'ai-coach' && <AICoach students={students} />}
            {page === 'settings' && <SettingsPage />}
            
            {(page === 'student-schedule') && <SchedulesPage />}
          </Layout>
      </AppContext.Provider>
    );
  };

  return renderContent();
};

export default App;