import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  Crown,
  FileSpreadsheet,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import type { PublicUser } from './types/index.ts';
import type { BootstrapPayload } from './utils/api.ts';
import { apiRequest, setAuthToken } from './utils/api.ts';
import { LoginPortal } from './components/LoginPortal.tsx';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { ParentDashboard } from './components/ParentDashboard.tsx';
import { AdminConsole } from './components/AdminConsole.tsx';
import { CurriculumView } from './components/CurriculumView.tsx';
import { AssessmentView } from './components/AssessmentView.tsx';
import { MarketverseArena } from './components/MarketverseArena.tsx';
import { ReportCenter } from './components/ReportCenter.tsx';
import { ProfileSecurityView } from './components/ProfileSecurityView.tsx';

type NavKey = 'dashboard' | 'curriculum' | 'arena' | 'assessments' | 'reports' | 'admin' | 'profile';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mvx_theme') === 'dark';
  });
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
  const [focusChapterId, setFocusChapterId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('mvx_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('mvx_theme', 'light');
    }
  }, [isDark]);

  const loadBootstrap = useCallback(async () => {
    const payload = await apiRequest<BootstrapPayload>('/api/bootstrap');
    setBootstrap(payload);
    setAuthUser(payload.user);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadBootstrap();
      } catch {
        if (active) setAuthUser(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadBootstrap]);

  // Real-time periodic sync & auto-logout check every 15s while logged in
  useEffect(() => {
    if (!authUser) return;
    const timer = setInterval(() => {
      loadBootstrap().catch(() => {
        // Automatic logout if session expired or revoked on server
        setAuthToken(null);
        setAuthUser(null);
        setBootstrap(null);
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [authUser, loadBootstrap]);

  const handleLoginSuccess = async (user: PublicUser) => {
    setAuthUser(user);
    setActiveNav(user.role === 'super_admin' || user.role === 'admin' ? 'admin' : 'dashboard');
    await loadBootstrap();
  };

  const handleLogout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthToken(null);
    setAuthUser(null);
    setBootstrap(null);
  };

  const handleMarkNotifRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    await loadBootstrap();
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070E24] text-slate-600 dark:text-slate-300 text-sm font-medium">
        Memuat ekosistem pembelajaran MARKETVERSE X...
      </div>
    );
  }

  if (!authUser || !bootstrap) {
    return (
      <>
        <LoginPortal
          onLoginSuccess={handleLoginSuccess}
          isDark={isDark}
          onToggleTheme={() => setIsDark((d) => !d)}
        />
        <OfflineIndicator />
      </>
    );
  }

  const role = bootstrap.user.role;
  const unreadNotifs = bootstrap.notifications.filter(
    (n) => !n.isReadBy.includes(bootstrap.user.id),
  );

  const navItems: { key: NavKey; label: string; icon: React.FC<{ className?: string }> }[] =
    role === 'orang_tua'
      ? [
          { key: 'dashboard', label: 'Pantau Anak', icon: LayoutDashboard },
          { key: 'reports', label: 'Laporan PDF', icon: FileSpreadsheet },
          { key: 'profile', label: 'Profil & Keamanan', icon: UserCog },
        ]
      : role === 'super_admin'
        ? [
            { key: 'admin', label: 'Dashboard Super Admin', icon: Crown },
            { key: 'dashboard', label: 'Analitik Kelas', icon: LayoutDashboard },
            { key: 'curriculum', label: 'Kurikulum 5 Bab', icon: BookOpen },
            { key: 'assessments', label: 'Evaluasi & Tugas', icon: ClipboardCheck },
            { key: 'arena', label: 'Marketverse Arena', icon: Gamepad2 },
            { key: 'reports', label: 'Laporan PDF', icon: FileSpreadsheet },
            { key: 'profile', label: 'Profil & Keamanan', icon: UserCog },
          ]
        : role === 'admin'
          ? [
              { key: 'admin', label: 'Dashboard Admin', icon: Shield },
              { key: 'dashboard', label: 'Analitik Kelas', icon: LayoutDashboard },
              { key: 'curriculum', label: 'Kurikulum 5 Bab', icon: BookOpen },
              { key: 'assessments', label: 'Evaluasi & Tugas', icon: ClipboardCheck },
              { key: 'arena', label: 'Marketverse Arena', icon: Gamepad2 },
              { key: 'reports', label: 'Laporan PDF', icon: FileSpreadsheet },
              { key: 'profile', label: 'Profil & Keamanan', icon: UserCog },
            ]
          : [
              { key: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
              { key: 'curriculum', label: 'Materi 5 Bab', icon: BookOpen },
              { key: 'arena', label: 'Marketverse Arena', icon: Gamepad2 },
              { key: 'assessments', label: 'Evaluasi & Tugas', icon: ClipboardCheck },
              { key: 'reports', label: 'Laporan PDF', icon: FileSpreadsheet },
              { key: 'profile', label: 'Profil & Keamanan', icon: UserCog },
            ];

  const currentNavLabel = navItems.find((n) => n.key === activeNav)?.label || 'Beranda';
  const avatarInitials = bootstrap.user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#070E24] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B193D] shrink-0">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <img
            src="/src/assets/images/school_emblem_badge_1794705063931.jpg"
            alt="Logo MARKETVERSE X"
            className="w-9 h-9 rounded-lg object-cover border border-blue-500/30 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-display text-base font-extrabold tracking-tight text-[#0B193D] dark:text-white truncate">
              {bootstrap.websiteConfig?.siteName || 'MARKETVERSE X'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {bootstrap.academic.subjectName}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setFocusChapterId(undefined);
                  setActiveNav(item.key);
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => setActiveNav('profile')}
            className="w-full flex items-center gap-2.5 text-left rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            {bootstrap.user.avatarUrl ? (
              <img
                src={bootstrap.user.avatarUrl}
                alt={bootstrap.user.name}
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: bootstrap.user.avatarColor || '#2563EB' }}
              >
                {avatarInitials}
              </div>
            )}
            <div className="text-xs min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">{bootstrap.user.name}</p>
              <p className="text-slate-500 dark:text-slate-400 capitalize truncate">
                {bootstrap.user.role.replace('_', ' ')} · @{bootstrap.user.username}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Header */}
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B193D]/95 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">
              {bootstrap.websiteConfig?.siteName || 'MARKETVERSE X'}{' '}
              <span className="mx-1.5 text-slate-400">/</span>{' '}
              <span className="text-slate-900 dark:text-white">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Ganti tema terang atau gelap"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((s) => !s)}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Buka notifikasi"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-mono font-bold text-white">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-4 space-y-3 z-40">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold">Notifikasi ({bootstrap.notifications.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                    {bootstrap.notifications.length === 0 ? (
                      <p className="text-slate-400">Belum ada notifikasi baru.</p>
                    ) : (
                      bootstrap.notifications.map((n) => {
                        const isRead = n.isReadBy.includes(bootstrap.user.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleMarkNotifRead(n.id)}
                            className={`rounded-lg border p-2.5 cursor-pointer ${
                              isRead
                                ? 'border-slate-200 dark:border-slate-800 opacity-75'
                                : 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30'
                            }`}
                          >
                            <p className="font-bold text-slate-900 dark:text-white">{n.title}</p>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveNav('profile')}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Profil & Keamanan Akun"
            >
              {bootstrap.user.avatarUrl ? (
                <img
                  src={bootstrap.user.avatarUrl}
                  alt={bootstrap.user.name}
                  className="w-5 h-5 rounded object-cover"
                />
              ) : (
                <UserCog className="w-4 h-4 text-blue-600" />
              )}
              <span className="max-w-[110px] truncate">{bootstrap.user.username}</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-10">
          {activeNav === 'dashboard' && role === 'siswa' && (
            <StudentDashboard
              data={bootstrap}
              onNavigate={(tab, chId) => {
                setFocusChapterId(chId);
                setActiveNav(tab);
              }}
            />
          )}

          {activeNav === 'dashboard' && (role === 'guru' || role === 'admin' || role === 'super_admin') && (
            <TeacherDashboard
              data={bootstrap}
              onRefresh={loadBootstrap}
              onNavigate={(tab) => setActiveNav(tab)}
            />
          )}

          {activeNav === 'dashboard' && role === 'orang_tua' && (
            <ParentDashboard data={bootstrap} onOpenReport={() => setActiveNav('reports')} />
          )}

          {activeNav === 'curriculum' && role !== 'orang_tua' && (
            <CurriculumView
              data={bootstrap}
              onRefresh={loadBootstrap}
              initialChapterId={focusChapterId}
              onOpenExamForChapter={(chId) => {
                setFocusChapterId(chId);
                setActiveNav('assessments');
              }}
            />
          )}

          {activeNav === 'arena' && role !== 'orang_tua' && (
            <MarketverseArena data={bootstrap} onRefresh={loadBootstrap} />
          )}

          {activeNav === 'assessments' && role !== 'orang_tua' && (
            <AssessmentView
              data={bootstrap}
              onRefresh={loadBootstrap}
              focusChapterId={focusChapterId}
            />
          )}

          {activeNav === 'reports' && <ReportCenter data={bootstrap} />}

          {activeNav === 'admin' && (role === 'admin' || role === 'super_admin') && (
            <AdminConsole data={bootstrap} onRefresh={loadBootstrap} />
          )}

          {activeNav === 'profile' && (
            <ProfileSecurityView
              data={bootstrap}
              onRefresh={loadBootstrap}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[82vw] bg-white dark:bg-[#0B193D] h-full p-5 flex flex-col justify-between z-10 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-base text-[#0B193D] dark:text-white">
                  MARKETVERSE X
                </span>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-semibold ${
                        activeNav === item.key
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 py-3 text-xs font-semibold mt-4"
            >
              <LogOut className="w-4 h-4" /> Keluar Akun
            </button>
          </div>
        </div>
      )}

      {/* Mobile Touch Bottom Bar */}
      <nav className="no-print fixed bottom-0 inset-x-0 z-20 lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B193D]/95 backdrop-blur-sm flex items-center justify-around py-1.5 px-1">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveNav(item.key)}
              className={`flex flex-col items-center justify-center min-h-[44px] px-2 text-[10px] font-semibold ${
                active ? 'text-blue-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[68px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <OfflineIndicator />
    </div>
  );
}
