import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  History,
  KeyRound,
  Laptop,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest, uploadFileToServer } from '../utils/api.ts';

interface ProfileSecurityViewProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export const ProfileSecurityView: React.FC<ProfileSecurityViewProps> = ({
  data,
  onRefresh,
  onLogout,
}) => {
  const user = data.user;
  const profile = data.myProfile;

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(profile?.phone || user.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [gender, setGender] = useState<'L' | 'P' | '-'>(profile?.gender || '-');
  const [bio, setBio] = useState(profile?.bio || user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || profile?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [msg, setMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setErrMsg('');
    try {
      const uploaded = await uploadFileToServer(file);
      setAvatarUrl(uploaded.fileUrl);
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: uploaded.fileUrl }),
      });
      await onRefresh();
      setMsg('Foto profil berhasil diperbarui.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrMsg('');
    setSavingProfile(true);
    try {
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          username,
          phone,
          address,
          gender,
          bio,
          avatarUrl,
        }),
      });
      await onRefresh();
      setMsg('Profil pengguna berhasil disimpan ke database.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrMsg('');
    if (newPassword !== confirmPassword) {
      setErrMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg(res.message);
      await onRefresh();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mengubah kata sandi.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/profile/sessions/${sessionId}`, { method: 'DELETE' });
      await onRefresh();
      setMsg('Sesi perangkat berhasil dicabut.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mencabut sesi.');
    }
  };

  const handleRevokeOtherSessions = async () => {
    setErrMsg('');
    try {
      await apiRequest('/api/profile/sessions/revoke-others', { method: 'POST' });
      await onRefresh();
      setMsg('Semua sesi pada perangkat lain telah dikeluarkan.');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Gagal mengeluarkan sesi lain.');
    }
  };

  const mySessions = data.mySessions || [];
  const myHistory = data.myLoginHistory || [];
  const roleLabel =
    user.role === 'super_admin'
      ? 'Super Admin'
      : user.role === 'orang_tua'
        ? 'Orang Tua'
        : user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Pengaturan Akun &amp; Keamanan Sesi
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Profil Pengguna &amp; Riwayat Login
          </h2>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Akun Ini</span>
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {errMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Form + Avatar */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-600/30 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                  {user.name}
                </h3>
                <span className="rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 truncate">
                @{user.username} · {user.email}
              </p>
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer mt-1">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>{uploadingAvatar ? 'Mengunggah Foto...' : 'Unggah Foto Profil'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P' | '-')}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
              >
                <option value="-">Tidak Disebutkan</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Alamat
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Bio / Catatan Profil
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
          </button>
        </form>

        {/* Change Password */}
        <form
          onSubmit={handleChangePassword}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Ubah Kata Sandi
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Kata Sandi Saat Ini
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Kata Sandi Baru (min. 8 karakter)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full rounded-xl bg-[#0B193D] dark:bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            {savingPassword ? 'Memproses...' : 'Perbarui Kata Sandi'}
          </button>

          {user.lastLoginAt && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Login Terakhir Tercatat</span>
              </p>
              <p className="text-slate-500">
                {new Date(user.lastLoginAt).toLocaleString('id-ID')} · {user.lastLoginDevice || 'Perangkat Terverifikasi'}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Active Sessions & Login History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Perangkat &amp; Sesi Aktif ({mySessions.length})</span>
            </h3>
            {mySessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Keluarkan Perangkat Lain
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {mySessions.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada sesi aktif lainnya.</p>
            ) : (
              mySessions.map((sess) => (
                <div
                  key={sess.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {/Android|iPhone|iPad/i.test(sess.os) ? (
                        <Smartphone className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Laptop className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                        <span>{sess.deviceLabel}</span>
                        {sess.isCurrent && (
                          <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                            Sesi Ini
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        IP: {sess.ipAddress} · Aktif: {new Date(sess.lastActiveAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer shrink-0"
                      title="Cabut sesi ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Riwayat Percobaan Login</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
            {myHistory.length === 0 ? (
              <p className="text-slate-400">Belum ada riwayat login tercatat.</p>
            ) : (
              myHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {item.deviceLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      IP: {item.ipAddress} · {item.reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                        item.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {item.success ? 'Berhasil' : 'Gagal'}
                    </span>
                    <p className="font-mono text-[10px] text-slate-400 mt-1">
                      {new Date(item.attemptedAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
