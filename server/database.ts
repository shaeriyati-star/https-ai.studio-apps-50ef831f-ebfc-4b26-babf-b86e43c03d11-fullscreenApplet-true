import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ASSESSMENTS_SEED, BADGES_SEED, CHAPTERS_SEED, MISSIONS_SEED } from '../src/data/curriculumSeed.ts';
import type {
  AcademicSetting,
  AppNotification,
  Assessment,
  AssessmentAttempt,
  Assignment,
  AssignmentSubmission,
  AttendanceRecord,
  AuditLog,
  Chapter,
  CustomMaterial,
  GameId,
  GameRecord,
  GamificationTier,
  GradeWeights,
  LoginAttemptRecord,
  PasswordResetRecord,
  PublicUser,
  RoleDefinition,
  SchoolClass,
  StudentGradeSummary,
  StudentProgress,
  SubjectItem,
  TeacherNote,
  UserAccount,
  UserProfile,
  UserSessionRecord,
  WebsiteConfig,
} from '../src/types/index.ts';

export interface DatabaseState {
  users: UserAccount[];
  roles: RoleDefinition[];
  user_profiles: UserProfile[];
  user_sessions: UserSessionRecord[];
  login_attempts: LoginAttemptRecord[];
  password_resets: PasswordResetRecord[];
  subjects: SubjectItem[];
  websiteConfig: WebsiteConfig;
  classes: SchoolClass[];
  academicSettings: AcademicSetting[];
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
  notifications: AppNotification[];
  auditLogs: AuditLog[];
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'marketverse-db.json');

export function computeLevelAndTier(xp: number): { level: number; tier: GamificationTier } {
  const level = Math.max(1, Math.floor(xp / 250) + 1);
  let tier: GamificationTier = 'Marketing Beginner';
  if (xp >= 2000) tier = 'Marketing Master';
  else if (xp >= 1500) tier = 'Retail Professional';
  else if (xp >= 1000) tier = 'Marketing Specialist';
  else if (xp >= 600) tier = 'Retail Explorer';
  else if (xp >= 250) tier = 'Junior Marketer';
  return { level, tier };
}

export function sanitizeUser(user: UserAccount): PublicUser {
  const { passwordHash: _removed, ...rest } = user;
  return rest;
}

function buildDefaultRoles(): RoleDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'role-super-admin',
      role: 'super_admin',
      displayName: 'Super Admin',
      description: 'Otoritas penuh atas seluruh sistem, konfigurasi website, hak akses role, database, dan akun.',
      permissions: [
        'all_system_access',
        'manage_super_admins',
        'manage_admins',
        'manage_teachers',
        'manage_students',
        'manage_roles_permissions',
        'manage_website_config',
        'manage_database_backup',
        'view_all_audit_and_sessions',
        'manage_classes_subjects',
      ],
      updatedAt: now,
    },
    {
      id: 'role-admin',
      role: 'admin',
      displayName: 'Admin / Operator',
      description: 'Mengelola data guru, siswa, kelas/rombel, mata pelajaran, akun non-superadmin, dan laporan aktivitas.',
      permissions: [
        'manage_teachers',
        'manage_students',
        'manage_parents',
        'manage_classes_subjects',
        'bulk_import_export_users',
        'view_activity_reports',
      ],
      updatedAt: now,
    },
    {
      id: 'role-guru',
      role: 'guru',
      displayName: 'Guru',
      description: 'Mengelola materi pembelajaran 5 bab, soal kuis/ujian, tugas, penilaian, dan pantau siswa.',
      permissions: [
        'manage_materials',
        'manage_assessments',
        'manage_assignments',
        'grade_students',
        'view_student_progress',
        'download_class_reports',
      ],
      updatedAt: now,
    },
    {
      id: 'role-siswa',
      role: 'siswa',
      displayName: 'Siswa',
      description: 'Mengakses materi, kuis, ujian, tugas, game Marketverse Arena, XP, level, badge, dan rapor.',
      permissions: [
        'view_curriculum',
        'take_assessments',
        'submit_assignments',
        'play_arena_games',
        'view_leaderboard',
        'download_own_report',
      ],
      updatedAt: now,
    },
    {
      id: 'role-orang-tua',
      role: 'orang_tua',
      displayName: 'Orang Tua / Wali',
      description: 'Memantau kehadiran, nilai, aktivitas belajar, pencapaian game, dan rapor anak tertaut.',
      permissions: ['view_linked_child_progress', 'download_linked_child_report'],
      updatedAt: now,
    },
  ];
}

function buildDefaultWebsiteConfig(): WebsiteConfig {
  return {
    siteName: 'MARKETVERSE X',
    tagline: 'DIGITAL MARKETING LEARNING & GAME ACADEMY',
    copyrightText: '© 2026 MARKETVERSE X · Digital Marketing Learning & Game Academy. Seluruh Hak Cipta Dilindungi.',
    maintenanceMode: false,
    allowForgotPassword: true,
    maxLoginAttempts: 5,
    lockoutMinutes: 5,
    sessionTimeoutMinutes: 1440,
    updatedAt: new Date().toISOString(),
  };
}

function buildDefaultSubjects(): SubjectItem[] {
  return [
    {
      id: 'subj-ddp',
      code: 'DDP-X-01',
      name: 'Dasar-Dasar Pemasaran',
      grade: 'Kelas X',
      hoursPerWeek: 12,
      teacherName: 'Ratna Sari, S.E., M.Pd.',
      isActive: true,
    },
    {
      id: 'subj-kombin',
      code: 'KMB-X-02',
      name: 'Komunikasi Bisnis & Pelayanan Prima',
      grade: 'Kelas X',
      hoursPerWeek: 4,
      teacherName: 'Ratna Sari, S.E., M.Pd.',
      isActive: true,
    },
    {
      id: 'subj-digmar',
      code: 'DGM-X-03',
      name: 'Pengantar Pemasaran Digital & Ritel Modern',
      grade: 'Kelas X',
      hoursPerWeek: 4,
      teacherName: 'Ratna Sari, S.E., M.Pd.',
      isActive: true,
    },
  ];
}

function buildProfileFromUser(u: UserAccount): UserProfile {
  return {
    id: `prof-${u.id}`,
    userId: u.id,
    fullName: u.name,
    phone: u.phone || '-',
    address: 'Jakarta Selatan',
    gender: '-',
    bio: u.bio || `Akun resmi ${u.role.replace('_', ' ')} pada ekosistem MARKETVERSE X.`,
    avatarUrl: u.avatarUrl,
    department: u.role === 'siswa' ? 'Program Keahlian Pemasaran' : 'SMK Negeri 1 Nusantara Bisnis & Pemasaran',
    updatedAt: new Date().toISOString(),
  };
}

function buildInitialSeed(): DatabaseState {
  const superAdminHash = bcrypt.hashSync('SuperAdmin123!', 10);
  const adminHash = bcrypt.hashSync('Admin123!', 10);
  const guruHash = bcrypt.hashSync('Guru123!', 10);
  const siswaHash = bcrypt.hashSync('Siswa123!', 10);
  const ortuHash = bcrypt.hashSync('Ortu123!', 10);

  const skipDefaultSuperAdmin = process.env.SKIP_SEED_SUPERADMIN === 'true';

  const users: UserAccount[] = [
    ...(!skipDefaultSuperAdmin
      ? [
          {
            id: 'superadmin-1',
            username: 'superadmin',
            name: 'Dr. Hendra Kusuma, M.T.',
            email: 'superadmin@marketverse.sch.id',
            passwordHash: superAdminHash,
            role: 'super_admin' as const,
            nip: '197903152005011002',
            avatarColor: '#4F46E5',
            isActive: true,
            xp: 0,
            level: 1,
            tier: 'Marketing Master' as const,
            studyMinutes: 0,
            badges: [],
            completedMissions: [],
            createdAt: '2026-07-01T06:30:00.000Z',
          },
        ]
      : []),
    {
      id: 'admin-1',
      username: 'admin',
      name: 'Budi Santoso, S.Kom.',
      email: 'admin@marketverse.sch.id',
      passwordHash: adminHash,
      role: 'admin',
      nip: '198405122010011008',
      avatarColor: '#0B193D',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Beginner',
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: '2026-07-01T07:00:00.000Z',
    },
    {
      id: 'guru-1',
      username: 'guru',
      name: 'Ratna Sari, S.E., M.Pd.',
      email: 'guru@marketverse.sch.id',
      passwordHash: guruHash,
      role: 'guru',
      nip: '198911032014022004',
      avatarColor: '#1D4ED8',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Master',
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: '2026-07-01T07:00:00.000Z',
    },
    {
      id: 'siswa-1',
      username: 'siswa',
      name: 'Alya Putri Maharani',
      email: 'siswa@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261001 / 0098451201',
      classId: 'cls-xpm1',
      avatarColor: '#2563EB',
      isActive: true,
      xp: 1120,
      level: 5,
      tier: 'Marketing Specialist',
      studyMinutes: 485,
      badges: ['badge-starter', 'badge-tycoon', 'badge-cs'],
      completedMissions: ['m-daily-read', 'm-daily-game'],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'siswa-2',
      username: 'raka',
      name: 'Raka Pratama Wijaya',
      email: 'raka@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261002 / 0098451202',
      classId: 'cls-xpm1',
      avatarColor: '#6D28D9',
      isActive: true,
      xp: 1580,
      level: 7,
      tier: 'Retail Professional',
      studyMinutes: 610,
      badges: ['badge-starter', 'badge-tycoon', 'badge-cs', 'badge-scholar'],
      completedMissions: ['m-daily-read', 'm-daily-game', 'm-weekly-quiz'],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'siswa-3',
      username: 'siti',
      name: 'Siti Rahma Azzahra',
      email: 'siti@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261003 / 0098451203',
      classId: 'cls-xpm1',
      avatarColor: '#0284C7',
      isActive: true,
      xp: 940,
      level: 4,
      tier: 'Retail Explorer',
      studyMinutes: 420,
      badges: ['badge-starter', 'badge-k3'],
      completedMissions: ['m-daily-read'],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'siswa-4',
      username: 'bagas',
      name: 'Bagas Adi Nugroho',
      email: 'bagas@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261004 / 0098451204',
      classId: 'cls-xpm2',
      avatarColor: '#7C3AED',
      isActive: true,
      xp: 1290,
      level: 6,
      tier: 'Marketing Specialist',
      studyMinutes: 515,
      badges: ['badge-starter', 'badge-tycoon', 'badge-k3'],
      completedMissions: ['m-daily-read', 'm-daily-game'],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'siswa-5',
      username: 'nadia',
      name: 'Nadia Kusuma Dewi',
      email: 'nadia@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261005 / 0098451205',
      classId: 'cls-xpm2',
      avatarColor: '#D97706',
      isActive: true,
      xp: 780,
      level: 4,
      tier: 'Retail Explorer',
      studyMinutes: 350,
      badges: ['badge-starter'],
      completedMissions: ['m-daily-read'],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'siswa-6',
      username: 'farhan',
      name: 'Farhan Maulana Hakim',
      email: 'farhan@marketverse.sch.id',
      passwordHash: siswaHash,
      role: 'siswa',
      nisNisn: '261006 / 0098451206',
      classId: 'cls-xpm2',
      avatarColor: '#0F172A',
      isActive: true,
      xp: 520,
      level: 3,
      tier: 'Junior Marketer',
      studyMinutes: 260,
      badges: ['badge-starter'],
      completedMissions: [],
      createdAt: '2026-07-10T07:00:00.000Z',
    },
    {
      id: 'ortu-1',
      username: 'ortu',
      name: 'Ibu Hendrawati',
      email: 'ortu@marketverse.sch.id',
      passwordHash: ortuHash,
      role: 'orang_tua',
      linkedStudentId: 'siswa-1',
      avatarColor: '#B45309',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Beginner',
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: '2026-07-12T07:00:00.000Z',
    },
    {
      id: 'ortu-2',
      username: 'ortu.raka',
      name: 'Bapak Agus Wijaya',
      email: 'ortu.raka@marketverse.sch.id',
      passwordHash: ortuHash,
      role: 'orang_tua',
      linkedStudentId: 'siswa-2',
      avatarColor: '#1E3A8A',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Beginner',
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: '2026-07-12T07:00:00.000Z',
    },
  ];

  const academicSettings: AcademicSetting[] = [
    {
      id: 'acad-2026-ganjil',
      schoolName: 'SMK Negeri 1 Nusantara Bisnis & Pemasaran',
      schoolAddress: 'Jl. Pendidikan Raya No. 88, Jakarta Selatan 12410',
      npsn: '20109482',
      principalName: 'Drs. H. Ahmad Fauzan, M.M.',
      subjectTeacherName: 'Ratna Sari, S.E., M.Pd.',
      subjectName: 'Dasar-Dasar Pemasaran',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      isActive: true,
    },
    {
      id: 'acad-2026-genap',
      schoolName: 'SMK Negeri 1 Nusantara Bisnis & Pemasaran',
      schoolAddress: 'Jl. Pendidikan Raya No. 88, Jakarta Selatan 12410',
      npsn: '20109482',
      principalName: 'Drs. H. Ahmad Fauzan, M.M.',
      subjectTeacherName: 'Ratna Sari, S.E., M.Pd.',
      subjectName: 'Dasar-Dasar Pemasaran',
      academicYear: '2026/2027',
      semester: 'Genap',
      isActive: false,
    },
  ];

  const classes: SchoolClass[] = [
    {
      id: 'cls-xpm1',
      name: 'X PM 1',
      grade: 'Kelas X',
      major: 'Program Keahlian Pemasaran',
      homeroomTeacher: 'Ratna Sari, S.E., M.Pd.',
      academicYearId: 'acad-2026-ganjil',
    },
    {
      id: 'cls-xpm2',
      name: 'X PM 2',
      grade: 'Kelas X',
      major: 'Program Keahlian Pemasaran',
      homeroomTeacher: 'Dimas Prasetyo, S.Kom., M.M.',
      academicYearId: 'acad-2026-ganjil',
    },
  ];

  const gradeWeights: GradeWeights = {
    knowledge: 35,
    skill: 25,
    project: 20,
    game: 20,
  };

  const customMaterials: CustomMaterial[] = [
    {
      id: 'mat-seed-1',
      chapterId: 'bab-1',
      title: 'Panduan Planogram & Standar Display Minimarket Modern',
      description: 'Referensi tata letak rak produk fast-moving, signage harga promo, dan rotasi FEFO.',
      fileType: 'dokumen',
      fileName: 'Modul_Planogram_Ritel_XPM.txt',
      fileUrl: '/api/materials/sample/planogram',
      uploadedBy: 'Ratna Sari, S.E., M.Pd.',
      createdAt: '2026-08-05T08:00:00.000Z',
    },
    {
      id: 'mat-seed-2',
      chapterId: 'bab-2',
      title: 'Checklist Kepatuhan Etika & Perlindungan Data Konsumen Digital',
      description: 'Ringkasan praktik terbaik opt-in CRM dan transaksi QRIS yang aman bagi ritel UMKM.',
      fileType: 'dokumen',
      fileName: 'Checklist_Etika_Digital_Marketing.txt',
      fileUrl: '/api/materials/sample/etika-digital',
      uploadedBy: 'Ratna Sari, S.E., M.Pd.',
      createdAt: '2026-09-02T09:30:00.000Z',
    },
  ];

  const assessmentAttempts: AssessmentAttempt[] = [
    { id: 'att-1', assessmentId: 'assess-pretest', studentId: 'siswa-1', score: 80, correctCount: 4, totalQuestions: 5, durationSeconds: 320, submittedAt: '2026-07-21T08:15:00.000Z', answers: {} },
    { id: 'att-2', assessmentId: 'assess-bab-1', studentId: 'siswa-1', score: 88, correctCount: 4, totalQuestions: 5, durationSeconds: 460, submittedAt: '2026-08-19T09:10:00.000Z', answers: {} },
    { id: 'att-3', assessmentId: 'assess-bab-2', studentId: 'siswa-1', score: 84, correctCount: 4, totalQuestions: 5, durationSeconds: 490, submittedAt: '2026-09-16T09:20:00.000Z', answers: {} },
    { id: 'att-4', assessmentId: 'assess-bab-3', studentId: 'siswa-1', score: 90, correctCount: 4, totalQuestions: 4, durationSeconds: 410, submittedAt: '2026-10-13T10:00:00.000Z', answers: {} },
    { id: 'att-5', assessmentId: 'assess-bab-4', studentId: 'siswa-1', score: 78, correctCount: 3, totalQuestions: 4, durationSeconds: 510, submittedAt: '2026-11-06T08:40:00.000Z', answers: {} },

    { id: 'att-6', assessmentId: 'assess-pretest', studentId: 'siswa-2', score: 85, correctCount: 4, totalQuestions: 5, durationSeconds: 290, submittedAt: '2026-07-21T08:15:00.000Z', answers: {} },
    { id: 'att-7', assessmentId: 'assess-bab-1', studentId: 'siswa-2', score: 92, correctCount: 5, totalQuestions: 5, durationSeconds: 410, submittedAt: '2026-08-19T09:10:00.000Z', answers: {} },
    { id: 'att-8', assessmentId: 'assess-bab-2', studentId: 'siswa-2', score: 90, correctCount: 5, totalQuestions: 5, durationSeconds: 430, submittedAt: '2026-09-16T09:20:00.000Z', answers: {} },
    { id: 'att-9', assessmentId: 'assess-bab-3', studentId: 'siswa-2', score: 88, correctCount: 4, totalQuestions: 4, durationSeconds: 380, submittedAt: '2026-10-13T10:00:00.000Z', answers: {} },
    { id: 'att-10', assessmentId: 'assess-bab-4', studentId: 'siswa-2', score: 91, correctCount: 4, totalQuestions: 4, durationSeconds: 420, submittedAt: '2026-11-06T08:40:00.000Z', answers: {} },
    { id: 'att-11', assessmentId: 'assess-bab-5', studentId: 'siswa-2', score: 89, correctCount: 4, totalQuestions: 4, durationSeconds: 440, submittedAt: '2026-11-12T08:40:00.000Z', answers: {} },

    { id: 'att-12', assessmentId: 'assess-bab-1', studentId: 'siswa-3', score: 82, correctCount: 4, totalQuestions: 5, durationSeconds: 500, submittedAt: '2026-08-19T09:30:00.000Z', answers: {} },
    { id: 'att-13', assessmentId: 'assess-bab-2', studentId: 'siswa-3', score: 79, correctCount: 4, totalQuestions: 5, durationSeconds: 520, submittedAt: '2026-09-16T09:30:00.000Z', answers: {} },
    { id: 'att-14', assessmentId: 'assess-bab-1', studentId: 'siswa-4', score: 86, correctCount: 4, totalQuestions: 5, durationSeconds: 440, submittedAt: '2026-08-19T09:30:00.000Z', answers: {} },
    { id: 'att-15', assessmentId: 'assess-bab-2', studentId: 'siswa-4', score: 85, correctCount: 4, totalQuestions: 5, durationSeconds: 470, submittedAt: '2026-09-16T09:30:00.000Z', answers: {} },
    { id: 'att-16', assessmentId: 'assess-bab-1', studentId: 'siswa-5', score: 76, correctCount: 4, totalQuestions: 5, durationSeconds: 550, submittedAt: '2026-08-19T09:30:00.000Z', answers: {} },
    { id: 'att-17', assessmentId: 'assess-bab-1', studentId: 'siswa-6', score: 68, correctCount: 3, totalQuestions: 5, durationSeconds: 590, submittedAt: '2026-08-19T09:30:00.000Z', answers: {} },
  ];

  const assignments: Assignment[] = [
    {
      id: 'asg-1',
      title: 'Audit Planogram & Alur Pelayanan Minimarket Sekitar',
      description: 'Observasi satu minimarket di sekitar tempat tinggalmu, petakan zona eye-level dan alur antrean kasir, lalu tulis rekomendasi perbaikan 2 paragraf.',
      chapterId: 'bab-1',
      kind: 'individu',
      dueDate: '2026-08-25',
      maxScore: 100,
      createdBy: 'guru-1',
    },
    {
      id: 'asg-2',
      title: 'Proyek Mini: Strategi Promosi Omnichannel UMKM Sekolah',
      description: 'Buat rancangan kampanye media sosial + integrasi pembayaran QRIS untuk produk kewirausahaan jurusan Pemasaran.',
      chapterId: 'bab-2',
      kind: 'kelompok',
      dueDate: '2026-09-25',
      maxScore: 100,
      createdBy: 'guru-1',
    },
    {
      id: 'asg-3',
      title: 'Praktik Penyusunan Business Model Canvas (BMC) Ritel',
      description: 'Lengkapi 9 blok BMC usaha ritel modern berskala siswa SMK lengkap dengan estimasi HPP dan target pelanggan.',
      chapterId: 'bab-3',
      kind: 'proyek',
      dueDate: '2026-10-28',
      maxScore: 100,
      createdBy: 'guru-1',
    },
    {
      id: 'asg-4',
      title: 'Simulasi Dialog Penanganan Komplain (Metode LAST)',
      description: 'Susun skrip komunikasi verbal & gestur nonverbal untuk menyelesaikan keluhan pelanggan produk rusak secara profesional.',
      chapterId: 'bab-5',
      kind: 'praktik',
      dueDate: '2026-11-26',
      maxScore: 100,
      createdBy: 'guru-1',
    },
  ];

  const submissions: AssignmentSubmission[] = [
    {
      id: 'sub-1',
      assignmentId: 'asg-1',
      studentId: 'siswa-1',
      content: 'Hasil observasi di Minimarket Harapan Jaya menunjukkan produk minuman isotonik dan snack berada di rak eye-level dekat pintu masuk, sedangkan kasir sudah memakai barcode scanner dan QRIS. Rekomendasi saya adalah menata ulang jalur antrean agar tidak menghalangi rak promosi impulsif.',
      status: 'graded',
      score: 90,
      feedback: 'Analisis lapangan sangat tajam dan rekomendasi tata letak kasir tepat sasaran.',
      submittedAt: '2026-08-22T14:20:00.000Z',
      gradedAt: '2026-08-24T10:15:00.000Z',
    },
    {
      id: 'sub-2',
      assignmentId: 'asg-2',
      studentId: 'siswa-1',
      content: 'Kelompok kami merancang katalog WhatsApp Business dan Instagram Reels untuk produk es kopi susu koperasi siswa dengan sistem pre-order QRIS sebelum jam istirahat.',
      status: 'graded',
      score: 88,
      feedback: 'Konsep omnichannel praktis dan mudah diterapkan di koperasi sekolah.',
      submittedAt: '2026-09-21T16:00:00.000Z',
      gradedAt: '2026-09-23T09:00:00.000Z',
    },
    {
      id: 'sub-3',
      assignmentId: 'asg-3',
      studentId: 'siswa-1',
      content: 'Draft BMC Usaha Snack Box Sehat X PM 1: Value Proposition berupa paket sarapan praktis higienis Rp8.000 dengan pemesanan cepat via QRIS.',
      status: 'submitted',
      submittedAt: '2026-10-27T11:10:00.000Z',
    },
    {
      id: 'sub-4',
      assignmentId: 'asg-1',
      studentId: 'siswa-2',
      content: 'Laporan audit planogram toko ritel modern beserta foto sketsa alur keluar masuk pelanggan dan evaluasi pencahayaan rak.',
      status: 'graded',
      score: 94,
      feedback: 'Sangat sistematis, mencakup aspek ergonomi dan rotasi FEFO.',
      submittedAt: '2026-08-21T11:00:00.000Z',
      gradedAt: '2026-08-23T10:00:00.000Z',
    },
  ];

  const gameRecords: GameRecord[] = [
    { id: 'gm-1', studentId: 'siswa-1', gameId: 'retail_tycoon', gameName: 'Retail Tycoon Simulator', score: 88, xpEarned: 140, accuracy: 88, durationSeconds: 210, metrics: { laba: 'Rp 2.450.000', kepuasan: '92%' }, playedAt: '2026-11-10T14:00:00.000Z' },
    { id: 'gm-2', studentId: 'siswa-1', gameId: 'cs_hero', gameName: 'Customer Service Hero', score: 92, xpEarned: 150, accuracy: 92, durationSeconds: 175, metrics: { pelangganTerlayani: 5, empati: '94%' }, playedAt: '2026-11-11T15:30:00.000Z' },
    { id: 'gm-3', studentId: 'siswa-1', gameId: 'marketing_battle', gameName: 'Marketing Battle', score: 84, xpEarned: 125, accuracy: 80, durationSeconds: 130, metrics: { mode: 'Individu', peringkat: 'Top 3' }, playedAt: '2026-11-12T10:15:00.000Z' },
    { id: 'gm-4', studentId: 'siswa-1', gameId: 'digital_marketing', gameName: 'Digital Marketing Master', score: 85, xpEarned: 130, accuracy: 85, durationSeconds: 190, metrics: { roas: '3.8x', konversi: '6.4%' }, playedAt: '2026-11-13T16:20:00.000Z' },
    { id: 'gm-5', studentId: 'siswa-2', gameId: 'retail_tycoon', gameName: 'Retail Tycoon Simulator', score: 95, xpEarned: 165, accuracy: 95, durationSeconds: 195, metrics: { laba: 'Rp 3.120.000', kepuasan: '96%' }, playedAt: '2026-11-12T13:00:00.000Z' },
    { id: 'gm-6', studentId: 'siswa-2', gameId: 'career_quest', gameName: 'Career Quest', score: 91, xpEarned: 150, accuracy: 91, durationSeconds: 205, metrics: { profesi: 'Store Manager' }, playedAt: '2026-11-13T14:00:00.000Z' },
    { id: 'gm-7', studentId: 'siswa-3', gameId: 'k3_challenge', gameName: 'K3 Retail Challenge', score: 87, xpEarned: 135, accuracy: 87, durationSeconds: 145, metrics: { bahayaDitemukan: '6/6' }, playedAt: '2026-11-12T11:00:00.000Z' },
    { id: 'gm-8', studentId: 'siswa-4', gameId: 'retail_tycoon', gameName: 'Retail Tycoon Simulator', score: 89, xpEarned: 145, accuracy: 89, durationSeconds: 220, metrics: { laba: 'Rp 2.600.000' }, playedAt: '2026-11-13T09:00:00.000Z' },
  ];

  const progress: StudentProgress[] = [
    {
      studentId: 'siswa-1',
      completedSubchapters: [
        'b1-1','b1-2','b1-3','b1-4','b1-5','b1-6','b1-7','b1-8','b1-9','b1-10','b1-11','b1-12',
        'b2-1','b2-2','b2-3','b2-4','b2-5','b2-6','b2-7','b2-8','b2-9','b2-10','b2-11','b2-12',
        'b3-1','b3-2','b3-3','b3-4','b3-5','b3-6','b3-7','b3-8',
        'b4-1','b4-2','b4-3','b4-4','b4-5',
        'b5-1','b5-2','b5-3',
      ],
      completedActivities: ['store_manager', 'online_shop', 'career_bmc'],
      completedVideos: ['bab-1', 'bab-2', 'bab-3'],
      reflections: {
        'bab-1': {
          answer1: 'Pengelolaan stok FEFO dan pelayanan kasir yang cepat sangat menentukan agar pembeli kembali lagi.',
          answer2: 'Saya akan menata ulang rak makanan ringan di level pandangan mata dan menambah label harga yang jelas.',
          savedAt: '2026-08-19T12:00:00.000Z',
        },
      },
      lastChapterId: 'bab-4',
      updatedAt: '2026-11-13T16:20:00.000Z',
    },
    {
      studentId: 'siswa-2',
      completedSubchapters: [
        'b1-1','b1-2','b1-3','b1-4','b1-5','b1-6','b1-7','b1-8','b1-9','b1-10','b1-11','b1-12',
        'b2-1','b2-2','b2-3','b2-4','b2-5','b2-6','b2-7','b2-8','b2-9','b2-10','b2-11','b2-12',
        'b3-1','b3-2','b3-3','b3-4','b3-5','b3-6','b3-7','b3-8','b3-9','b3-10','b3-11','b3-12','b3-13','b3-14',
        'b4-1','b4-2','b4-3','b4-4','b4-5','b4-6','b4-7','b4-8','b4-9','b4-10',
        'b5-1','b5-2','b5-3','b5-4','b5-5','b5-6',
      ],
      completedActivities: ['store_manager', 'online_shop', 'career_bmc', 'k3_inspector'],
      completedVideos: ['bab-1', 'bab-2', 'bab-3', 'bab-4'],
      reflections: {},
      lastChapterId: 'bab-5',
      updatedAt: '2026-11-13T15:00:00.000Z',
    },
    {
      studentId: 'siswa-3',
      completedSubchapters: ['b1-1','b1-2','b1-3','b1-4','b1-5','b1-6','b2-1','b2-2','b2-3','b4-1','b4-2'],
      completedActivities: ['store_manager', 'k3_inspector'],
      completedVideos: ['bab-1'],
      reflections: {},
      lastChapterId: 'bab-2',
      updatedAt: '2026-11-12T11:30:00.000Z',
    },
    {
      studentId: 'siswa-4',
      completedSubchapters: ['b1-1','b1-2','b1-3','b1-4','b1-5','b1-6','b1-7','b1-8','b2-1','b2-2','b2-3','b2-4'],
      completedActivities: ['store_manager', 'online_shop'],
      completedVideos: ['bab-1', 'bab-2'],
      reflections: {},
      lastChapterId: 'bab-2',
      updatedAt: '2026-11-13T09:15:00.000Z',
    },
    {
      studentId: 'siswa-5',
      completedSubchapters: ['b1-1','b1-2','b1-3','b1-4','b1-5'],
      completedActivities: ['store_manager'],
      completedVideos: ['bab-1'],
      reflections: {},
      lastChapterId: 'bab-1',
      updatedAt: '2026-11-10T10:00:00.000Z',
    },
    {
      studentId: 'siswa-6',
      completedSubchapters: ['b1-1','b1-2','b1-3'],
      completedActivities: [],
      completedVideos: ['bab-1'],
      reflections: {},
      lastChapterId: 'bab-1',
      updatedAt: '2026-11-08T10:00:00.000Z',
    },
  ];

  const attendance: AttendanceRecord[] = [
    { id: 'abs-1', studentId: 'siswa-1', date: '2026-11-03', status: 'Hadir' },
    { id: 'abs-2', studentId: 'siswa-1', date: '2026-11-05', status: 'Hadir' },
    { id: 'abs-3', studentId: 'siswa-1', date: '2026-11-07', status: 'Hadir' },
    { id: 'abs-4', studentId: 'siswa-1', date: '2026-11-10', status: 'Izin', note: 'Lomba LKS Pemasaran Tingkat Kota' },
    { id: 'abs-5', studentId: 'siswa-1', date: '2026-11-12', status: 'Hadir' },
    { id: 'abs-6', studentId: 'siswa-1', date: '2026-11-14', status: 'Hadir' },
    { id: 'abs-7', studentId: 'siswa-2', date: '2026-11-10', status: 'Hadir' },
    { id: 'abs-8', studentId: 'siswa-2', date: '2026-11-12', status: 'Hadir' },
    { id: 'abs-9', studentId: 'siswa-2', date: '2026-11-14', status: 'Hadir' },
  ];

  const teacherNotes: TeacherNote[] = [
    {
      id: 'note-1',
      studentId: 'siswa-1',
      teacherId: 'guru-1',
      teacherName: 'Ratna Sari, S.E., M.Pd.',
      strengths: 'Sangat menonjol dalam komunikasi pelayanan pelanggan, pemahaman proses bisnis ritel, serta perancangan model bisnis sederhana.',
      improvements: 'Perlu memperdalam materi Bab 4 (Keselamatan Kerja & Pencegahan Shrinkage) dan menyelesaikan latihan Bab 5.',
      recommendation: 'Ulangi subbab 4.7–4.11 lalu mainkan game K3 Retail Challenge untuk menguatkan pemahaman audit keselamatan toko.',
      note: 'Alya menunjukkan antusiasme belajar tinggi dan aktif dalam simulasi praktik kelas. Pertahankan konsistensi belajar menuju UAS.',
      updatedAt: '2026-11-13T10:00:00.000Z',
    },
    {
      id: 'note-2',
      studentId: 'siswa-2',
      teacherId: 'guru-1',
      teacherName: 'Ratna Sari, S.E., M.Pd.',
      strengths: 'Penguasaan materi merata sangat baik di Bab 1 hingga Bab 5 dengan kepemimpinan proyek tim yang kuat.',
      improvements: 'Terus latih kecepatan analisis studi kasus omnichannel untuk persiapan lomba kompetensi siswa.',
      recommendation: 'Coba tantangan Digital Marketing Master dengan target ROAS di atas 4.0x.',
      note: 'Prestasi akademik dan simulasi game sangat memuaskan.',
      updatedAt: '2026-11-13T10:15:00.000Z',
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      targetRole: 'siswa',
      category: 'tugas',
      title: 'Tugas Praktik Baru: Dialog Penanganan Komplain',
      message: 'Ibu Ratna Sari menambahkan Tugas Praktik Bab 5 dengan batas pengumpulan 26 November 2026.',
      isReadBy: [],
      createdAt: '2026-11-13T08:00:00.000Z',
    },
    {
      id: 'notif-2',
      targetRole: 'siswa',
      category: 'ujian',
      title: 'Jadwal Ujian Akhir Bab 5 & UAS Semester Ganjil',
      message: 'Ujian Akhir Bab 5 dijadwalkan pada 28 November 2026 dan UAS pada 12 Desember 2026.',
      isReadBy: [],
      createdAt: '2026-11-13T09:00:00.000Z',
    },
    {
      id: 'notif-3',
      targetRole: 'orang_tua',
      targetUserId: 'ortu-1',
      category: 'orang_tua',
      title: 'Laporan Perkembangan Belajar Alya Putri Maharani',
      message: 'Alya meraih skor 92 pada simulasi Customer Service Hero dan memperoleh badge Duta Pelayanan Prima.',
      isReadBy: [],
      createdAt: '2026-11-13T16:30:00.000Z',
    },
    {
      id: 'notif-4',
      targetRole: 'guru',
      category: 'tugas',
      title: '1 Pengumpulan Tugas Menunggu Penilaian',
      message: 'Alya Putri Maharani (X PM 1) telah mengumpulkan Praktik Business Model Canvas Bab 3.',
      isReadBy: [],
      createdAt: '2026-11-14T07:30:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      userId: 'admin-1',
      userName: 'Budi Santoso, S.Kom.',
      role: 'admin',
      action: 'SYSTEM_INIT',
      detail: 'Inisialisasi database MARKETVERSE X Tahun Pelajaran 2026/2027 Semester Ganjil.',
      timestamp: '2026-07-01T07:00:00.000Z',
    },
    {
      id: 'log-2',
      userId: 'guru-1',
      userName: 'Ratna Sari, S.E., M.Pd.',
      role: 'guru',
      action: 'UPDATE_WEIGHTS',
      detail: 'Konfigurasi bobot nilai: Pengetahuan 35%, Keterampilan 25%, Proyek 20%, Game 20%.',
      timestamp: '2026-07-15T08:00:00.000Z',
    },
  ];

  return {
    users,
    roles: buildDefaultRoles(),
    user_profiles: users.map(buildProfileFromUser),
    user_sessions: [],
    login_attempts: [],
    password_resets: [],
    subjects: buildDefaultSubjects(),
    websiteConfig: buildDefaultWebsiteConfig(),
    classes,
    academicSettings,
    gradeWeights,
    chapters: CHAPTERS_SEED,
    customMaterials,
    assessments: ASSESSMENTS_SEED,
    assessmentAttempts,
    assignments,
    submissions,
    gameRecords,
    progress,
    attendance,
    teacherNotes,
    notifications,
    auditLogs,
  };
}

function ensureAuthSchemaMigrations(db: DatabaseState): boolean {
  let dirty = false;

  if (!Array.isArray(db.roles) || db.roles.length === 0) {
    db.roles = buildDefaultRoles();
    dirty = true;
  }
  if (!Array.isArray(db.user_sessions)) {
    db.user_sessions = [];
    dirty = true;
  }
  if (!Array.isArray(db.login_attempts)) {
    db.login_attempts = [];
    dirty = true;
  }
  if (!Array.isArray(db.password_resets)) {
    db.password_resets = [];
    dirty = true;
  }
  if (!Array.isArray(db.subjects) || db.subjects.length === 0) {
    db.subjects = buildDefaultSubjects();
    dirty = true;
  }
  if (!db.websiteConfig) {
    db.websiteConfig = buildDefaultWebsiteConfig();
    dirty = true;
  }

  for (const u of db.users) {
    if (!u.username) {
      const prefix = (u.email || u.id).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      u.username = prefix || u.id;
      dirty = true;
    }
  }

  const hasSuperAdmin = db.users.some((u) => u.role === 'super_admin');
  if (!hasSuperAdmin && process.env.SKIP_SEED_SUPERADMIN !== 'true') {
    db.users.unshift({
      id: 'superadmin-1',
      username: 'superadmin',
      name: 'Dr. Hendra Kusuma, M.T.',
      email: 'superadmin@marketverse.sch.id',
      passwordHash: bcrypt.hashSync('SuperAdmin123!', 10),
      role: 'super_admin',
      nip: '197903152005011002',
      avatarColor: '#4F46E5',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Master',
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: new Date().toISOString(),
    });
    dirty = true;
  }

  if (!Array.isArray(db.user_profiles)) {
    db.user_profiles = db.users.map(buildProfileFromUser);
    dirty = true;
  } else {
    for (const u of db.users) {
      if (!db.user_profiles.some((p) => p.userId === u.id)) {
        db.user_profiles.push(buildProfileFromUser(u));
        dirty = true;
      }
    }
  }

  return dirty;
}

let cachedDb: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    cachedDb = buildInitialSeed();
    saveDb(cachedDb);
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseState;
    const migrated = ensureAuthSchemaMigrations(parsed);
    cachedDb = parsed;
    if (migrated) saveDb(cachedDb);
    return cachedDb;
  } catch {
    cachedDb = buildInitialSeed();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export function saveDb(nextDb?: DatabaseState): void {
  const target = nextDb || cachedDb;
  if (!target) return;
  cachedDb = target;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(target, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function appendAudit(
  user: PublicUser,
  action: string,
  detail: string,
  meta?: { ipAddress?: string; deviceLabel?: string },
): void {
  const db = getDb();
  db.auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    detail,
    ipAddress: meta?.ipAddress,
    deviceLabel: meta?.deviceLabel,
    timestamp: new Date().toISOString(),
  });
  if (db.auditLogs.length > 300) {
    db.auditLogs = db.auditLogs.slice(0, 300);
  }
  saveDb();
}

export function calculateStudentSummary(studentId: string): StudentGradeSummary | null {
  const db = getDb();
  const student = db.users.find((u) => u.id === studentId && u.role === 'siswa');
  if (!student) return null;

  const cls = db.classes.find((c) => c.id === student.classId);
  const attempts = db.assessmentAttempts.filter((a) => a.studentId === studentId);
  const subs = db.submissions.filter((s) => s.studentId === studentId);
  const games = db.gameRecords.filter((g) => g.studentId === studentId);
  const prog = db.progress.find((p) => p.studentId === studentId);
  const att = db.attendance.filter((a) => a.studentId === studentId);

  const chapterScores: Record<string, number> = {};
  for (const ch of db.chapters) {
    const chAssessments = db.assessments.filter((a) => a.chapterId === ch.id);
    const chAttempts = attempts.filter((at) => chAssessments.some((ca) => ca.id === at.assessmentId));
    const bestAttemptPerAssessment = chAssessments.map((ca) => {
      const list = chAttempts.filter((at) => at.assessmentId === ca.id);
      return list.length > 0 ? Math.max(...list.map((x) => x.score)) : null;
    }).filter((v): v is number => v !== null);

    const chAssignments = db.assignments.filter((asg) => asg.chapterId === ch.id);
    const chSubs = subs.filter((s) => chAssignments.some((ca) => ca.id === s.assignmentId) && typeof s.score === 'number');
    const avgSub = chSubs.length > 0 ? chSubs.reduce((acc, s) => acc + (s.score || 0), 0) / chSubs.length : null;

    if (bestAttemptPerAssessment.length > 0 && avgSub !== null) {
      const avgExam = bestAttemptPerAssessment.reduce((a, b) => a + b, 0) / bestAttemptPerAssessment.length;
      chapterScores[ch.id] = Math.round(avgExam * 0.65 + avgSub * 0.35);
    } else if (bestAttemptPerAssessment.length > 0) {
      chapterScores[ch.id] = Math.round(bestAttemptPerAssessment.reduce((a, b) => a + b, 0) / bestAttemptPerAssessment.length);
    } else if (avgSub !== null) {
      chapterScores[ch.id] = Math.round(avgSub);
    } else {
      chapterScores[ch.id] = 0;
    }
  }

  // Knowledge score: average of all attempted assessments (best score per assessment)
  const bestByAssessment = new Map<string, number>();
  for (const at of attempts) {
    const prev = bestByAssessment.get(at.assessmentId) ?? 0;
    if (at.score > prev) bestByAssessment.set(at.assessmentId, at.score);
  }
  const knowledgeVals = Array.from(bestByAssessment.values());
  const knowledgeScore = knowledgeVals.length > 0
    ? Math.round(knowledgeVals.reduce((a, b) => a + b, 0) / knowledgeVals.length)
    : 0;

  // Skill score: interactive chapter activities + praktik assignments
  const totalActivities = db.chapters.length;
  const completedActCount = prog?.completedActivities.length ?? 0;
  const praktikSubs = subs.filter((s) => {
    const asg = db.assignments.find((a) => a.id === s.assignmentId);
    return asg?.kind === 'praktik' && typeof s.score === 'number';
  });
  const actScore = Math.round((completedActCount / totalActivities) * 100);
  const skillScore = praktikSubs.length > 0
    ? Math.round(actScore * 0.5 + (praktikSubs.reduce((a, s) => a + (s.score || 0), 0) / praktikSubs.length) * 0.5)
    : actScore;

  // Project score: individu/kelompok/proyek graded submissions
  const projectSubs = subs.filter((s) => {
    const asg = db.assignments.find((a) => a.id === s.assignmentId);
    return asg && asg.kind !== 'praktik' && typeof s.score === 'number';
  });
  const projectScore = projectSubs.length > 0
    ? Math.round(projectSubs.reduce((a, s) => a + (s.score || 0), 0) / projectSubs.length)
    : 0;

  // Game score: average of best scores across played games
  const gameCatalog: { id: GameId; name: string }[] = [
    { id: 'retail_tycoon', name: 'Retail Tycoon Simulator' },
    { id: 'marketing_battle', name: 'Marketing Battle' },
    { id: 'cs_hero', name: 'Customer Service Hero' },
    { id: 'digital_marketing', name: 'Digital Marketing Master' },
    { id: 'k3_challenge', name: 'K3 Retail Challenge' },
    { id: 'career_quest', name: 'Career Quest' },
  ];
  const gameBreakdown = gameCatalog.map((gc) => {
    const played = games.filter((g) => g.gameId === gc.id);
    return {
      gameId: gc.id,
      gameName: gc.name,
      bestScore: played.length > 0 ? Math.max(...played.map((p) => p.score)) : 0,
      plays: played.length,
    };
  });
  const playedGames = gameBreakdown.filter((g) => g.plays > 0);
  const gameScore = playedGames.length > 0
    ? Math.round(playedGames.reduce((a, b) => a + b.bestScore, 0) / playedGames.length)
    : 0;

  const w = db.gradeWeights;
  const totalWeight = w.knowledge + w.skill + w.project + w.game || 100;
  const finalScore = Math.round(
    (knowledgeScore * w.knowledge +
      skillScore * w.skill +
      projectScore * w.project +
      gameScore * w.game) /
      totalWeight
  );

  const totalSubchapters = db.chapters.reduce((acc, c) => acc + c.subchapters.length, 0);
  const completedSubCount = prog?.completedSubchapters.length ?? 0;
  const masteryPercent = totalSubchapters > 0 ? Math.round((completedSubCount / totalSubchapters) * 100) : 0;

  const attendanceSummary = {
    hadir: att.filter((a) => a.status === 'Hadir').length,
    izin: att.filter((a) => a.status === 'Izin').length,
    sakit: att.filter((a) => a.status === 'Sakit').length,
    alpha: att.filter((a) => a.status === 'Alpha').length,
  };

  const scoreHistory = db.chapters.map((c) => ({
    label: `Bab ${c.number}`,
    score: chapterScores[c.id] || 0,
  }));

  const recommendedReviewChapters = db.chapters
    .map((c) => ({ chapterId: c.id, title: `Bab ${c.number}: ${c.title}`, score: chapterScores[c.id] || 0 }))
    .filter((item) => item.score < 80)
    .sort((a, b) => a.score - b.score);

  const { level, tier } = computeLevelAndTier(student.xp);

  return {
    studentId: student.id,
    studentName: student.name,
    nisNisn: student.nisNisn || '-',
    classId: student.classId || '',
    className: cls?.name || '-',
    chapterScores,
    knowledgeScore,
    skillScore,
    projectScore,
    gameScore,
    finalScore,
    masteryPercent,
    xp: student.xp,
    level,
    tier,
    badgesCount: student.badges.length,
    missionsCompleted: student.completedMissions.length,
    attendanceSummary,
    scoreHistory,
    gameBreakdown,
    recommendedReviewChapters,
  };
}

export function evaluateGamificationUnlocks(studentId: string): void {
  const db = getDb();
  const student = db.users.find((u) => u.id === studentId);
  if (!student || student.role !== 'siswa') return;

  const prog = db.progress.find((p) => p.studentId === studentId);
  const games = db.gameRecords.filter((g) => g.studentId === studentId);
  const attempts = db.assessmentAttempts.filter((a) => a.studentId === studentId);

  const subCount = prog?.completedSubchapters.length ?? 0;
  const actCount = prog?.completedActivities.length ?? 0;
  const gameCount = games.length;
  const quizCount = attempts.length;

  const addBadge = (badgeId: string) => {
    if (!student.badges.includes(badgeId)) {
      student.badges.push(badgeId);
    }
  };

  if (subCount >= 5) addBadge('badge-starter');
  if (games.some((g) => g.gameId === 'retail_tycoon' && g.score >= 80)) addBadge('badge-tycoon');
  if (games.some((g) => g.gameId === 'cs_hero' && g.accuracy >= 80)) addBadge('badge-cs');
  if (games.some((g) => g.gameId === 'k3_challenge' && g.score >= 80)) addBadge('badge-k3');

  if (attempts.length > 0) {
    const avgQuiz = attempts.reduce((a, b) => a + b.score, 0) / attempts.length;
    if (avgQuiz >= 85) addBadge('badge-scholar');
  }
  if (actCount >= 5 && student.xp >= 1000) addBadge('badge-allround');

  for (const m of MISSIONS_SEED) {
    if (student.completedMissions.includes(m.id)) continue;
    let current = 0;
    if (m.metricKey === 'subchapters') current = subCount;
    else if (m.metricKey === 'games') current = gameCount;
    else if (m.metricKey === 'quizzes') current = quizCount;
    else if (m.metricKey === 'activities') current = actCount;

    if (current >= m.targetCount) {
      student.completedMissions.push(m.id);
      student.xp += m.xpReward;
    }
  }

  const { level, tier } = computeLevelAndTier(student.xp);
  student.level = level;
  student.tier = tier;
}

export { BADGES_SEED, MISSIONS_SEED };
