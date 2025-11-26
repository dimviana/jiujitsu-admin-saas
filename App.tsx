import React, { useState, useContext } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
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
import { SCHEDULES } from './constants'; // Fallback for Public Page before context loads

type Page = 'home' | 'login' | 'dashboard' | 'students' | 'professors' | 'financial' | 'schedule' | 'attendance' | 'graduation' | 'ai-coach' | 'student-schedule' | 'student-financial' | 'student-progress' | 'settings';

const AppContent: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const { user, themeSettings, students, users, schedules, graduations, updateStudentPayment, logout } = useContext(AppContext);

  // If not logged in
  if (!user) {
      if (page === 'login') {
          return <Login />;
      }
      // Public Page shows partial data or loading
      return <PublicPage settings={themeSettings} schedules={schedules.length ? schedules : SCHEDULES} onLoginClick={() => setPage('login')} />;
  }

  // Logged in layout
  return (
      <Layout user={user} onLogout={() => { logout(); setPage('home'); }} onNavigate={(p) => setPage(p as Page)} currentPage={page}>
        {page === 'dashboard' && (
            <Dashboard 
                user={user} 
                students={students} 
                users={users} 
                schedules={schedules} 
                graduations={graduations}
                themeSettings={themeSettings}
                updateStudentPayment={updateStudentPayment}
            />
        )}
        {page === 'students' && <StudentsPage />}
        {page === 'professors' && <ProfessorsPage />}
        {page === 'financial' && (
            <Financial 
                students={students} 
                user={user}
                graduations={graduations}
                themeSettings={themeSettings} 
                setThemeSettings={() => {}} // Handled in component
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
  );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

export default App;