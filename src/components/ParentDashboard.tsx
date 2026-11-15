import React from 'react';
import { Award, Bell, CheckCircle2, Clock, FileText, Printer } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { ScoreTrendChart } from './Charts.tsx';

interface ParentDashboardProps {
  data: BootstrapPayload;
  onOpenReport: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ data, onOpenReport }) => {
  const child = data.users.find((u) => u.role === 'siswa');
  const summary = data.studentSummaries[0];
  const teacherNote = data.teacherNotes[0];
  const childProgress = data.progress[0];
  const completedSubs = childProgress?.completedSubchapters || [];

  if (!child || !summary) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Belum ada data siswa yang tertaut dengan akun orang tua Anda. Hubungi Admin Sekolah untuk menautkan akun anak.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Child Identity Card */}
      <div className="rounded-xl bg-[#0B193D] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-400">
            Pemantauan Orang Tua · {data.academic.schoolName}
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold">{child.name}</h2>
          <p className="text-xs text-slate-300">
            Kelas {summary.className} · NIS/NISN {summary.nisNisn} · Semester {data.academic.semester} {data.academic.academicYear}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
        >
          <Printer className="w-4 h-4" />
          <span>Unduh PDF &amp; Cetak Rapor Anak</span>
        </button>
      </div>

      {/* Simple Clear Mobile-First KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Nilai Akhir</p>
          <p className="font-mono text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {summary.finalScore}/100
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Kehadiran (Hadir)</p>
          <p className="font-mono text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
            {summary.attendanceSummary.hadir} Hari
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Izin {summary.attendanceSummary.izin} · Sakit {summary.attendanceSummary.sakit} · Alpha {summary.attendanceSummary.alpha}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Waktu Belajar</p>
          <p className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            {child.studyMinutes} mnt
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Game Edukasi</p>
          <p className="font-mono text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {child.xp} XP
          </p>
          <p className="text-[11px] text-slate-500">
            Lv.{child.level} · {child.badges.length} Badge
          </p>
        </div>
      </div>

      {/* 5-Chapter Progress & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Progres &amp; Nilai Lima Bab
          </h3>
          <div className="space-y-3">
            {data.chapters.map((ch) => {
              const done = ch.subchapters.filter((s) => completedSubs.includes(s.id)).length;
              const pct = Math.round((done / ch.subchapters.length) * 100);
              const score = summary.chapterScores[ch.id] || 0;
              return (
                <div key={ch.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Bab {ch.number}. {ch.title}
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      Nilai {score} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Grafik Perkembangan Nilai Anak
          </h3>
          <ScoreTrendChart data={summary.scoreHistory} height={180} />
        </div>
      </div>

      {/* Tasks & Exam Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Status Tugas Anak</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            {data.assignments.map((asg) => {
              const sub = data.submissions.find((s) => s.assignmentId === asg.id);
              return (
                <div
                  key={asg.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{asg.title}</p>
                    <p className="text-slate-500">Tenggat: {asg.dueDate}</p>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      sub
                        ? sub.status === 'graded'
                          ? 'text-emerald-600'
                          : 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {sub
                      ? sub.status === 'graded'
                        ? `Nilai ${sub.score}`
                        : 'Sudah Dikumpulkan'
                      : 'Belum Dikerjakan'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Pencapaian Game Edukasi &amp; Ujian</span>
          </h3>
          <div className="space-y-2 text-xs">
            {data.gameRecords.slice(0, 4).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-100">{g.gameName}</span>
                <span className="font-mono font-bold text-blue-600 tabular-nums">
                  Skor {g.score} · +{g.xpEarned} XP
                </span>
              </div>
            ))}
            {data.assessmentAttempts.slice(0, 3).map((at) => {
              const ex = data.assessments.find((a) => a.id === at.assessmentId);
              return (
                <div
                  key={at.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
                >
                  <span className="truncate pr-2">{ex?.title || 'Ujian'}</span>
                  <span className="font-mono font-bold text-emerald-600 shrink-0">{at.score}/100</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths, Improvements, Teacher Notes & Parent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Evaluasi Kompetensi &amp; Catatan Guru
          </h3>
          <div>
            <p className="font-bold text-emerald-700 dark:text-emerald-400">Kelebihan Kompetensi:</p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {teacherNote?.strengths || 'Menguasai materi pelayanan pelanggan dan proses bisnis ritel.'}
            </p>
          </div>
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400">Materi yang Perlu Ditingkatkan:</p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {teacherNote?.improvements || 'Perlu mengulang materi K3 ritel dan penguatan studi kasus.'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="font-bold text-slate-900 dark:text-white">
              Catatan {teacherNote?.teacherName || data.academic.subjectTeacherName}:
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {teacherNote?.note || 'Anak mengikuti pembelajaran dengan baik.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Notifikasi Perkembangan Anak</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            {data.notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    {n.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{n.createdAt.slice(0, 10)}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
