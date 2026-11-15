import React from 'react';
import { Award, BookOpen, Calendar, ChevronRight, Gamepad2, Trophy } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { HorizontalBarBreakdown, ScoreTrendChart } from './Charts.tsx';

interface StudentDashboardProps {
  data: BootstrapPayload;
  onNavigate: (tab: 'curriculum' | 'arena' | 'assessments' | 'reports', chapterId?: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ data, onNavigate }) => {
  const summary = data.studentSummaries[0];
  const myClass = data.classes.find((c) => c.id === data.user.classId);
  const myProgress = data.progress[0];
  const completedSubs = myProgress?.completedSubchapters || [];

  const pendingAssignments = data.assignments.filter(
    (asg) => !data.submissions.some((s) => s.assignmentId === asg.id)
  );
  const upcomingExams = data.assessments.filter(
    (ex) => !data.assessmentAttempts.some((a) => a.assessmentId === ex.id)
  );

  return (
    <div className="space-y-6">
      {/* Profile & Career Banner */}
      <div className="rounded-xl bg-[#0B193D] text-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-amber-400">
            {myClass?.name || 'Kelas X'} · Semester {data.academic.semester} · {data.academic.academicYear}
          </p>
          <h2 className="font-display text-2xl font-bold">{data.user.name}</h2>
          <p className="text-xs text-slate-300">
            NIS/NISN: {data.user.nisNisn || '-'} · Tingkat Karier: <strong>Level {data.user.level} — {data.user.tier}</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="rounded-lg bg-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-300">Nilai Akhir</p>
            <p className="font-mono text-xl font-extrabold text-amber-400 tabular-nums">
              {summary?.finalScore ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-300">Penguasaan</p>
            <p className="font-mono text-xl font-extrabold tabular-nums">
              {summary?.masteryPercent ?? 0}%
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-300">Total XP</p>
            <p className="font-mono text-xl font-extrabold text-blue-300 tabular-nums">
              {data.user.xp.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-300">Badge</p>
            <p className="font-mono text-xl font-extrabold tabular-nums">
              {data.user.badges.length}
            </p>
          </div>
        </div>
      </div>

      {/* 5 Chapters Progress */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Progres Lima Bab Dasar-Dasar Pemasaran</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('curriculum')}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Lanjutkan Belajar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.chapters.map((ch) => {
            const done = ch.subchapters.filter((s) => completedSubs.includes(s.id)).length;
            const pct = Math.round((done / ch.subchapters.length) * 100);
            const score = summary?.chapterScores[ch.id] ?? 0;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onNavigate('curriculum', ch.id)}
                className="text-left rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-blue-600 transition-colors space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Bab {ch.number}</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    Nilai: {score}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 min-h-[32px]">
                  {ch.title}
                </p>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {done}/{ch.subchapters.length} subbab ({pct}%)
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Grafik Perkembangan Nilai per Bab
          </h3>
          {summary && <ScoreTrendChart data={summary.scoreHistory} />}
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Komponen Nilai Terbobot &amp; Rekomendasi
          </h3>
          {summary && (
            <HorizontalBarBreakdown
              items={[
                { label: `Pengetahuan (${data.gradeWeights.knowledge}%)`, value: summary.knowledgeScore, color: 'bg-blue-600' },
                { label: `Keterampilan (${data.gradeWeights.skill}%)`, value: summary.skillScore, color: 'bg-sky-500' },
                { label: `Proyek & Tugas (${data.gradeWeights.project}%)`, value: summary.projectScore, color: 'bg-violet-600' },
                { label: `Game Edukasi (${data.gradeWeights.game}%)`, value: summary.gameScore, color: 'bg-amber-500' },
              ]}
            />
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Rekomendasi Materi untuk Diperkuat:
            </p>
            {summary && summary.recommendedReviewChapters.length > 0 ? (
              summary.recommendedReviewChapters.slice(0, 2).map((rec) => (
                <button
                  key={rec.chapterId}
                  type="button"
                  onClick={() => onNavigate('curriculum', rec.chapterId)}
                  className="w-full flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-left cursor-pointer"
                >
                  <span className="font-semibold text-amber-950 dark:text-amber-200 truncate pr-2">
                    {rec.title}
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    Skor {rec.score} →
                  </span>
                </button>
              ))
            ) : (
              <p className="text-xs text-emerald-600 font-medium">
                Seluruh bab yang telah ditempuh berada di atas KKM 80!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Schedules, Leaderboard, Recent Games */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jadwal Tugas & Ujian */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Jadwal Tugas &amp; Ujian</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('assessments')}
              className="text-xs font-semibold text-blue-600 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {pendingAssignments.slice(0, 2).map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="font-semibold text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-slate-500 mt-0.5">Tugas {a.kind} · Tenggat {a.dueDate}</p>
              </div>
            ))}
            {upcomingExams.slice(0, 2).map((ex) => (
              <div key={ex.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="font-semibold text-slate-900 dark:text-white">{ex.title}</p>
                <p className="text-slate-500 mt-0.5">Jadwal Ujian · {ex.scheduledDate}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat Permainan */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-blue-600" />
              <span>Riwayat Permainan Terkini</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('arena')}
              className="text-xs font-semibold text-blue-600 cursor-pointer"
            >
              Buka Arena
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {data.gameRecords.slice(0, 4).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{g.gameName}</p>
                  <p className="text-[11px] text-slate-500">{g.playedAt.slice(0, 10)}</p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{g.score}/100</p>
                  <p className="text-[11px] text-amber-600 tabular-nums">+{g.xpEarned} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Leaderboard & Rapor */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Top 4 Leaderboard</span>
            </h3>
            <div className="space-y-2 text-xs">
              {data.leaderboard.slice(0, 4).map((row, idx) => (
                <div
                  key={row.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    row.id === data.user.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate pr-2">
                    #{idx + 1} {row.name}
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                    {row.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B193D] dark:bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Unduh Laporan Hasil Belajar Pribadi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
