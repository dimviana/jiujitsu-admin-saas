
import React, { useState, useContext, useEffect, Suspense, lazy } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import { Layout } from './components/Layout';
// Components that are always needed or very light can remain static
import { EventPopup } from './components/EventPopup';
import { BirthdayNotifications } from './components/BirthdayNotifications';
import Notification from './components/ui/Notification';
import { Loader } from 'lucide-react';

// Lazy Load Pages
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const StudentsPage = lazy(() => import('./components/StudentsPage'));
const PublicPage = lazy(() => import('./components/PublicPage').then(module => ({ default: module.PublicPage })));
const Financial = lazy(() => import('./components/Financial').then(module => ({ default: module.Financial })));
const AICoach = lazy(() => import('./components/AICoach').then(module => ({ default: module.AICoach })));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const SchedulesPage = lazy(() => import('./components/SchedulesPage'));
const ProfessorsPage = lazy(() => import('./components/ProfessorsPage'));
const GraduationsPage = lazy(() => import('./components/GraduationsPage'));
const AttendancePage = lazy(() => import('./components/AttendancePage'));
const Login = lazy(() => import('./components/Login'));
const AcademiesPage = lazy(() => import('./components/AcademiesPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

import { SCHEDULES } from './constants'; // Fallback

type Page = 'home' | 'login' | 'dashboard' | 'students' | 'professors' | 'financial' | 'schedule' | 'attendance' | 'graduation' | 'ai-coach' | 'settings' | 'profile' | 'academies'; 

const PageLoader = () => (
    <div className="h-full flex items-center justify-center p-10">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
    </div>
);

const AppContent: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const { user, themeSettings, students, users, schedules, graduations, updateStudentPayment, logout, notification, setNotification, attendanceRecords } = useContext(AppContext);

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
              return <Suspense fallback={<PageLoader />}><Login /></Suspense>;
          }
          if (themeSettings.publicPageEnabled) {
             return <Suspense fallback={<PageLoader />}><PublicPage settings={themeSettings} schedules={schedules.length ? schedules : SCHEDULES} onLoginClick={() => setPage('login')} /></Suspense>;
          }
          return <Suspense fallback={<PageLoader />}><Login /></Suspense>;
      }
      // Logged in logic
      return (
          <Layout user={user} onLogout={() => { logout(); setPage('home'); }} onNavigate={(p) => setPage(p as Page)} currentPage={page}>
            {/* Global Popups */}
            <EventPopup />
            <BirthdayNotifications />
            
            <Suspense fallback={<PageLoader />}>
                {page === 'dashboard' && (
                    user.role === 'student' ? (
                        <StudentDashboard 
                            user={user}
                            students={students} 
                            graduations={graduations} 
                            schedules={schedules} 
                            themeSettings={themeSettings} 
                            updateStudentPayment={updateStudentPayment} 
                        />
                    ) : (
                        <Dashboard 
                            user={user} 
                            students={students} 
                            users={users} 
                            schedules={schedules} 
                            graduations={graduations}
                            themeSettings={themeSettings}
                            updateStudentPayment={updateStudentPayment}
                            attendanceRecords={attendanceRecords}
                        />
                    )
                )}
                {page === 'students' && <StudentsPage />}
                {page === 'professors' && <ProfessorsPage />}
                {page === 'academies' && <AcademiesPage />} 
                {page === 'financial' && <Financial />}
                {page === 'schedule' && <SchedulesPage />}
                {page === 'attendance' && <AttendancePage />}
                {page === 'graduation' && <GraduationsPage />}
                {page === 'ai-coach' && <AICoach students={students} />}
                {page === 'settings' && <SettingsPage />}
                {page === 'profile' && <ProfilePage />}
            </Suspense>
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
