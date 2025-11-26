import React, { useState, useContext, useEffect } from 'react';
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
import { SCHEDULES } from './constants'; // Fallback
import Notification from './components/ui/Notification';
import ProfilePage from './components/ProfilePage';

type Page = 'home' | 'login' | 'dashboard' | 'students' | 'professors' | 'financial' | 'schedule' | 'attendance' | 'graduation' | 'ai-coach' | 'settings' | 'profile';

const AppContent: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const { user, themeSettings, students, users, schedules, graduations, updateStudentPayment, logout, notification, setNotification } = useContext(AppContext);

  // Redirecionar para dashboard após login
  useEffect(() => {
    if (user && (page === 'home' || page === 'login')) {
        setPage('dashboard');
    }
  }, [user, page]);

  const renderPage = () => {
      // Not logged in logic
      if (!user) {
          if (page === 'login') {
              return <Login />;
          }
          if (themeSettings.publicPageEnabled) {
             return <PublicPage settings={themeSettings} schedules={schedules.length ? schedules : SCHEDULES} onLoginClick={() => setPage('login')} />;
          }
          return <Login />;
      }
      // Logged in logic
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
            {page === 'financial' && <Financial />}
            {page === 'schedule' && <SchedulesPage />}
            {page === 'attendance' && <AttendancePage />}
            {page === 'graduation' && <GraduationsPage />}
            {page === 'ai-coach' && <AICoach students={students} />}
            {page === 'settings' && <SettingsPage />}
            {page === 'profile' && <ProfilePage />}
          </Layout>
      );
  }

  return (
    <>
      {notification && <Notification notification={notification} onClose={() => setNotification(null)} />}
      {renderPage()}
    </>
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