export type Role = 'general_admin' | 'academy_admin' | 'student';

export type DayOfWeek = 'Domingo' | 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado';

export interface Academy {
  id: string;
  name: string;
  address?: string;
  responsible: string;
  responsibleRegistration: string;
  professorId?: string;
  imageUrl?: string;
  email: string;
  password?: string; // In real app, never expose this on frontend
}

export interface Professor {
    id: string;
    name: string;
    fjjpe_registration?: string;
    cpf?: string;
    academyId?: string;
    graduationId?: string;
    imageUrl?: string;
    blackBeltDate?: string;
}

export interface Graduation {
  id: string;
  name: string;
  color: string;
  minTimeInMonths: number;
  rank: number;
  type: 'adult' | 'kids';
  minAge?: number;
  maxAge?: number;
}

export interface PaymentHistory {
    id: string;
    studentId: string;
    date: string;
    amount: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  birthDate?: string;
  cpf?: string;
  fjjpe_registration?: string;
  phone?: string;
  address?: string;
  beltId: string;
  academyId: string;
  firstGraduationDate?: string;
  lastPromotionDate?: string;
  paymentStatus: 'paid' | 'unpaid';
  paymentDueDateDay: number;
  imageUrl?: string;
  stripes: number;
  isCompetitor: boolean;
  medals?: any; // JSON string or object
  paymentHistory?: PaymentHistory[];
  lastCompetition?: string;
  password?: string;
  lastSeen?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  academyId?: string;
  studentId?: string;
  token?: string;
  birthDate?: string;
  imageUrl?: string;
}

export interface ThemeSettings {
  logoUrl: string;
  systemName: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  buttonColor: string;
  buttonTextColor: string;
  iconColor: string;
  chartColor1: string;
  chartColor2: string;
  useGradient?: boolean;

  // HTML Content
  heroHtml: string;
  aboutHtml: string;
  branchesHtml: string;
  footerHtml: string;
  contactHtml: string;
  
  // Custom Code
  customCss?: string;
  customJs?: string;
  copyrightText?: string;
  systemVersion?: string;

  // Financial
  pixKey: string;
  pixHolderName: string;
  monthlyFeeAmount: number;
  reminderDaysBeforeDue: number;
  overdueDaysAfterDue: number;
  
  // Feature Flags & Integrations
  publicPageEnabled: boolean;
  registrationEnabled: boolean;
  socialLoginEnabled: boolean;
  googleClientId?: string;
  facebookAppId?: string;
  theme?: string;
}

export interface ClassSchedule {
    id: string;
    className: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    professorId: string;
    academyId: string;
    requiredGraduationId?: string;
    assistantIds: string[];
}

export interface AttendanceRecord {
    studentId: string;
    scheduleId: string;
    date: string;
    status: 'present' | 'absent';
}

export interface ActivityLog {
    id: string;
    actorId: string;
    action: string;
    timestamp: string;
    details: string;
}