import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Crown,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest } from '../utils/api.ts';
import type { PublicUser, UserRole } from '../types/index.ts';

interface AdminConsoleProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ data, onRefresh }) => {
  const isSuperAdmin = data.user.role === 'super_admin';
  const [tab, setTab] = useState<'users' | 'classes' | 'academic' | 'config' | 'audit'>('users');
  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // New user form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Marketverse123!');
  const [role, setRole] = useState<UserRole>('siswa');
  const [classId, setClassId] = useState(data.classes[0]?.id || 'cls-xpm1');
  const [nisNisn, setNisNisn] = useState('');
  const [nip, setNip] = useState('');
  const [linkedStudentId, setLinkedStudentId] = useState(
    data.users.find((u) => u.role === 'siswa')?.id || '',
  );

  // Edit user modal
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('siswa');
  const [editClassId, setEditClassId] = useState('');
  const [editNis, setEditNis] = useState('');
  const [editNip, setEditNip] = useState('');

  // Bulk Creation Modal (Massal Siswa / Guru)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'siswa' | 'guru'>('siswa');
  const [bulkClassId, setBulkClassId] = useState(data.classes[0]?.id || 'cls-xpm1');
  const [bulkRawLines, setBulkRawLines] = useState('');
  const [bulkPrefix, setBulkPrefix] = useState('Siswa X PM');
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkDefaultPass, setBulkDefaultPass] = useState('Marketverse123!');

  // Classes & Subjects
  const [clsName, setClsName] = useState('');
  const [clsTeacher, setClsTeacher] = useState('Ratna Sari, S.E., M.Pd.');
  const [subjCode, setSubjCode] = useState('');
  const [subjName, setSubjName] = useState('');
  const [subjHours, setSubjHours] = useState(4);
  const [subjTeacher, setSubjTeacher] = useState('Ratna Sari, S.E., M.Pd.');

  // Academic settings form
  const [schoolName, setSchoolName] = useState(data.academic.schoolName);
  const [schoolAddress, setSchoolAddress] = useState(data.academic.schoolAddress);
  const [principalName, setPrincipalName] = useState(data.academic.principalName);
  const [subjectTeacherName, setSubjectTeacherName] = useState(data.academic.subjectTeacherName);

  // Super Admin Website Config
  const [siteName, setSiteName] = useState(data.websiteConfig?.siteName || 'MARKETVERSE X');
  const [tagline, setTagline] = useState(
    data.websiteConfig?.tagline || 'DIGITAL MARKETING LEARNING & GAME ACADEMY',
  );
  const [copyrightText, setCopyrightText] = useState(data.websiteConfig?.copyrightText || '');
  const [allowForgot, setAllowForgot] = useState(data.websiteConfig?.allowForgotPassword ?? true);
  const [maxAttempts, setMaxAttempts] = useState(data.websiteConfig?.maxLoginAttempts ?? 5);
  const [lockoutMinutes, setLockoutMinutes] = useState(data.websiteConfig?.lockoutMinutes ?? 5);
  const [sessionTimeout, setSessionTimeout] = useState(
    data.websiteConfig?.sessionTimeoutMinutes ?? 1440,
  );

  const students = data.users.filter((u) => u.role === 'siswa');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nisNisn || '').toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q)
      );
    });
  }, [data.users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrMsg('');
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          role,
          classId,
          nisNisn,
          nip,
          linkedStudentId,
        }),
      });
      setName('');
      setUsername('');
      setEmail('');
      setNisNisn('');
      setNip('');
      await onRefresh();
      setMsg('Akun pengguna baru berhasil dibuat dan disimpan ke database.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal membuat akun.');
    }
  };

  const openEditModal = (u: PublicUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username || '');
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditClassId(u.classId || data.classes[0]?.id || '');
    setEditNis(u.nisNisn || '');
    setEditNip(u.nip || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setMsg('');
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          email: editEmail,
          role: editRole,
          classId: editClassId,
          nisNisn: editNis,
          nip: editNip,
        }),
      });
      setEditingUser(null);
      await onRefresh();
      setMsg(`Akun ${editName} berhasil diperbarui.`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal memperbarui akun.');
    }
  };

  const handleToggleUser = async (id: string) => {
    setErrMsg('');
    setMsg('');
    try {
      await apiRequest(`/api/admin/users/${id}/toggle`, { method: 'PATCH' });
      await onRefresh();
      setMsg('Status aktif akun berhasil diubah.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mengubah status.');
    }
  };

  const handleDeleteUser = async (u: PublicUser) => {
    setErrMsg('');
    setMsg('');
    try {
      await apiRequest(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      await onRefresh();
      setMsg(`Akun ${u.name} telah dihapus.`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal menghapus akun.');
    }
  };

  const handleAdminResetPassword = async (u: PublicUser) => {
    setErrMsg('');
    setMsg('');
    try {
      const res = await apiRequest<{ temporaryPassword: string }>(
        `/api/admin/users/${u.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      await onRefresh();
      setMsg(
        `Kata sandi ${u.name} (${u.username}) berhasil direset. Kata sandi sementara: ${res.temporaryPassword}`,
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mereset kata sandi.');
    }
  };

  const handleExportExcel = () => {
    const rows = filteredUsers.map((u) => {
      const cls = data.classes.find((c) => c.id === u.classId)?.name || '-';
      return {
        Username: u.username,
        Nama: u.name,
        Email: u.email,
        Peran: u.role,
        Kelas: u.role === 'siswa' ? cls : '-',
        'NIS/NISN': u.nisNisn || '-',
        NIP: u.nip || '-',
        Status: u.isActive ? 'Aktif' : 'Nonaktif',
        'Login Terakhir': u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : '-',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Akun MARKETVERSE X');
    XLSX.writeFile(wb, `marketverse-x-akun-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMsg(`Berhasil mengekspor ${rows.length} data akun ke Excel.`);
  };

  const handleDownloadTemplateExcel = () => {
    const sample = [
      {
        Nama: 'Dewi Anggraini',
        Username: 'dewi.anggraini',
        Email: 'dewi.anggraini@marketverse.sch.id',
        Password: 'Siswa2026!',
        Peran: 'siswa',
        Kelas: data.classes[0]?.name || 'X PM 1',
        NIS_NISN: '261050 / 0098451250',
        NIP: '',
      },
      {
        Nama: 'Ahmad Hidayat, S.Pd.',
        Username: 'guru.ahmad',
        Email: 'ahmad@marketverse.sch.id',
        Password: 'Guru2026!',
        Peran: 'guru',
        Kelas: '',
        NIS_NISN: '',
        NIP: '198802142015011003',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Akun');
    XLSX.writeFile(wb, 'template-import-akun-marketverse-x.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg('');
    setErrMsg('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const items = rows.map((r) => {
        const peranRaw = String(r.Peran || r.role || 'siswa').trim().toLowerCase();
        const validRole: UserRole =
          peranRaw === 'guru' || peranRaw === 'admin' || peranRaw === 'orang_tua' || peranRaw === 'super_admin'
            ? (peranRaw as UserRole)
            : 'siswa';
        const clsNameVal = String(r.Kelas || r.className || '').trim().toLowerCase();
        const matchedClass = data.classes.find((c) => c.name.toLowerCase() === clsNameVal);
        return {
          name: String(r.Nama || r.name || '').trim(),
          username: String(r.Username || r.username || '').trim(),
          email: String(r.Email || r.email || '').trim(),
          password: String(r.Password || r.password || 'Marketverse123!'),
          role: validRole,
          classId: matchedClass?.id || data.classes[0]?.id,
          nisNisn: String(r.NIS_NISN || r.nisNisn || ''),
          nip: String(r.NIP || r.nip || ''),
        };
      });

      const res = await apiRequest<{
        createdCount: number;
        skipped: { email: string; reason: string }[];
      }>('/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      await onRefresh();
      setMsg(
        `Impor Excel selesai: ${res.createdCount} akun berhasil dibuat, ${res.skipped.length} dilewati.`,
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mengimpor file Excel.');
    }
  };

  const handleGenerateBulkRaw = () => {
    const lines: string[] = [];
    const stamp = Date.now().toString().slice(-4);
    for (let i = 1; i <= bulkCount; i++) {
      const slug = `${bulkMode}.${stamp}.${i}`;
      const label =
        bulkMode === 'siswa'
          ? `${bulkPrefix} ${i}, ${slug}, ${slug}@marketverse.sch.id, ${bulkDefaultPass}, 26${stamp}${i}`
          : `Guru Pemasaran ${stamp}-${i}, ${slug}, ${slug}@marketverse.sch.id, ${bulkDefaultPass}, 1990010${i}`;
      lines.push(label);
    }
    setBulkRawLines(lines.join('\n'));
  };

  const handleSubmitBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrMsg('');
    try {
      const items = bulkRawLines
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [nm, usr, em, pwd, codeId] = line.split(',').map((s) => s.trim());
          return {
            name: nm,
            username: usr,
            email: em,
            password: pwd || bulkDefaultPass,
            role: bulkMode,
            classId: bulkMode === 'siswa' ? bulkClassId : undefined,
            nisNisn: bulkMode === 'siswa' ? codeId || '-' : undefined,
            nip: bulkMode === 'guru' ? codeId || '-' : undefined,
          };
        });

      const res = await apiRequest<{
        createdCount: number;
        skipped: { email: string; reason: string }[];
      }>('/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      setBulkOpen(false);
      setBulkRawLines('');
      await onRefresh();
      setMsg(
        `Pembuatan akun ${bulkMode} massal selesai: ${res.createdCount} dibuat, ${res.skipped.length} dilewati.`,
      );
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal membuat akun massal.');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: clsName, homeroomTeacher: clsTeacher }),
    });
    setClsName('');
    await onRefresh();
    setMsg('Kelas baru berhasil ditambahkan.');
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({
        code: subjCode,
        name: subjName,
        hoursPerWeek: subjHours,
        teacherName: subjTeacher,
      }),
    });
    setSubjCode('');
    setSubjName('');
    await onRefresh();
    setMsg('Mata pelajaran berhasil ditambahkan.');
  };

  const handleDeleteSubject = async (id: string) => {
    await apiRequest(`/api/admin/subjects/${id}`, { method: 'DELETE' });
    await onRefresh();
    setMsg('Mata pelajaran dihapus.');
  };

  const handleActivateAcademic = async (academicId?: string) => {
    await apiRequest('/api/admin/academic/activate', {
      method: 'POST',
      body: JSON.stringify({
        academicId: academicId || data.academic.id,
        schoolName,
        schoolAddress,
        principalName,
        subjectTeacherName,
      }),
    });
    await onRefresh();
    setMsg('Pengaturan tahun pelajaran, semester, dan identitas sekolah tersimpan.');
  };

  const handleSaveWebsiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrMsg('');
    try {
      await apiRequest('/api/superadmin/website-config', {
        method: 'PUT',
        body: JSON.stringify({
          siteName,
          tagline,
          copyrightText,
          allowForgotPassword: allowForgot,
          maxLoginAttempts: maxAttempts,
          lockoutMinutes,
          sessionTimeoutMinutes: sessionTimeout,
        }),
      });
      await onRefresh();
      setMsg('Konfigurasi website dan kebijakan keamanan login berhasil diperbarui.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.');
    }
  };

  const handleRevokeAnySession = async (sessionId: string) => {
    await apiRequest(`/api/superadmin/sessions/${sessionId}/revoke`, { method: 'POST' });
    await onRefresh();
    setMsg('Sesi pengguna berhasil dicabut oleh Super Admin.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            {isSuperAdmin ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>
              {isSuperAdmin ? 'Konsol Utama Super Administrator' : 'Konsol Admin / Operator Sekolah'}
            </span>
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Manajemen Akun, Rombel, Hak Akses &amp; Keamanan
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
            {[
              { id: 'users', label: 'Akun Pengguna' },
              { id: 'classes', label: 'Kelas & Mapel' },
              { id: 'academic', label: 'Tahun & Identitas' },
              ...(isSuperAdmin ? [{ id: 'config', label: 'Website & Role' }] : []),
              { id: 'audit', label: 'Keamanan & Sesi' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <a
            href="/api/admin/backup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B193D] dark:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white"
          >
            <Download className="w-3.5 h-3.5" /> Backup JSON
          </a>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          {msg}
        </div>
      )}
      {errMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {errMsg}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-5">
          {/* Bulk & Excel Action Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkMode('siswa');
                  setBulkOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Buat Siswa Massal
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkMode('guru');
                  setBulkOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Buat Guru Massal
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Template Excel
              </button>
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-600" /> Impor Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor Excel ({filteredUsers.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Single Create Form */}
            <form
              onSubmit={handleCreateUser}
              className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 h-fit"
            >
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Tambah Akun Baru</span>
              </h3>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (contoh: budi.siswa)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Sekolah"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata Sandi Awal"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
              >
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="orang_tua">Orang Tua</option>
                {isSuperAdmin && <option value="admin">Admin / Operator</option>}
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>

              {role === 'siswa' && (
                <>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  >
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={nisNisn}
                    onChange={(e) => setNisNisn(e.target.value)}
                    placeholder="NIS / NISN"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </>
              )}

              {(role === 'guru' || role === 'admin' || role === 'super_admin') && (
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="NIP / Kode Pegawai"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              )}

              {role === 'orang_tua' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Tautkan ke Siswa (Anak)
                  </label>
                  <select
                    value={linkedStudentId}
                    onChange={(e) => setLinkedStudentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Simpan Akun Baru
              </button>
            </form>

            {/* User List with Search, Role Filter, Edit, Reset Password, Toggle, Delete */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Daftar Akun ({filteredUsers.length})</span>
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama/username/email..."
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="all">Semua Role</option>
                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="siswa">Siswa</option>
                    <option value="orang_tua">Orang Tua</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-2">Identitas</th>
                      <th className="py-2 px-2">Peran</th>
                      <th className="py-2 px-2">Keterangan</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredUsers.map((u) => {
                      const linkedChild = u.linkedStudentId
                        ? data.users.find((s) => s.id === u.linkedStudentId)?.name
                        : null;
                      const cls = u.classId
                        ? data.classes.find((c) => c.id === u.classId)?.name
                        : null;
                      const canManageTarget =
                        u.id !== data.user.id &&
                        (isSuperAdmin || (u.role !== 'super_admin' && u.role !== 'admin'));

                      return (
                        <tr key={u.id}>
                          <td className="py-2.5 px-2">
                            <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              @{u.username} · {u.email}
                            </p>
                          </td>
                          <td className="py-2.5 px-2 capitalize font-semibold">
                            {u.role.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">
                            {cls || (linkedChild ? `Orang tua: ${linkedChild}` : u.nip || '-')}
                          </td>
                          <td className="py-2.5 px-2">
                            <button
                              type="button"
                              disabled={!canManageTarget}
                              onClick={() => handleToggleUser(u.id)}
                              className={`rounded px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${
                                u.isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {u.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              {canManageTarget && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(u)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                                    title="Edit Akun"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdminResetPassword(u)}
                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                                    title="Reset Kata Sandi"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                    title="Hapus Akun"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'classes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form
              onSubmit={handleCreateClass}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h3 className="font-display text-base font-bold">Tambah Kelas &amp; Rombongan Belajar</h3>
              <input
                type="text"
                required
                value={clsName}
                onChange={(e) => setClsName(e.target.value)}
                placeholder="Contoh: X PM 3"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                type="text"
                required
                value={clsTeacher}
                onChange={(e) => setClsTeacher(e.target.value)}
                placeholder="Nama Wali Kelas"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                Simpan Kelas
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-base font-bold">Daftar Kelas Aktif</h3>
              {data.classes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                    <p className="text-slate-500">{c.major} · Wali: {c.homeroomTeacher}</p>
                  </div>
                  <span className="font-mono text-blue-600 font-bold">
                    {students.filter((s) => s.classId === c.id).length} Siswa
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form
              onSubmit={handleCreateSubject}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Kelola Mata Pelajaran</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={subjCode}
                  onChange={(e) => setSubjCode(e.target.value)}
                  placeholder="Kode Mapel (DDP-X-04)"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                />
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={subjHours}
                  onChange={(e) => setSubjHours(Number(e.target.value))}
                  placeholder="Jam/Minggu"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <input
                type="text"
                required
                value={subjName}
                onChange={(e) => setSubjName(e.target.value)}
                placeholder="Nama Mata Pelajaran"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={subjTeacher}
                onChange={(e) => setSubjTeacher(e.target.value)}
                placeholder="Guru Pengampu"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Tambah Mata Pelajaran
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-base font-bold">Daftar Mata Pelajaran</h3>
              {(data.subjects || []).map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      <span className="font-mono text-blue-600 mr-1.5">{s.code}</span>
                      {s.name}
                    </p>
                    <p className="text-slate-500">
                      {s.grade} · {s.hoursPerWeek} JP/Minggu · {s.teacherName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(s.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Tahun Pelajaran &amp; Semester Aktif</span>
            </h3>
            {data.academicSettings.map((ac) => (
              <div
                key={ac.id}
                className={`rounded-lg border p-3.5 flex items-center justify-between text-xs ${
                  ac.isActive ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <p className="font-bold">{ac.academicYear} — Semester {ac.semester}</p>
                  <p className="text-slate-500">{ac.subjectName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleActivateAcademic(ac.id)}
                  className={`rounded px-3 py-1.5 font-semibold cursor-pointer ${
                    ac.isActive ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {ac.isActive ? 'Aktif' : 'Aktifkan'}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold">Identitas Sekolah untuk Rapor PDF</h3>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              placeholder="Nama Sekolah"
            />
            <input
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              placeholder="Alamat Sekolah"
            />
            <input
              type="text"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              placeholder="Kepala Sekolah"
            />
            <input
              type="text"
              value={subjectTeacherName}
              onChange={(e) => setSubjectTeacherName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              placeholder="Guru Mata Pelajaran"
            />
            <button
              type="button"
              onClick={() => handleActivateAcademic()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Perbarui Identitas Rapor
            </button>
          </div>
        </div>
      )}

      {tab === 'config' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveWebsiteConfig}
            className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-600" />
              <span>Konfigurasi Website &amp; Keamanan Login</span>
            </h3>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama Aplikasi</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tagline / Judul Akademi</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Teks Hak Cipta</label>
              <input
                type="text"
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Maks Gagal Login</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kunci (Menit)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={lockoutMinutes}
                  onChange={(e) => setLockoutMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sesi (Menit)</label>
                <input
                  type="number"
                  min={30}
                  max={10080}
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={allowForgot}
                onChange={(e) => setAllowForgot(e.target.checked)}
              />
              <span>Aktifkan fitur Lupa Password mandiri di halaman login</span>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-purple-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-800 cursor-pointer"
            >
              Simpan Konfigurasi Website
            </button>
          </form>

          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold">Matriks Role &amp; Hak Akses Sistem</h3>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
              {(data.roles || []).map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{r.displayName}</span>
                    <span className="font-mono text-[11px] text-blue-600">{r.role}</span>
                  </div>
                  <p className="text-slate-500">{r.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audit Log Sistem ({data.auditLogs.length})</span>
            </h3>
            <div className="space-y-2 text-xs max-h-[380px] overflow-y-auto">
              {data.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-600 mr-2">{log.action}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{log.userName}</span>
                    <p className="text-slate-500 mt-0.5">{log.detail}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-base font-bold">
                Percobaan Login Terbaru ({(data.loginAttempts || []).length})
              </h3>
              <div className="space-y-2 text-xs max-h-52 overflow-y-auto">
                {(data.loginAttempts || []).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{att.identifier}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {att.deviceLabel} · {att.ipAddress} · {att.reason}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                        att.success
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                      }`}
                    >
                      {att.success ? 'Sukses' : 'Gagal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="font-display text-base font-bold">
                  Sesi Aktif Pengguna ({(data.activeSessions || []).length})
                </h3>
                <div className="space-y-2 text-xs max-h-52 overflow-y-auto">
                  {(data.activeSessions || []).map((sess) => {
                    const owner = data.users.find((u) => u.id === sess.userId);
                    return (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {owner?.name || sess.userId} ({owner?.role || '-'})
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {sess.deviceLabel} · {sess.ipAddress}
                          </p>
                        </div>
                        {!sess.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeAnySession(sess.id)}
                            className="rounded border border-red-300 px-2 py-1 text-[11px] font-semibold text-red-600 cursor-pointer shrink-0"
                          >
                            Cabut
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-bold">Edit Akun Pengguna</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nama Lengkap"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <input
              type="text"
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono"
            />
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            {isSuperAdmin && (
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
              >
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="orang_tua">Orang Tua</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            )}
            {editRole === 'siswa' && (
              <>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                >
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editNis}
                  onChange={(e) => setEditNis(e.target.value)}
                  placeholder="NIS / NISN"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </>
            )}
            {(editRole === 'guru' || editRole === 'admin' || editRole === 'super_admin') && (
              <input
                type="text"
                value={editNip}
                onChange={(e) => setEditNip(e.target.value)}
                placeholder="NIP"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              />
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              Simpan Perubahan Akun
            </button>
          </form>
        </div>
      )}

      {/* Bulk Create Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form
            onSubmit={handleSubmitBulkCreate}
            className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-bold">
                Pembuatan Akun {bulkMode === 'siswa' ? 'Siswa' : 'Guru'} Secara Massal
              </h3>
              <button type="button" onClick={() => setBulkOpen(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {bulkMode === 'siswa' && (
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                >
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="Awalan Nama"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                placeholder="Jumlah"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
              />
              <input
                type="text"
                value={bulkDefaultPass}
                onChange={(e) => setBulkDefaultPass(e.target.value)}
                placeholder="Kata Sandi Default"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
              />
              <button
                type="button"
                onClick={handleGenerateBulkRaw}
                className="rounded-lg border border-blue-600 text-blue-600 font-semibold px-3 py-2 cursor-pointer"
              >
                Hasilkan Daftar Otomatis
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Format per baris: Nama, Username, Email, Password, NIS/NIP
              </label>
              <textarea
                rows={7}
                required
                value={bulkRawLines}
                onChange={(e) => setBulkRawLines(e.target.value)}
                placeholder="Contoh:&#10;Rina Sari, rina.sari, rina@marketverse.sch.id, Siswa123!, 261090"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              Buat Semua Akun Sekarang
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
