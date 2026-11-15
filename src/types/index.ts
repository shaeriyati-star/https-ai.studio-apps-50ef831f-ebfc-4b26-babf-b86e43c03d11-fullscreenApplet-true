export type UserRole = 'super_admin' | 'admin' | 'guru' | 'siswa' | 'orang_tua';

export type GamificationTier =
  | 'Marketing Beginner'
  | 'Junior Marketer'
  | 'Retail Explorer'
  | 'Marketing Specialist'
  | 'Retail Professional'
  | 'Marketing Master';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  nisNisn?: string;
  nip?: string;
  classId?: string;
  linkedStudentId?: string;
  avatarColor: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  lastLoginDevice?: string;
  isActive: boolean;
  xp: number;
  level: number;
  tier: GamificationTier;
  studyMinutes: number;
  badges: string[];
  completedMissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export type PublicUser = Omit<UserAccount, 'passwordHash'>;

export interface RoleDefinition {
  id: string;
  role: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  gender: 'L' | 'P' | '-';
  bio: string;
  avatarUrl?: string;
  department: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  browser: string;
  os: string;
  rememberMe: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: number;
  isRevoked: boolean;
}

export type PublicUserSession = Omit<UserSessionRecord, 'tokenHash'> & { isCurrent?: boolean };

export interface LoginAttemptRecord {
  id: string;
  identifier: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  success: boolean;
  reason: string;
  attemptedAt: string;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  identifier: string;
  codeHash: string;
  devCodePreview?: string;
  expiresAt: string;
  usedAt?: string;
  attempts: number;
  createdAt: string;
}

export type PublicPasswordReset = Omit<PasswordResetRecord, 'codeHash'>;

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  grade: string;
  hoursPerWeek: number;
  teacherName: string;
  isActive: boolean;
}

export interface WebsiteConfig {
  siteName: string;
  tagline: string;
  copyrightText: string;
  maintenanceMode: boolean;
  allowForgotPassword: boolean;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  sessionTimeoutMinutes: number;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  major: string;
  homeroomTeacher: string;
  academicYearId: string;
}

export interface AcademicSetting {
  id: string;
  schoolName: string;
  schoolAddress: string;
  npsn: string;
  principalName: string;
  subjectTeacherName: string;
  subjectName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  isActive: boolean;
}

export interface GradeWeights {
  knowledge: number; // Pengetahuan (Kuis, Pre/Post, Ujian Bab, UAS)
  skill: number;     // Keterampilan (Praktik & Simulasi Bab)
  project: number;   // Proyek & Tugas
  game: number;      // Marketverse Arena
}

export interface Subchapter {
  id: string;
  order: number;
  title: string;
  summary: string;
  content: string[];
  keyTakeaway: string;
  durationMinutes: number;
}

export interface InfographicNode {
  label: string;
  value: string;
  detail: string;
}

export interface ChapterVideoLesson {
  title: string;
  instructor: string;
  durationLabel: string;
  slides: {
    timestamp: string;
    heading: string;
    bullets: string[];
    visualNote: string;
  }[];
}

export interface ChapterCaseStudy {
  title: string;
  context: string;
  challenge: string;
  questions: string[];
  modelSolution: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  coverImage: string;
  learningObjectives: string[];
  learningOutcomes: string[];
  subchapters: Subchapter[];
  infographicTitle: string;
  infographicNodes: InfographicNode[];
  videoLesson: ChapterVideoLesson;
  caseStudy: ChapterCaseStudy;
  interactiveActivityId: 'store_manager' | 'online_shop' | 'career_bmc' | 'k3_inspector' | 'sales_roleplay';
  interactiveActivityTitle: string;
  interactiveActivityDesc: string;
  summaryPoints: string[];
  reflectionPrompts: string[];
}

export interface CustomMaterial {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  fileType: 'pdf' | 'ppt' | 'video' | 'gambar' | 'dokumen';
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

export interface QuestionItem {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  correctIndex: number;
  explanation: string;
  chapterId: string;
}

export type AssessmentKind = 'pre_test' | 'subbab_quiz' | 'ujian_bab' | 'post_test' | 'uas';

export interface Assessment {
  id: string;
  title: string;
  kind: AssessmentKind;
  chapterId: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number;
  scheduledDate: string;
  randomizeQuestions: boolean;
  questions: QuestionItem[];
  createdBy: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  submittedAt: string;
  answers: Record<string, number>;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  chapterId: string;
  kind: 'individu' | 'kelompok' | 'praktik' | 'proyek';
  dueDate: string;
  maxScore: number;
  createdBy: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: 'submitted' | 'graded';
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
}

export type GameId =
  | 'retail_tycoon'
  | 'marketing_battle'
  | 'cs_hero'
  | 'digital_marketing'
  | 'k3_challenge'
  | 'career_quest';

export interface GameRecord {
  id: string;
  studentId: string;
  gameId: GameId;
  gameName: string;
  score: number;
  xpEarned: number;
  accuracy: number;
  durationSeconds: number;
  metrics: Record<string, string | number>;
  playedAt: string;
}

export interface StudentProgress {
  studentId: string;
  completedSubchapters: string[];
  completedActivities: string[];
  completedVideos: string[];
  reflections: Record<string, { answer1: string; answer2: string; savedAt: string }>;
  lastChapterId?: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
  note?: string;
}

export interface TeacherNote {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName: string;
  strengths: string;
  improvements: string;
  recommendation: string;
  note: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole | 'all';
  targetUserId?: string;
  category:
    | 'materi'
    | 'tugas'
    | 'deadline'
    | 'ujian'
    | 'nilai'
    | 'prestasi'
    | 'guru'
    | 'orang_tua'
    | 'keamanan';
  title: string;
  message: string;
  isReadBy: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  detail: string;
  ipAddress?: string;
  deviceLabel?: string;
  timestamp: string;
}

export interface MissionDef {
  id: string;
  kind: 'daily' | 'weekly';
  title: string;
  description: string;
  xpReward: number;
  targetCount: number;
  metricKey: 'subchapters' | 'games' | 'quizzes' | 'activities';
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  criteria: string;
  tierColor: 'gold' | 'electric' | 'purple';
}

export interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  nisNisn: string;
  classId: string;
  className: string;
  chapterScores: Record<string, number>;
  knowledgeScore: number;
  skillScore: number;
  projectScore: number;
  gameScore: number;
  finalScore: number;
  masteryPercent: number;
  xp: number;
  level: number;
  tier: GamificationTier;
  badgesCount: number;
  missionsCompleted: number;
  attendanceSummary: { hadir: number; izin: number; sakit: number; alpha: number };
  scoreHistory: { label: string; score: number }[];
  gameBreakdown: { gameId: GameId; gameName: string; bestScore: number; plays: number }[];
  recommendedReviewChapters: { chapterId: string; title: string; score: number }[];
}
