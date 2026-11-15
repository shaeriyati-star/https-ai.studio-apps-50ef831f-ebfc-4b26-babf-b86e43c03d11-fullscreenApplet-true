import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { downloadStudentReportPdf, exportGradesSpreadsheet } from '../utils/pdfReport.ts';
import { ScoreTrendChart } from './Charts.tsx';

interface ReportCenterProps {
  data: BootstrapPayload;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ data }) => {
  const summaries = data.studentSummaries;
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(summaries[0]?.studentId || '');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>(data.academic.semester);
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  const canSelectMultiple =
    data.user.role === 'super_admin' || data.user.role === 'admin' || data.user.role === 'guru';

  const filteredSummaries = useMemo(() => {
    return summaries.filter(
      (s) => selectedClassId === 'all' || s.classId === selectedClassId
    );
  }, [summaries, selectedClassId]);

  const activeSummary =
    filteredSummaries.find((s) => s.studentId === selectedStudentId) ||
    filteredSummaries[0] ||
    summaries[0];

  if (!activeSummary) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Belum ada data laporan siswa yang tersedia untuk akun ini.
      </div>
    );
  }

  const classInfo = data.classes.find((c) => c.id === activeSummary.classId);
  const studentUser = data.users.find((u) => u.id === activeSummary.studentId);
  const teacherNote = data.teacherNotes.find((n) => n.studentId === activeSummary.studentId);
  const unlockedBadges = data.badges.filter((b) =>
    (studentUser?.badges || []).includes(b.id)
  );
  const visibleChapters =
    chapterFilter === 'all'
      ? data.chapters
      : data.chapters.filter((c) => c.id === chapterFilter);

  const academicWithSemester = {
    ...data.academic,
    semester: semesterFilter as 'Ganjil' | 'Genap',
  };

  const handleDownloadPdf = () => {
    downloadStudentReportPdf({
      summary: activeSummary,
      academic: academicWithSemester,
      classInfo,
      chapters: data.chapters,
      badges: data.badges,
      unlockedBadgeIds: studentUser?.badges || [],
      teacherNote,
      chapterFilter,
      dateRangeLabel: `${startDate} s.d. ${endDate}`,
    });
  };

  const handleDownloadExcel = () => {
    exportGradesSpreadsheet(filteredSummaries, data.chapters, academicWithSemester);
  };

  const handleChromePrint = () => {
    window.print();
  };

  const issueDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const masteredChapters = data.chapters
    .filter((c) => (activeSummary.chapterScores[c.id] || 0) >= 80)
    .map((c) => `Bab ${c.number}: ${c.title} (${activeSummary.chapterScores[c.id]})`);
  const improveChapters = data.chapters
    .filter((c) => (activeSummary.chapterScores[c.id] || 0) < 80)
    .map((c) => `Bab ${c.number}: ${c.title} (${activeSummary.chapterScores[c.id] || 0})`);

  return (
    <div className="space-y-6">
      {/* Control Toolbar (Hidden on Chrome Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Pusat Laporan Hasil Belajar (PDF 5 Halaman &amp; Cetak Chrome)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pratinjau langsung dokumen A4 resmi sekolah, unduh PDF, cetak via Google Chrome, atau ekspor rekap spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={handleChromePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B193D] dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Chrome</span>
            </button>
            {canSelectMultiple && (
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Rekap Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {canSelectMultiple && (
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Filter Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-medium"
              >
                <option value="all">Semua Kelas</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {canSelectMultiple && (
            <div>
              <label className="block font-semibold text-slate-500 mb-1">Pilih Siswa</label>
              <select
                value={activeSummary.studentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-medium"
              >
                {filteredSummaries.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentName} ({s.className})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-500 mb-1">Filter Bab</label>
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-medium"
            >
              <option value="all">Semua Bab (1–5)</option>
              {data.chapters.map((c) => (
                <option key={c.id} value={c.id}>Bab {c.number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-500 mb-1">Semester</label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-medium"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-500 mb-1">Rentang Tanggal</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-[11px]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-[11px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5-PAGE A4 PREVIEW & PRINT CONTAINER */}
      <div className="print-only-container space-y-8">
        {/* HALAMAN 1: IDENTITAS SISWA */}
        <article className="a4-page mx-auto max-w-[210mm] rounded-xl border border-slate-300 bg-white p-8 sm:p-10 text-slate-900 shadow-sm flex flex-col justify-between min-h-[270mm]">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#0B193D] pb-4">
              <div className="flex items-center gap-4">
                <img
                  src="/src/assets/images/school_emblem_badge_1794705063931.jpg"
                  alt="Logo Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-display text-lg font-extrabold text-[#0B193D]">
                    {academicWithSemester.schoolName}
                  </h3>
                  <p className="text-xs text-slate-600">{academicWithSemester.schoolAddress}</p>
                  <p className="text-xs font-mono text-slate-500">
                    NPSN: {academicWithSemester.npsn} · Periode: {startDate} s.d. {endDate}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-[#0B193D]">MARKETVERSE X</p>
                <p className="text-slate-500">Laporan Hasil Belajar</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
              <p className="text-xs font-bold tracking-wider text-blue-700">HALAMAN 1</p>
              <h4 className="font-display text-xl font-bold text-[#0B193D]">
                IDENTITAS PESERTA DIDIK
              </h4>
            </div>

            <table className="w-full text-sm border border-slate-200">
              <tbody className="divide-y divide-slate-200">
                {[
                  ['Nama Lengkap Siswa', activeSummary.studentName],
                  ['NIS / NISN', activeSummary.nisNisn],
                  ['Kelas', `${activeSummary.className} (${classInfo?.major || 'Program Keahlian Pemasaran'})`],
                  ['Semester', academicWithSemester.semester],
                  ['Tahun Pelajaran', academicWithSemester.academicYear],
                  ['Mata Pelajaran', academicWithSemester.subjectName],
                  ['Guru Mata Pelajaran', academicWithSemester.subjectTeacherName],
                  ['Wali Kelas', classInfo?.homeroomTeacher || academicWithSemester.subjectTeacherName],
                  [
                    'Rekap Kehadiran',
                    `Hadir: ${activeSummary.attendanceSummary.hadir} · Izin: ${activeSummary.attendanceSummary.izin} · Sakit: ${activeSummary.attendanceSummary.sakit} · Alpha: ${activeSummary.attendanceSummary.alpha}`,
                  ],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-56 bg-slate-50 px-4 py-3 font-semibold text-slate-700">{k}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="rounded-xl bg-[#0B193D] text-white p-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-300">Nilai Akhir Terbobot</p>
                <p className="font-mono text-2xl font-extrabold text-amber-400 tabular-nums">
                  {activeSummary.finalScore}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Penguasaan Materi</p>
                <p className="font-mono text-2xl font-extrabold text-white tabular-nums">
                  {activeSummary.masteryPercent}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-300">Peringkat Arena</p>
                <p className="font-mono text-base font-bold text-blue-300 mt-1">
                  Lv.{activeSummary.level} · {activeSummary.tier}
                </p>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>MARKETVERSE X · {academicWithSemester.schoolName}</span>
            <span className="font-mono">Halaman 1 dari 5</span>
          </footer>
        </article>

        {/* HALAMAN 2: HASIL PEMBELAJARAN */}
        <article className="a4-page mx-auto max-w-[210mm] rounded-xl border border-slate-300 bg-white p-8 sm:p-10 text-slate-900 shadow-sm flex flex-col justify-between min-h-[270mm]">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
              <span className="font-bold text-[#0B193D]">HALAMAN 2 — HASIL PEMBELAJARAN</span>
              <span className="text-slate-500">{activeSummary.studentName} · {activeSummary.className}</span>
            </div>

            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-[#0B193D] text-white">
                <tr>
                  <th className="py-2.5 px-3 text-left">Bab</th>
                  <th className="py-2.5 px-3 text-left">Kompetensi Dasar</th>
                  <th className="py-2.5 px-3 text-right">Nilai</th>
                  <th className="py-2.5 px-3 text-left">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleChapters.map((ch) => {
                  const val = activeSummary.chapterScores[ch.id] || 0;
                  const pred =
                    val >= 90 ? 'A (Sangat Baik)' : val >= 80 ? 'B (Baik)' : val >= 75 ? 'C (Cukup)' : 'Perlu Bimbingan';
                  return (
                    <tr key={ch.id}>
                      <td className="py-2.5 px-3 font-bold">Bab {ch.number}</td>
                      <td className="py-2.5 px-3">{ch.title}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">{val}</td>
                      <td className="py-2.5 px-3">{pred}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2.5 px-3" colSpan={2}>Rata-Rata Nilai Lima Bab</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {Math.round(
                      visibleChapters.reduce((a, c) => a + (activeSummary.chapterScores[c.id] || 0), 0) /
                        Math.max(1, visibleChapters.length)
                    )}
                  </td>
                  <td className="py-2.5 px-3">{activeSummary.finalScore >= 75 ? 'Tuntas' : 'Remedial'}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              {[
                ['Pengetahuan', activeSummary.knowledgeScore],
                ['Keterampilan', activeSummary.skillScore],
                ['Proyek', activeSummary.projectScore],
                ['Game Edukasi', activeSummary.gameScore],
                ['Nilai Akhir', activeSummary.finalScore],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="font-mono text-lg font-extrabold text-[#0B193D] tabular-nums">{val}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#0B193D] mb-2">Grafik Perkembangan Nilai Bab 1–5</p>
              <ScoreTrendChart data={activeSummary.scoreHistory} height={175} />
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>MARKETVERSE X · {academicWithSemester.schoolName}</span>
            <span className="font-mono">Halaman 2 dari 5</span>
          </footer>
        </article>

        {/* HALAMAN 3: HASIL GAME EDUKASI */}
        <article className="a4-page mx-auto max-w-[210mm] rounded-xl border border-slate-300 bg-white p-8 sm:p-10 text-slate-900 shadow-sm flex flex-col justify-between min-h-[270mm]">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
              <span className="font-bold text-[#0B193D]">HALAMAN 3 — HASIL GAME EDUKASI</span>
              <span className="text-slate-500">{activeSummary.studentName}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-xs text-slate-500">Total XP</p>
                <p className="font-mono text-xl font-bold text-amber-600 tabular-nums">
                  {activeSummary.xp.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-xs text-slate-500">Level</p>
                <p className="font-mono text-xl font-bold text-[#0B193D] tabular-nums">
                  Lv.{activeSummary.level}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-xs text-slate-500">Badge Diraih</p>
                <p className="font-mono text-xl font-bold text-blue-600 tabular-nums">
                  {activeSummary.badgesCount}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3.5">
                <p className="text-xs text-slate-500">Misi Selesai</p>
                <p className="font-mono text-xl font-bold text-emerald-600 tabular-nums">
                  {activeSummary.missionsCompleted}
                </p>
              </div>
            </div>

            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="py-2.5 px-3 text-left">Simulasi Game Edukasi</th>
                  <th className="py-2.5 px-3 text-center">Sesi</th>
                  <th className="py-2.5 px-3 text-right">Skor Terbaik</th>
                  <th className="py-2.5 px-3 text-left">Pencapaian Kompetensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeSummary.gameBreakdown.map((g) => (
                  <tr key={g.gameId}>
                    <td className="py-2.5 px-3 font-semibold">{g.gameName}</td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">{g.plays}x</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {g.plays > 0 ? `${g.bestScore}/100` : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {g.bestScore >= 85
                        ? 'Sangat Kompeten'
                        : g.bestScore >= 75
                          ? 'Kompeten'
                          : g.plays > 0
                            ? 'Perlu Latihan Lanjutan'
                            : 'Belum Dimainkan'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold text-[#0B193D]">Badge Prestasi Terbuka:</p>
              {unlockedBadges.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada badge yang terbuka.</p>
              ) : (
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {unlockedBadges.map((b) => (
                    <li key={b.id}>
                      <strong>{b.name}:</strong> {b.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>MARKETVERSE X · {academicWithSemester.schoolName}</span>
            <span className="font-mono">Halaman 3 dari 5</span>
          </footer>
        </article>

        {/* HALAMAN 4: ANALISIS KOMPETENSI */}
        <article className="a4-page mx-auto max-w-[210mm] rounded-xl border border-slate-300 bg-white p-8 sm:p-10 text-slate-900 shadow-sm flex flex-col justify-between min-h-[270mm]">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
              <span className="font-bold text-[#0B193D]">HALAMAN 4 — ANALISIS KOMPETENSI</span>
              <span className="text-slate-500">{activeSummary.studentName}</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h4 className="font-bold text-[#0B193D]">1. Kompetensi yang Sudah Dikuasai</h4>
                <p className="text-slate-700 leading-relaxed">
                  {teacherNote?.strengths ||
                    (masteredChapters.length > 0
                      ? masteredChapters.join(' · ')
                      : 'Peserta didik menunjukkan pemahaman dasar proses bisnis ritel.')}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h4 className="font-bold text-[#0B193D]">2. Kompetensi yang Perlu Ditingkatkan</h4>
                <p className="text-slate-700 leading-relaxed">
                  {teacherNote?.improvements ||
                    (improveChapters.length > 0
                      ? improveChapters.join(' · ')
                      : 'Terus tingkatkan ketelitian studi kasus lanjutan di seluruh bab.')}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h4 className="font-bold text-[#0B193D]">3. Catatan Guru Mata Pelajaran</h4>
                <p className="text-slate-700 leading-relaxed">
                  {teacherNote?.note ||
                    'Perkembangan belajar berjalan baik dan aktif menyelesaikan simulasi bisnis.'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h4 className="font-bold text-[#0B193D]">4. Rekomendasi Pembelajaran Lanjutan</h4>
                <p className="text-slate-700 leading-relaxed">
                  {teacherNote?.recommendation ||
                    'Pelajari ulang materi subbab dengan nilai di bawah KKM 75 dan ulangi latihan simulasi di Marketverse Arena.'}
                </p>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>MARKETVERSE X · {academicWithSemester.schoolName}</span>
            <span className="font-mono">Halaman 4 dari 5</span>
          </footer>
        </article>

        {/* HALAMAN 5: PENGESAHAN */}
        <article className="a4-page mx-auto max-w-[210mm] rounded-xl border border-slate-300 bg-white p-8 sm:p-10 text-slate-900 shadow-sm flex flex-col justify-between min-h-[270mm]">
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
              <span className="font-bold text-[#0B193D]">HALAMAN 5 — PENGESAHAN</span>
              <span className="text-slate-500">{academicWithSemester.academicYear} · {academicWithSemester.semester}</span>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p>
                Laporan hasil pembelajaran digital ini diterbitkan oleh <strong>{academicWithSemester.schoolName}</strong> untuk peserta didik <strong>{activeSummary.studentName}</strong> kelas <strong>{activeSummary.className}</strong> pada mata pelajaran <strong>{academicWithSemester.subjectName}</strong>.
              </p>
              <p className="font-semibold text-slate-900">Tanggal Penerbitan: {issueDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-10 pt-6 text-sm">
              <div className="space-y-16">
                <div>
                  <p className="text-slate-500 text-xs">Mengetahui,</p>
                  <p className="font-semibold">Guru Mata Pelajaran</p>
                </div>
                <div>
                  <p className="font-bold underline">{academicWithSemester.subjectTeacherName}</p>
                  <p className="text-xs text-slate-500">NIP. 198911032014022004</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="text-slate-500 text-xs">Mengetahui,</p>
                  <p className="font-semibold">Wali Kelas {activeSummary.className}</p>
                </div>
                <div>
                  <p className="font-bold underline">
                    {classInfo?.homeroomTeacher || academicWithSemester.subjectTeacherName}
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold">Orang Tua / Wali Siswa</p>
                </div>
                <div>
                  <p className="font-bold">( ................................................ )</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="text-slate-500 text-xs">Mengesahkan,</p>
                  <p className="font-semibold">Kepala Sekolah</p>
                </div>
                <div>
                  <p className="font-bold underline">{academicWithSemester.principalName}</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
            <span>MARKETVERSE X · {academicWithSemester.schoolName}</span>
            <span className="font-mono">Halaman 5 dari 5</span>
          </footer>
        </article>
      </div>
    </div>
  );
};
