import { Academy, Graduation, Student, User, ThemeSettings, ClassSchedule, AttendanceRecord, ActivityLog, Professor } from './types';

export const MOCK_THEME: ThemeSettings = {
  logoUrl: 'https://tailwindui.com/img/logos/mark.svg?color=amber&shade=500',
  systemName: 'Jiu-Jitsu Admin',
  
  // Colors
  primaryColor: '#f59e0b', // Amber 500
  secondaryColor: '#111827', // Slate 900
  backgroundColor: '#f8fafc', // Slate 50
  cardBackgroundColor: '#ffffff',
  buttonColor: '#f59e0b',
  buttonTextColor: '#ffffff',
  iconColor: '#64748b',
  chartColor1: '#f9a825',
  chartColor2: '#475569',
  useGradient: true,

  // Financial
  pixKey: '000.000.000-00',
  pixHolderName: 'Academia Master',
  monthlyFeeAmount: 150.00,
  reminderDaysBeforeDue: 5,
  overdueDaysAfterDue: 5,

  // HTML
  heroHtml: '<div class="relative bg-white text-slate-800 text-center py-20 px-4 overflow-hidden" style="background-image: url(\'https://images.unsplash.com/photo-1581009137052-c40971b51c69?q=80&w=2070&auto=format&fit=crop\'); background-size: cover; background-position: center;"> <div class="absolute inset-0 bg-white/50 backdrop-blur-sm"></div> <div class="relative z-10 container mx-auto"> <h1 class="text-5xl font-bold mb-4 animate-fade-in-down">Jiu-Jitsu: Arte, Disciplina, Respeito</h1> <p class="text-xl text-slate-600 animate-fade-in-up">Transforme sua vida dentro e fora do tatame. Junte-se à nossa família.</p> <a href="#schedule" class="mt-8 inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300">Encontre uma Aula</a> </div> </div>',
  aboutHtml: '<div id="quem-somos" class="py-16 bg-slate-50 px-4"> <div class="container mx-auto text-center"> <h2 class="text-4xl font-bold text-amber-600 mb-6">Quem Somos</h2> <p class="text-lg text-slate-600 max-w-3xl mx-auto"> Somos mais do que uma academia, somos uma comunidade unida pela paixão pelo Jiu-Jitsu. Com instrutores de classe mundial e um ambiente acolhedor, nossa missão é capacitar cada aluno a atingir seu potencial máximo. </p> </div> </div>',
  contactHtml: 'Entre em contato para agendar sua aula experimental.',
  branchesHtml: '<div id="filiais" class="py-16 bg-white px-4"> <div class="container mx-auto text-center"> <h2 class="text-4xl font-bold text-amber-600 mb-10">Nossas Filiais</h2> <p class="text-slate-600">Aqui você pode listar suas academias.</p> </div> </div>',
  footerHtml: '<div class="py-8 bg-slate-100 text-center text-slate-500"> <p>© 2024 Jiu-Jitsu Hub.</p> <p>Desenvolvido com a Arte Suave em mente.</p> </div>',
  
  // Configs
  publicPageEnabled: true,
  socialLoginEnabled: false,
  copyrightText: '© 2025 Jiu-JitsuAdmin',
  systemVersion: '1.3.0',
  theme: 'light'
};

export const GRADUATIONS: Graduation[] = [
  { id: 'white', name: 'Faixa Branca', color: '#ffffff', minTimeInMonths: 0, rank: 1, type: 'adult' },
  { id: 'blue', name: 'Faixa Azul', color: '#3b82f6', minTimeInMonths: 24, rank: 2, type: 'adult' },
  { id: 'purple', name: 'Faixa Roxa', color: '#a855f7', minTimeInMonths: 18, rank: 3, type: 'adult' },
  { id: 'brown', name: 'Faixa Marrom', color: '#78350f', minTimeInMonths: 12, rank: 4, type: 'adult' },
  { id: 'black', name: 'Faixa Preta', color: '#000000', minTimeInMonths: 36, rank: 5, type: 'adult' },
  // Kids Belts Mock
  { id: 'white_kids', name: 'Branca (Kids)', color: '#ffffff', minTimeInMonths: 0, rank: 1, type: 'kids', minAge: 4, maxAge: 15 },
  { id: 'grey_white', name: 'Cinza e Branca', color: '#d1d5db', minTimeInMonths: 6, rank: 2, type: 'kids', minAge: 4, maxAge: 15 },
  { id: 'grey', name: 'Cinza', color: '#9ca3af', minTimeInMonths: 6, rank: 3, type: 'kids', minAge: 4, maxAge: 15 },
  { id: 'yellow', name: 'Amarela', color: '#facc15', minTimeInMonths: 12, rank: 6, type: 'kids', minAge: 7, maxAge: 15 },
  { id: 'orange', name: 'Laranja', color: '#fb923c', minTimeInMonths: 12, rank: 9, type: 'kids', minAge: 10, maxAge: 15 },
  { id: 'green', name: 'Verde', color: '#4ade80', minTimeInMonths: 12, rank: 12, type: 'kids', minAge: 13, maxAge: 15 },
];

export const ACADEMIES: Academy[] = [
  {
    id: 'master_admin_academy_01',
    name: 'Academia Master',
    email: 'androiddiviana@gmail.com',
    responsible: 'Admin Geral',
    responsibleRegistration: '000.000.000-00',
    address: 'Rua das Artes Suaves, 123'
  }
];

export const PROFESSORS: Professor[] = [
    { id: 'prof1', name: 'Mestre Carlos', fjjpe_registration: '123', academyId: 'master_admin_academy_01' },
    { id: 'prof2', name: 'Prof. Ana', fjjpe_registration: '456', academyId: 'master_admin_academy_01' }
];

export const USERS: User[] = [
  {
    id: 'master_admin_user_01',
    name: 'Admin Geral',
    email: 'androiddiviana@gmail.com',
    role: 'general_admin',
    academyId: 'master_admin_academy_01',
    birthDate: '1985-05-20'
  },
  {
    id: 'student_user_01',
    name: 'João Silva',
    email: 'joao@student.com',
    role: 'student',
    academyId: 'master_admin_academy_01',
    studentId: 'student_01',
    birthDate: '1995-10-10'
  }
];

export const STUDENTS: Student[] = [
  {
    id: 'student_01',
    name: 'João Silva',
    email: 'joao@student.com',
    beltId: 'white',
    academyId: 'master_admin_academy_01',
    paymentStatus: 'paid',
    paymentDueDateDay: 10,
    stripes: 2,
    isCompetitor: true,
    phone: '5511999999999',
    imageUrl: 'https://picsum.photos/200/200',
    medals: { gold: 1, silver: 0, bronze: 1 },
    paymentHistory: [],
    birthDate: '1995-10-10',
    firstGraduationDate: '2023-01-01',
    cpf: '123.456.789-00',
    fjjpe_registration: '12345',
    address: 'Rua A, 123'
  },
  {
    id: 'student_02',
    name: 'Maria Oliveira',
    email: 'maria@student.com',
    beltId: 'blue',
    academyId: 'master_admin_academy_01',
    paymentStatus: 'unpaid',
    paymentDueDateDay: 5,
    stripes: 0,
    isCompetitor: false,
    phone: '5511988888888',
    imageUrl: 'https://picsum.photos/201/201',
    medals: { gold: 0, silver: 2, bronze: 0 },
    paymentHistory: [],
    birthDate: '1998-05-15',
    firstGraduationDate: '2021-06-01',
    lastPromotionDate: '2023-06-01',
    cpf: '123.456.789-01',
    fjjpe_registration: '12346',
    address: 'Rua B, 456'
  },
    {
    id: 'student_03',
    name: 'Carlos Gracie Jr Fan',
    email: 'carlos@student.com',
    beltId: 'purple',
    academyId: 'master_admin_academy_01',
    paymentStatus: 'paid',
    paymentDueDateDay: 15,
    stripes: 3,
    isCompetitor: true,
    phone: '5511977777777',
    imageUrl: 'https://picsum.photos/202/202',
    medals: { gold: 5, silver: 3, bronze: 1 },
    paymentHistory: [],
    birthDate: '1990-12-25',
    firstGraduationDate: '2018-01-01',
    lastPromotionDate: '2022-01-01',
    cpf: '123.456.789-02',
    fjjpe_registration: '12347',
    address: 'Rua C, 789'
  }
];

export const SCHEDULES: ClassSchedule[] = [
    { id: 'c1', className: 'Jiu-Jitsu Fundamentals', dayOfWeek: 'Segunda-feira', startTime: '19:00', endTime: '20:30', professorId: 'prof1', academyId: 'master_admin_academy_01', assistantIds: ['prof2'], requiredGraduationId: 'white'},
    { id: 'c2', className: 'Advanced Competition', dayOfWeek: 'Terça-feira', startTime: '18:00', endTime: '20:00', professorId: 'prof1', academyId: 'master_admin_academy_01', assistantIds: [], requiredGraduationId: 'blue'},
    { id: 'c3', className: 'No-Gi Submission', dayOfWeek: 'Quarta-feira', startTime: '19:00', endTime: '20:30', professorId: 'prof1', academyId: 'master_admin_academy_01', assistantIds: [], requiredGraduationId: 'white'},
];

export const ATTENDANCE_RECORDS: AttendanceRecord[] = [
    { id: 'att1', studentId: 'student_01', scheduleId: 'c1', date: '2023-10-01', status: 'present' },
    { id: 'att2', studentId: 'student_01', scheduleId: 'c1', date: '2023-10-08', status: 'present' },
    { id: 'att3', studentId: 'student_02', scheduleId: 'c1', date: '2023-10-01', status: 'absent' },
];

export const ACTIVITY_LOGS: ActivityLog[] = [
    { id: 'log1', actorId: 'master_admin_user_01', action: 'Login', timestamp: new Date().toISOString(), details: 'Login realizado com sucesso.' },
    { id: 'log2', actorId: 'master_admin_user_01', action: 'Update Student', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Atualizou status de pagamento de João Silva.' },
];