import React, { useState } from 'react';
import { Bell, CheckCircle2, ClipboardList, FileSpreadsheet, Users } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest } from '../utils/api.ts';
import { exportGradesSpreadsheet } from '../utils/pdfReport.ts';
import { HorizontalBarBreakdown } from './Charts.tsx';

interface TeacherDashboardProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
  onNavigate: (tab: 'curriculum' | 'assessments' | 'reports') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  data,
  onRefresh,
  onNavigate,
}) => {
  const [classFilter, setClassFilter] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState(
    data.studentSummaries[0]?.studentId || ''
  );

  // Attendance state
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Alpha'>('Hadir');
  const [attNote, setAttNote] = useState('');

  // Teacher Note state
  const existingNote = data.teacherNotes.find((n) => n.studentId === selectedStudentId);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [noteBody, setNoteBody] = useState('');

  // Broadcast notification state
  const [notifTarget, setNotifTarget] = useState<'siswa' | 'orang_tua' | 'all'>('siswa');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState('');

  const filteredStudents = data.studentSummaries.filter(
    (s) => classFilter === 'all' || s.classId === classFilter
  );

  const avgFinal =
    filteredStudents.length > 0
      ? Math.round(
          filteredStudents.reduce((acc, s) => acc + s.finalScore, 0) / filteredStudents.length
        )
      : 0;
  const avgMastery =
    filteredStudents.length > 0
      ? Math.round(
          filteredStudents.reduce((acc, s) => acc + s.masteryPercent, 0) /
            filteredStudents.length
        )
      : 0;
  const pendingSubs = data.submissions.filter((s) => s.status === 'submitted').length;

  const chapterAverages = data.chapters.map((ch) => {
    const avg =
      filteredStudents.length > 0
        ? Math.round(
            filteredStudents.reduce((acc, s) => acc + (s.chapterScores[ch.id] || 0), 0) /
              filteredStudents.length
          )
        : 0;
    return { label: `Bab ${ch.number}. ${ch.title}`, value: avg, color: 'bg-blue-600' };
  });

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/attendance', {
      method: 'POST',
      body: JSON.stringify({
        studentId: selectedStudentId,
        date: attDate,
        status: attStatus,
        note: attNote,
      }),
    });
    setAttNote('');
    await onRefresh();
    setFeedbackBanner('Kehadiran siswa berhasil dicatat.');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/teacher-notes', {
      method: 'POST',
      body: JSON.stringify({
        studentId: selectedStudentId,
        strengths: strengths || existingNote?.strengths || '',
        improvements: improvements || existingNote?.improvements || '',
        recommendation: recommendation || existingNote?.recommendation || '',
        note: noteBody || existingNote?.note || '',
      }),
    });
    await onRefresh();
    setFeedbackBanner('Catatan kompetensi guru diperbarui dan notifikasi dikirim ke orang tua.');
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        targetRole: notifTarget,
        title: notifTitle,
        message: notifMsg,
        category: notifTarget === 'orang_tua' ? 'orang_tua' : 'guru',
      }),
    });
    setNotifTitle('');
    setNotifMsg('');
    await onRefresh();
    setFeedbackBanner('Pengumuman berhasil dikirim.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Dashboard Pengajar · {data.academic.subjectName}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Selamat Datang, {data.user.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('assessments')}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Periksa Tugas ({pendingSubs})
          </button>
          <button
            type="button"
            onClick={() => exportGradesSpreadsheet(filteredStudents, data.chapters, data.academic)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <span>{feedbackBanner}</span>
          <button type="button" onClick={() => setFeedbackBanner('')} className="underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total Siswa Terdaftar</p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {filteredStudents.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Rata-Rata Nilai Akhir</p>
          <p className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {avgFinal}/100
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Rata-Rata Penguasaan</p>
          <p className="font-mono text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
            {avgMastery}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Tugas Menunggu Nilai</p>
          <p className="font-mono text-2xl font-bold text-amber-600 mt-1 tabular-nums">
            {pendingSubs}
          </p>
        </div>
      </div>

      {/* Student Monitoring Table + Class Competence Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Pemantauan Nilai &amp; Progres Siswa</span>
            </h3>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold"
            >
              <option value="all">Semua Kelas</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3 text-right">Penguasaan</th>
                  <th className="py-2.5 px-3 text-right">Pengetahuan</th>
                  <th className="py-2.5 px-3 text-right">Game</th>
                  <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.studentId}
                    onClick={() => setSelectedStudentId(s.studentId)}
                    className={`cursor-pointer transition-colors ${
                      s.studentId === selectedStudentId
                        ? 'bg-blue-50/70 dark:bg-blue-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {s.studentName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{s.className}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.masteryPercent}%</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.knowledgeScore}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.gameScore}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 tabular-nums">
                      {s.finalScore}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600 tabular-nums">
                      {s.xp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Rata-Rata Penguasaan per Bab
          </h3>
          <HorizontalBarBreakdown items={chapterAverages} />
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="w-full rounded-lg bg-[#0B193D] dark:bg-blue-600 py-2.5 text-xs font-semibold text-white cursor-pointer"
          >
            Buka Laporan PDF 5 Halaman
          </button>
        </div>
      </div>

      {/* Attendance, Competency Notes & Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveAttendance}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
        >
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Catat Kehadiran Siswa</span>
          </h3>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            {data.studentSummaries.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.studentName} ({s.className})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            />
            <select
              value={attStatus}
              onChange={(e) => setAttStatus(e.target.value as typeof attStatus)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpha">Alpha</option>
            </select>
          </div>
          <input
            type="text"
            value={attNote}
            onChange={(e) => setAttNote(e.target.value)}
            placeholder="Keterangan (opsional)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Simpan Presensi
          </button>
        </form>

        <form
          onSubmit={handleSaveNote}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5"
        >
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>Catatan Kompetensi Siswa</span>
          </h3>
          <input
            type="text"
            value={strengths || existingNote?.strengths || ''}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Kelebihan kompetensi..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={improvements || existingNote?.improvements || ''}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="Materi perlu ditingkatkan..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={recommendation || existingNote?.recommendation || ''}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="Rekomendasi pembelajaran..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <textarea
            rows={2}
            value={noteBody || existingNote?.note || ''}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Catatan guru untuk siswa & orang tua..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
          >
            Simpan Catatan &amp; Beri Info Orang Tua
          </button>
        </form>

        <form
          onSubmit={handleBroadcast}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
        >
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Kirim Notifikasi Informasi</span>
          </h3>
          <select
            value={notifTarget}
            onChange={(e) => setNotifTarget(e.target.value as typeof notifTarget)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="siswa">Seluruh Siswa</option>
            <option value="orang_tua">Seluruh Orang Tua</option>
            <option value="all">Semua Pengguna</option>
          </select>
          <input
            type="text"
            required
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            placeholder="Judul informasi..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
          />
          <textarea
            rows={3}
            required
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            placeholder="Isi pengumuman atau pengingat jadwal..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-[#0B193D] dark:bg-blue-600 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Kirim Notifikasi
          </button>
        </form>
      </div>
    </div>
  );
};
