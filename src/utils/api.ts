import type {
  AcademicSetting,
  AppNotification,
  Assessment,
  AssessmentAttempt,
  Assignment,
  AssignmentSubmission,
  AttendanceRecord,
  AuditLog,
  BadgeDef,
  Chapter,
  CustomMaterial,
  GameRecord,
  GradeWeights,
  LoginAttemptRecord,
  MissionDef,
  PublicPasswordReset,
  PublicUser,
  PublicUserSession,
  RoleDefinition,
  SchoolClass,
  StudentGradeSummary,
  StudentProgress,
  SubjectItem,
  TeacherNote,
  UserProfile,
  WebsiteConfig,
} from '../types/index.ts';

export interface LeaderboardEntry {
  id: string;
  name: string;
  classId: string;
  className: string;
  xp: number;
  level: number;
  tier: string;
  badgesCount: number;
  finalScore: number;
  avatarColor: string;
}

export interface BootstrapPayload {
  user: PublicUser;
  myProfile?: UserProfile | null;
  mySessions?: PublicUserSession[];
  myLoginHistory?: LoginAttemptRecord[];
  academic: AcademicSetting;
  academicSettings: AcademicSetting[];
  classes: SchoolClass[];
  subjects?: SubjectItem[];
  websiteConfig?: WebsiteConfig;
  roles?: RoleDefinition[];
  userProfiles?: UserProfile[];
  activeSessions?: PublicUserSession[];
  loginAttempts?: LoginAttemptRecord[];
  passwordResets?: PublicPasswordReset[];
  gradeWeights: GradeWeights;
  chapters: Chapter[];
  customMaterials: CustomMaterial[];
  assessments: Assessment[];
  assessmentAttempts: AssessmentAttempt[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  gameRecords: GameRecord[];
  progress: StudentProgress[];
  attendance: AttendanceRecord[];
  teacherNotes: TeacherNote[];
  users: PublicUser[];
  studentSummaries: StudentGradeSummary[];
  leaderboard: LeaderboardEntry[];
  missions: MissionDef[];
  badges: BadgeDef[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
}

let sessionToken: string | null = null;

export function setAuthToken(token: string | null): void {
  sessionToken = token;
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Permintaan gagal (${res.status})`);
  }
  return data as T;
}

export async function uploadFileToServer(file: File): Promise<{ fileName: string; fileUrl: string }> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
  return apiRequest<{ fileName: string; fileUrl: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, base64Data }),
  });
}
