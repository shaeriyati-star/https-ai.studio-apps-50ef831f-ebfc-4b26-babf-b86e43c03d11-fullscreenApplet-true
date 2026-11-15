import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { apiRequest, setAuthToken } from '../utils/api.ts';
import type { PublicUser, UserRole, WebsiteConfig } from '../types/index.ts';
import { PWAInstallButton } from './PWAControls.tsx';

interface LoginPortalProps {
  onLoginSuccess: (user: PublicUser) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

interface RolePortalConfig {
  role: UserRole;
  label: string;
  title: string;
  subtitle: string;
  scope: string;
  accentBg: string;
  icon: React.FC<{ className?: string }>;
}

const ROLE_PORTALS: RolePortalConfig[] = [
  {
    role: 'siswa',
    label: 'Siswa',
    title: 'Portal Login Siswa',
    subtitle: 'Masuk untuk mengakses materi 5 bab, simulasi game Marketverse Arena, kuis, tugas, XP, dan rapor.',
    scope: 'LMS 5 Bab, 6 Game Arena, XP, Level, Badge, Leaderboard & Rapor Pribadi',
    accentBg: 'bg-blue-600',
    icon: GraduationCap,
  },
  {
    role: 'guru',
    label: 'Guru',
    title: 'Portal Login Guru',
    subtitle: 'Kelola materi pembelajaran, bank soal, kuis, tugas, nilai siswa, dan pantau aktivitas belajar.',
    scope: 'Kelola Materi, Soal, Kuis, Evaluasi, Nilai Siswa & Laporan Kelas',
    accentBg: 'bg-indigo-600',
    icon: BookOpenCheck,
  },
  {
    role: 'admin',
    label: 'Admin',
    title: 'Portal Login Admin / Operator',
    subtitle: 'Kelola data guru, siswa, kelas, rombongan belajar, mata pelajaran, dan akun sekolah.',
    scope: 'Data Guru & Siswa, Kelas/Rombel, Mata Pelajaran, Impor/Ekspor Excel',
    accentBg: 'bg-slate-800 dark:bg-sky-700',
    icon: ShieldCheck,
  },
  {
    role: 'super_admin',
    label: 'Super Admin',
    title: 'Portal Login Super Admin',
    subtitle: 'Otoritas penuh mengelola seluruh sistem, hak akses role, konfigurasi website, sesi & database.',
    scope: 'Akses Penuh Sistem, Role RBAC, Konfigurasi Website, Sesi & Database',
    accentBg: 'bg-purple-700',
    icon: Crown,
  },
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    title: 'Portal Login Orang Tua',
    subtitle: 'Pantau kehadiran, nilai setiap bab, aktivitas game, dan unduh laporan belajar anak.',
    scope: 'Pantau Kehadiran, Nilai Per Bab, Aktivitas Belajar & Rapor Anak',
    accentBg: 'bg-amber-600',
    icon: Users,
  },
];

const REMEMBER_IDENTIFIER_KEY = 'mvx_remember_identifier';

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  isDark,
  onToggleTheme,
}) => {
  const [view, setView] = useState<'landing' | 'login'>('landing');
  const [selectedRole, setSelectedRole] = useState<UserRole>('siswa');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [siteConfig, setSiteConfig] = useState<WebsiteConfig | null>(null);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(true);

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'done'>('request');
  const [forgotId, setForgotId] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');
  const [devCodePreview, setDevCodePreview] = useState<string | undefined>(undefined);

  // First-time Super Admin Setup modal state (only shown if no super_admin exists)
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupErr, setSetupErr] = useState('');

  useEffect(() => {
    apiRequest<{ hasSuperAdmin: boolean; websiteConfig: WebsiteConfig }>('/api/auth/setup-status')
      .then((res) => {
        setHasSuperAdmin(res.hasSuperAdmin);
        setSiteConfig(res.websiteConfig);
      })
      .catch(() => {});

    const savedId = localStorage.getItem(REMEMBER_IDENTIFIER_KEY);
    if (savedId) {
      setIdentifier(savedId);
      setRememberMe(true);
    }
  }, []);

  const activePortal = ROLE_PORTALS.find((p) => p.role === selectedRole) || ROLE_PORTALS[0];
  const ActiveRoleIcon = activePortal.icon;

  const siteName = siteConfig?.siteName || 'MARKETVERSE X';
  const siteTagline = siteConfig?.tagline || 'DIGITAL MARKETING LEARNING & GAME ACADEMY';
  const copyrightText =
    siteConfig?.copyrightText ||
    '© 2026 MARKETVERSE X · Digital Marketing Learning & Game Academy. Seluruh Hak Cipta Dilindungi.';

  const openRoleLogin = (role: UserRole) => {
    setSelectedRole(role);
    const savedId = localStorage.getItem(REMEMBER_IDENTIFIER_KEY);
    setIdentifier(savedId || '');
    setRememberMe(Boolean(savedId));
    setPassword('');
    setShowPass(false);
    setError('');
    setView('login');
  };

  const switchRoleTab = (role: UserRole) => {
    setSelectedRole(role);
    const savedId = localStorage.getItem(REMEMBER_IDENTIFIER_KEY);
    setIdentifier(savedId || '');
    setPassword('');
    setShowPass(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: PublicUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          rememberMe,
          expectedRole: selectedRole,
        }),
      });
      if (rememberMe) {
        localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim());
      } else {
        localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
      }
      setAuthToken(data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');
    setForgotLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        message: string;
        devCodePreview?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotId.trim() }),
      });
      setForgotMsg(res.message);
      setDevCodePreview(res.devCodePreview);
      setForgotStep('verify');
    } catch (err) {
      setForgotErr(err instanceof Error ? err.message : 'Gagal memproses permintaan.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr('');
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotErr('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: forgotId.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPass,
        }),
      });
      setForgotMsg(res.message);
      setForgotStep('done');
    } catch (err) {
      setForgotErr(err instanceof Error ? err.message : 'Gagal mereset kata sandi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSetupFirstSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupErr('');
    setSetupLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: PublicUser }>('/api/auth/setup-superadmin', {
        method: 'POST',
        body: JSON.stringify({
          name: setupName,
          username: setupUsername,
          email: setupEmail,
          password: setupPassword,
        }),
      });
      setAuthToken(data.token);
      setSetupOpen(false);
      onLoginSuccess(data.user);
    } catch (err) {
      setSetupErr(err instanceof Error ? err.message : 'Gagal membuat akun Super Admin.');
    } finally {
      setSetupLoading(false);
    }
  };

  const renderBrandLogo = (size: 'sm' | 'md' = 'sm') => (
    <div className="flex items-center gap-2.5 shrink-0">
      <div
        className={`${
          size === 'md' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg'
        } overflow-hidden border border-blue-500/30 bg-[#0B193D] flex items-center justify-center shrink-0 shadow-xs`}
      >
        <img
          src="/src/assets/images/school_emblem_badge_1794705063931.jpg"
          alt="Logo MARKETVERSE X"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="leading-tight">
        <span className="block font-display text-sm sm:text-base font-extrabold tracking-tight text-[#0B193D] dark:text-white">
          {siteName}
        </span>
        <span className="block text-[10px] font-semibold tracking-wider text-blue-600 dark:text-blue-400">
          {siteTagline}
        </span>
      </div>
    </div>
  );

  const renderForgotModal = () =>
    forgotOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Pemulihan Kata Sandi
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Tutup modal pemulihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {forgotStep === 'request' && (
            <form onSubmit={handleRequestResetCode} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Masukkan username atau email terdaftar Anda. Sistem akan menerbitkan kode verifikasi 6 digit yang berlaku selama 15 menit.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username atau Email
                </label>
                <input
                  type="text"
                  required
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                  placeholder="Contoh: alya.putri atau email@marketverse.sch.id"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              {forgotErr && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {forgotErr}
                </div>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Kirim Kode Verifikasi</span>
              </button>
            </form>
          )}

          {forgotStep === 'verify' && (
            <form onSubmit={handleConfirmReset} className="space-y-3.5">
              {forgotMsg && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <p className="font-semibold">{forgotMsg}</p>
                  {devCodePreview && (
                    <p className="font-mono text-[11px]">
                      Kode Verifikasi Aktif: <strong className="text-blue-700 dark:text-amber-400">{devCodePreview}</strong>
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Verifikasi (6 Digit)
                </label>
                <input
                  type="text"
                  required
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                  placeholder="Masukkan 6 digit kode"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono tracking-widest"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru (min. 8 karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={forgotConfirmPass}
                  onChange={(e) => setForgotConfirmPass(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              {forgotErr && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {forgotErr}
                </div>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Verifikasi &amp; Simpan Kata Sandi</span>
              </button>
            </form>
          )}

          {forgotStep === 'done' && (
            <div className="space-y-4 text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{forgotMsg}</p>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          )}
        </div>
      </div>
    );

  const renderSetupSuperModal = () =>
    setupOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
        <form
          onSubmit={handleSetupFirstSuperAdmin}
          className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span>Aktivasi Super Admin Pertama</span>
            </h3>
            <button type="button" onClick={() => setSetupOpen(false)} className="p-1 text-slate-400 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Belum ada akun Super Admin aktif. Daftarkan Super Admin utama untuk mengelola sistem.
          </p>
          <input
            type="text"
            required
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            placeholder="Nama Lengkap Super Admin"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
          />
          <input
            type="text"
            required
            value={setupUsername}
            onChange={(e) => setSetupUsername(e.target.value)}
            placeholder="Username (contoh: superadmin)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
          />
          <input
            type="email"
            required
            value={setupEmail}
            onChange={(e) => setSetupEmail(e.target.value)}
            placeholder="Email Resmi"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            value={setupPassword}
            onChange={(e) => setSetupPassword(e.target.value)}
            placeholder="Kata Sandi (min. 8 karakter)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
          />
          {setupErr && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700">
              {setupErr}
            </div>
          )}
          <button
            type="submit"
            disabled={setupLoading}
            className="w-full rounded-lg bg-purple-700 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 cursor-pointer"
          >
            {setupLoading ? 'Menyimpan...' : 'Buat & Masuk sebagai Super Admin'}
          </button>
        </form>
      </div>
    );

  if (view === 'login') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070E24] text-slate-900 dark:text-slate-100">
        {/* Top Bar */}
        <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B193D]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            <button
              type="button"
              onClick={() => setView('landing')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali ke Beranda</span>
              <span className="sm:hidden">Beranda</span>
            </button>

            {renderBrandLogo('sm')}

            <div className="flex items-center gap-2">
              <PWAInstallButton compact />
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Ubah mode tampilan"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Dedicated Login Workspace */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-10">
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B193D] dark:text-white">
                {siteName}
              </h1>
              <p className="text-xs sm:text-sm font-bold tracking-wider text-blue-600 dark:text-amber-400">
                {siteTagline}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Pilih portal peran Anda lalu masuk menggunakan username atau email serta kata sandi terdaftar.
              </p>
            </div>

            {!hasSuperAdmin && (
              <div className="rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                  <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>Belum ada Super Admin aktif. Anda dapat membuat akun Super Admin pertama sekarang.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="rounded-lg bg-purple-700 px-3.5 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
                >
                  Buat Super Admin Pertama
                </button>
              </div>
            )}

            {/* Separated Role Login Menu Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {ROLE_PORTALS.map((portal) => {
                const Icon = portal.icon;
                const isActive = selectedRole === portal.role;
                return (
                  <button
                    key={portal.role}
                    type="button"
                    onClick={() => switchRoleTab(portal.role)}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer min-h-[76px] ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-500'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-display text-xs sm:text-sm font-bold leading-tight">
                      {portal.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Login Form Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="md:col-span-5 bg-gradient-to-br from-[#0B193D] via-[#132963] to-[#2E1065] text-white p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {renderBrandLogo('md')}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                    <ActiveRoleIcon className="w-4 h-4" />
                    <span>{activePortal.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {activePortal.subtitle}
                  </p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    Kewenangan Akses
                  </p>
                  <p className="text-xs text-slate-200 leading-relaxed">{activePortal.scope}</p>
                </div>
              </div>

              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Masuk Portal {activePortal.label}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Dilindungi autentikasi terenkripsi &amp; pembatasan percobaan gagal.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="login-identifier"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Username atau Email
                    </label>
                    <input
                      id="login-identifier"
                      type="text"
                      required
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Masukkan username atau email"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPass ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-3 pr-11 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Masukkan password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Tampilkan atau sembunyikan password"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span>Ingat saya</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotId(identifier);
                        setForgotCode('');
                        setForgotNewPass('');
                        setForgotConfirmPass('');
                        setForgotErr('');
                        setForgotMsg('');
                        setDevCodePreview(undefined);
                        setForgotStep('request');
                        setForgotOpen(true);
                      }}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer min-h-[36px]"
                    >
                      Lupa password?
                    </button>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold tracking-wide text-white hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer min-h-[48px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>MEMVERIFIKASI SESI...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>MASUK</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              {copyrightText}
            </footer>
          </div>
        </main>

        {renderForgotModal()}
        {renderSetupSuperModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070E24] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B193D]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <a href="#top" className="shrink-0">
            {renderBrandLogo('sm')}
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#kurikulum" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
              Kurikulum
            </a>
            <a href="#arena" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
              Arena Game
            </a>
            <a href="#laporan" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
              Laporan PDF
            </a>
            <a href="#peran" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0">
              Portal Masuk
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Ubah mode tampilan"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => openRoleLogin('siswa')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B193D] dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer min-h-[38px]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>MASUK</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <main id="top" className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 pt-8 pb-14 space-y-14">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-6 py-1">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wider text-blue-600 dark:text-blue-400">
                SMK Kelas X · Program Keahlian Pemasaran · Dasar-Dasar Pemasaran
              </p>
              <h1
                className="font-display font-extrabold text-[#0B193D] dark:text-white leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 3.5vw, 3rem)', textWrap: 'balance' }}
              >
                {siteTagline}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Belajar Pemasaran, Bermain, Berprestasi, Menjadi Profesional. Ekosistem pembelajaran terpadu dengan 5 bab kurikulum ritel, 6 simulasi bisnis interaktif, pemantauan orang tua, dan rapor PDF 5 halaman.
              </p>
            </div>

            {/* Separated Role Portal Entry Buttons */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-4">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Portal Masuk Terintegrasi Berdasarkan Peran
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih portal peran Anda untuk menuju halaman autentikasi resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLE_PORTALS.map((portal) => {
                  const Icon = portal.icon;
                  return (
                    <button
                      key={portal.role}
                      type="button"
                      onClick={() => openRoleLogin(portal.role)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-4 py-3 text-left hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer group min-h-[56px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-white shrink-0 ${portal.accentBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Login {portal.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Portal {portal.label.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[340px] bg-[#0B193D]">
            <img
              src="/src/assets/images/hero_marketverse_academy_1794705062946.jpg"
              alt="Studio pembelajaran pemasaran ritel modern MARKETVERSE X"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070E24]/95 via-[#070E24]/40 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white space-y-2">
              <p className="text-xs font-semibold text-amber-400">
                SMK Negeri 1 Nusantara Bisnis &amp; Pemasaran · TP 2026/2027
              </p>
              <h3 className="font-display text-xl sm:text-2xl font-bold leading-snug">
                Simulasi Bisnis Ritel Modern &amp; Penilaian Berbasis Kompetensi
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 max-w-lg">
                Setiap aktivitas membaca subbab, ujian, dan permainan di Marketverse Arena terhubung langsung ke perhitungan rapor otomatis dan dashboard orang tua.
              </p>
            </div>
          </div>
        </section>

        {/* Full-Width 4-Column Highlights */}
        <section id="kurikulum" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: '5 Bab Kurikulum SMK',
              metric: '62 Subbab Terstruktur',
              desc: 'Proses bisnis ritel, teknologi digital & AI, profesi & peluang usaha, K3 ritel, serta komunikasi pelanggan.',
            },
            {
              title: '6 Game Marketverse Arena',
              metric: 'Simulasi Bisnis Nyata',
              desc: 'Retail Tycoon, Marketing Battle, CS Hero, Digital Marketing Master, K3 Challenge, dan Career Quest.',
            },
            {
              title: 'Penilaian Terbobot Otomatis',
              metric: 'Pre-Test hingga UAS',
              desc: 'Menghitung nilai pengetahuan, keterampilan, proyek, dan game edukasi sesuai bobot guru.',
            },
            {
              title: 'Laporan PDF 5 Halaman',
              metric: 'Cetak Chrome & Excel',
              desc: 'Format A4 resmi sekolah lengkap dengan grafik nilai, pencapaian XP, analisis kompetensi, dan pengesahan.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
            >
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{card.metric}</p>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{card.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </section>

        {/* Separated Role Portal Matrix */}
        <section id="peran" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Lima Tingkatan Hak Akses Terisolasi (RBAC)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Setiap akun diarahkan otomatis ke dashboard sesuai kewenangannya.
              </p>
            </div>
            <span id="arena" className="text-xs font-mono text-slate-500 dark:text-slate-400">
              HTTPS · HttpOnly Cookie · Android / iOS / Desktop
            </span>
          </div>

          <div id="laporan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ROLE_PORTALS.map((portal) => {
              const Icon = portal.icon;
              return (
                <div
                  key={portal.role}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-[#0B193D] dark:text-amber-400">
                        {portal.label}
                      </span>
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white ${portal.accentBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {portal.scope}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRoleLogin(portal.role)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-h-[38px]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk {portal.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B193D] py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {copyrightText}
      </footer>

      {renderForgotModal()}
      {renderSetupSuperModal()}
    </div>
  );
};
