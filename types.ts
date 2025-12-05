
export type Role = 'general_admin' | 'academy_admin' | 'student';

export type DayOfWeek = 'Domingo' | 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado';

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
  
  // Payment Gateways
  mercadoPagoAccessToken?: string;
  mercadoPagoPublicKey?: string;
  mercadoPagoClientId?: string;
  mercadoPagoClientSecret?: string;
  creditCardEnabled?: boolean;
  creditCardSurcharge?: number;

  efiClientId?: string;
  efiClientSecret?: string;
  efiEnabled?: boolean;
  efiPixKey?: string;
  efiPixCert?: string;
  
  // Feature Flags & Integrations
  publicPageEnabled: boolean;
  registrationEnabled: boolean;
  socialLoginEnabled: boolean;
  studentProfileEditEnabled: boolean;
  googleClientId?: string;
  facebookAppId?: string;
  whatsappMessageTemplate?: string;
  theme?: string;

  // Mobile Interface Settings
  mobileNavVisible?: boolean; 
  mobileNavShowDashboard?: boolean;
  mobileNavShowSchedule?: boolean;
  mobileNavShowStudents?: boolean;
  mobileNavShowProfile?: boolean;
  mobileNavBgColor?: string;
  mobileNavActiveColor?: string;
  mobileNavInactiveColor?: string;
  mobileNavHeight?: number;
  mobileNavIconSize?: number;
  mobileNavBorderRadius?: number;
  mobileNavBottomMargin?: number;
  mobileNavFloating?: boolean;

  // App Settings
  appName?: string;
  appIcon?: string;
}

export interface SystemEvent {
    id: string;
    academyId?: string;
    title: string;
    description: string;
    imageUrl?: string;
    footerType: 'text' | 'image';
    footerContent?: string;
    htmlContent?: string;
    startDate: string;
    endDate: string;
    active: boolean;
    targetAudience?: string[]; // List of user IDs (students or admins) who can see this event
}

export interface Academy {
  id: string;
  name: string;
  address?: string;
  responsible: string;
  responsibleRegistration: string;
  professorId?: string;
  imageUrl?: string;
  email: string;
  password?: string;
  settings?: Partial<ThemeSettings>;
  status?: 'pending' | 'active' | 'rejected' | 'blocked';
  allowStudentRegistration?: boolean;
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
    isInstructor?: boolean;
    birthDate?: string;
    status?: 'active' | 'blocked';
}

export interface Graduation {
  id: string;
  name: string;
  color: string;
  color2?: string;
  color3?: string;
  minTimeInMonths: number;
  rank: number;
  type: 'adult' | 'kids';
  minAge?: number;
  maxAge?: number;
  gradientAngle?: number;
  gradientHardness?: number;
}

export interface PaymentHistory {
    id: string;
    studentId: string;
    date: string;
    amount: number;
}

export interface StudentDocument {
    id: string;
    name: string;
    type: 'pdf' | 'image';
    url: string;
    uploadDate: string;
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
  paymentStatus: 'paid' | 'unpaid' | 'scholarship';
  paymentDueDateDay: number;
  imageUrl?: string;
  stripes: number;
  isCompetitor: boolean;
  medals?: any;
  paymentHistory?: PaymentHistory[];
  lastCompetition?: string;
  password?: string;
  lastSeen?: string;
  isInstructor?: boolean;
  status?: 'active' | 'blocked' | 'pending';
  documents?: StudentDocument[];
  responsibleName?: string;
  responsiblePhone?: string;
  isSocialProject?: boolean;
  socialProjectName?: string;
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
    studentIds?: string[];
    observations?: string;
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
