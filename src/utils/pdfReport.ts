import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type {
  AcademicSetting,
  BadgeDef,
  Chapter,
  SchoolClass,
  StudentGradeSummary,
  TeacherNote,
} from '../types/index.ts';

interface PdfReportInput {
  summary: StudentGradeSummary;
  academic: AcademicSetting;
  classInfo?: SchoolClass;
  chapters: Chapter[];
  badges: BadgeDef[];
  unlockedBadgeIds: string[];
  teacherNote?: TeacherNote;
  chapterFilter?: string;
  dateRangeLabel?: string;
}

function drawHeaderAndFooter(
  doc: jsPDF,
  academic: AcademicSetting,
  pageNumber: number,
  totalPages: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top navy stripe
  doc.setFillColor(11, 25, 61);
  doc.rect(14, 10, pageWidth - 28, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 25, 61);
  doc.text('MARKETVERSE X · LAPORAN HASIL BELAJAR DIGITAL', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${academic.schoolName} · ${academic.academicYear} (${academic.semester})`, pageWidth - 14, 16, {
    align: 'right',
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 19, pageWidth - 14, 19);

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dokumen Resmi Akademik · Mata Pelajaran: ${academic.subjectName}`,
    14,
    pageHeight - 11
  );
  doc.text(`Halaman ${pageNumber} dari ${totalPages}`, pageWidth - 14, pageHeight - 11, { align: 'right' });
}

export function downloadStudentReportPdf(input: PdfReportInput): void {
  const {
    summary,
    academic,
    classInfo,
    chapters,
    badges,
    unlockedBadgeIds,
    teacherNote,
    chapterFilter,
    dateRangeLabel,
  } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalPages = 5;

  // ===================== HALAMAN 1: IDENTITAS SISWA =====================
  drawHeaderAndFooter(doc, academic, 1, totalPages);

  // Academic Crest Box (vector shield)
  doc.setFillColor(11, 25, 61);
  doc.roundedRect(14, 26, 22, 24, 3, 3, 'F');
  doc.setDrawColor(245, 185, 66);
  doc.setLineWidth(1);
  doc.line(25, 31, 19, 44);
  doc.line(25, 31, 31, 44);
  doc.line(19, 44, 31, 44);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(11, 25, 61);
  doc.text(academic.schoolName.toUpperCase(), 42, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(academic.schoolAddress, 42, 39);
  doc.text(`NPSN: ${academic.npsn}  ·  Program Keahlian Pemasaran`, 42, 44);
  if (dateRangeLabel) {
    doc.text(`Periode Laporan: ${dateRangeLabel}`, 42, 49);
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 60, pageWidth - 28, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 61);
  doc.text('HALAMAN 1 — IDENTITAS PESERTA DIDIK', pageWidth / 2, 70, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235);
  doc.text('MARKETVERSE X · Digital Marketing Learning & Game Academy', pageWidth / 2, 77, {
    align: 'center',
  });

  autoTable(doc, {
    startY: 92,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4, textColor: [15, 23, 42] },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 58 } },
    body: [
      ['Nama Lengkap Siswa', summary.studentName],
      ['NIS / NISN', summary.nisNisn],
      ['Kelas / Program Keahlian', `${summary.className} · ${classInfo?.major || 'Pemasaran'}`],
      ['Semester', academic.semester],
      ['Tahun Pelajaran', academic.academicYear],
      ['Mata Pelajaran', academic.subjectName],
      ['Guru Pengampu', academic.subjectTeacherName],
      ['Wali Kelas', classInfo?.homeroomTeacher || academic.subjectTeacherName],
      ['Rekap Kehadiran', `Hadir: ${summary.attendanceSummary.hadir} · Izin: ${summary.attendanceSummary.izin} · Sakit: ${summary.attendanceSummary.sakit} · Alpha: ${summary.attendanceSummary.alpha}`],
    ],
  });

  const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFillColor(11, 25, 61);
  doc.roundedRect(14, finalY1, pageWidth - 28, 30, 3, 3, 'F');
  doc.setTextColor(245, 185, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RINGKASAN CAPAIAN SEMESTER', 20, finalY1 + 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(
    `Nilai Akhir: ${summary.finalScore}/100   ·   Penguasaan Materi: ${summary.masteryPercent}%   ·   Level ${summary.level} (${summary.tier})`,
    20,
    finalY1 + 20
  );

  // ===================== HALAMAN 2: HASIL PEMBELAJARAN =====================
  doc.addPage();
  drawHeaderAndFooter(doc, academic, 2, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 61);
  doc.text('HALAMAN 2 — HASIL PEMBELAJARAN AKADEMIK', 14, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    chapterFilter && chapterFilter !== 'all'
      ? `Fokus Filter: Bab ${chapterFilter.replace('bab-', '')}`
      : 'Rekapitulasi nilai lima bab mata pelajaran Dasar-Dasar Pemasaran',
    14,
    34
  );

  const visibleChapters =
    chapterFilter && chapterFilter !== 'all'
      ? chapters.filter((c) => c.id === chapterFilter)
      : chapters;

  const chapterRows = visibleChapters.map((ch) => {
    const val = summary.chapterScores[ch.id] || 0;
    const predikat = val >= 90 ? 'A (Sangat Baik)' : val >= 80 ? 'B (Baik)' : val >= 75 ? 'C (Cukup)' : 'Perlu Bimbingan';
    return [`Bab ${ch.number}`, ch.title, `${val}`, predikat];
  });

  const avgBab =
    visibleChapters.length > 0
      ? Math.round(
          visibleChapters.reduce((acc, c) => acc + (summary.chapterScores[c.id] || 0), 0) /
            visibleChapters.length
        )
      : 0;

  chapterRows.push(['Rata-Rata', 'Rata-Rata Nilai Lima Bab', `${avgBab}`, avgBab >= 75 ? 'Tuntas' : 'Remedial']);

  autoTable(doc, {
    startY: 40,
    head: [['Bab', 'Judul Kompetensi', 'Nilai', 'Predikat']],
    body: chapterRows,
    headStyles: { fillColor: [11, 25, 61], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
    columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 2: { halign: 'right', cellWidth: 20 } },
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: afterTableY,
    head: [['Komponen Penilaian', 'Skor', 'Keterangan']],
    body: [
      ['Nilai Pengetahuan (Kuis & Ujian)', `${summary.knowledgeScore}`, 'Rata-rata capaian evaluasi kognitif'],
      ['Nilai Keterampilan (Simulasi & Praktik)', `${summary.skillScore}`, 'Penyelesaian aktivitas praktik bab'],
      ['Nilai Proyek & Tugas', `${summary.projectScore}`, 'Penilaian tugas individu/kelompok/proyek'],
      ['Nilai Game Edukasi', `${summary.gameScore}`, 'Kompetensi simulasi Marketverse Arena'],
      ['Nilai Akhir Terbobot', `${summary.finalScore}`, 'Akumulasi otomatis sesuai bobot guru'],
    ],
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 22 } },
  });

  // Vector Bar Chart of Chapter Score Progression
  const chartTop = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 25, 61);
  doc.text('Grafik Perkembangan Nilai per Bab', 14, chartTop);

  const chartBoxY = chartTop + 4;
  const chartHeight = 46;
  const chartW = pageWidth - 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, chartBoxY, chartW, chartHeight + 12, 'FD');

  const barAreaW = chartW - 24;
  const step = barAreaW / Math.max(1, chapters.length);
  chapters.forEach((ch, idx) => {
    const val = summary.chapterScores[ch.id] || 0;
    const barH = Math.max(2, (val / 100) * chartHeight);
    const x = 26 + idx * step;
    const y = chartBoxY + chartHeight + 2 - barH;
    doc.setFillColor(val >= 75 ? 37 : 217, val >= 75 ? 99 : 119, val >= 75 ? 235 : 6);
    doc.rect(x, y, 16, barH, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${val}`, x + 8, y - 2, { align: 'center' });
    doc.text(`Bab ${ch.number}`, x + 8, chartBoxY + chartHeight + 8, { align: 'center' });
  });

  // ===================== HALAMAN 3: HASIL GAME EDUKASI =====================
  doc.addPage();
  drawHeaderAndFooter(doc, academic, 3, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 61);
  doc.text('HALAMAN 3 — HASIL GAME EDUKASI MARKETVERSE ARENA', 14, 28);

  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3.5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 65 } },
    body: [
      ['Total Experience Points (XP)', `${summary.xp.toLocaleString('id-ID')} XP`],
      ['Level & Tingkatan Karier', `Level ${summary.level} — ${summary.tier}`],
      ['Jumlah Misi Diselesaikan', `${summary.missionsCompleted} Misi Harian & Mingguan`],
      ['Jumlah Badge Diraih', `${summary.badgesCount} Badge Prestasi`],
    ],
  });

  const yAfterGameMeta = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: yAfterGameMeta,
    head: [['Nama Game Simulasi', 'Sesi Dimainkan', 'Skor Terbaik', 'Status Kompetensi']],
    body: summary.gameBreakdown.map((g) => [
      g.gameName,
      `${g.plays}x`,
      g.plays > 0 ? `${g.bestScore}/100` : '-',
      g.bestScore >= 85 ? 'Unggul' : g.bestScore >= 75 ? 'Kompeten' : g.plays > 0 ? 'Berkembang' : 'Belum Dimainkan',
    ]),
    headStyles: { fillColor: [109, 40, 217], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 3.5 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
  });

  const yBadges = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const unlockedBadgesList = badges.filter((b) => unlockedBadgeIds.includes(b.id));
  autoTable(doc, {
    startY: yBadges,
    head: [['Badge Prestasi Terbuka', 'Kriteria Kompetensi']],
    body:
      unlockedBadgesList.length > 0
        ? unlockedBadgesList.map((b) => [b.name, b.description])
        : [['Belum ada badge', 'Selesaikan misi dan simulasi untuk memperoleh badge']],
    headStyles: { fillColor: [217, 119, 6], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 3 },
  });

  // ===================== HALAMAN 4: ANALISIS KOMPETENSI =====================
  doc.addPage();
  drawHeaderAndFooter(doc, academic, 4, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 61);
  doc.text('HALAMAN 4 — ANALISIS KOMPETENSI & REKOMENDASI', 14, 28);

  const masteredChapters = chapters
    .filter((c) => (summary.chapterScores[c.id] || 0) >= 80)
    .map((c) => `Bab ${c.number}: ${c.title} (Nilai ${summary.chapterScores[c.id]})`);

  const improveChapters = chapters
    .filter((c) => (summary.chapterScores[c.id] || 0) < 80)
    .map((c) => `Bab ${c.number}: ${c.title} (Nilai ${summary.chapterScores[c.id] || 0})`);

  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5, valign: 'top' },
    headStyles: { fillColor: [11, 25, 61], textColor: 255 },
    head: [['Aspek Analisis Kompetensi', 'Uraian Evaluasi']],
    body: [
      [
        'Kompetensi yang Sudah Dikuasai',
        teacherNote?.strengths ||
          (masteredChapters.length > 0
            ? masteredChapters.join('\n')
            : 'Peserta didik mulai menguasai konsep dasar pemasaran ritel.'),
      ],
      [
        'Kompetensi yang Perlu Ditingkatkan',
        teacherNote?.improvements ||
          (improveChapters.length > 0
            ? improveChapters.join('\n')
            : 'Pertahankan ketelitian pada studi kasus lanjutan.'),
      ],
      [
        'Catatan Guru Mata Pelajaran',
        teacherNote?.note ||
          'Siswa menunjukkan perkembangan positif dalam pemahaman teori dan praktik simulasi ritel.',
      ],
      [
        'Rekomendasi Pembelajaran',
        teacherNote?.recommendation ||
          'Pelajari kembali subbab dengan skor di bawah 80 dan tuntaskan tantangan game edukasi terkait.',
      ],
    ],
    columnStyles: { 0: { cellWidth: 62, fontStyle: 'bold', fillColor: [248, 250, 252] } },
  });

  // ===================== HALAMAN 5: PENGESAHAN =====================
  doc.addPage();
  drawHeaderAndFooter(doc, academic, 5, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 25, 61);
  doc.text('HALAMAN 5 — LEMBAR PENGESAHAN LAPORAN HASIL BELAJAR', 14, 28);

  const issueDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Laporan hasil belajar digital ini diterbitkan secara resmi oleh ${academic.schoolName} untuk mata pelajaran ${academic.subjectName} Tahun Pelajaran ${academic.academicYear} Semester ${academic.semester}.`,
    14,
    40,
    { maxWidth: pageWidth - 28 }
  );

  doc.text(`Tanggal Penerbitan: ${issueDate}`, 14, 58);

  // Signature 2x2 grid
  const col1X = 24;
  const col2X = 116;
  const row1Y = 82;
  const row2Y = 148;

  doc.setFontSize(10);
  doc.text('Mengetahui,', col1X, row1Y - 8);
  doc.text('Guru Mata Pelajaran', col1X, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.text(academic.subjectTeacherName, col1X, row1Y + 34);
  doc.setFont('helvetica', 'normal');
  doc.line(col1X, row1Y + 36, col1X + 66, row1Y + 36);

  doc.text('Wali Kelas', col2X, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.text(classInfo?.homeroomTeacher || academic.subjectTeacherName, col2X, row1Y + 34);
  doc.setFont('helvetica', 'normal');
  doc.line(col2X, row1Y + 36, col2X + 66, row1Y + 36);

  doc.text('Orang Tua / Wali Siswa', col1X, row2Y);
  doc.text('( ........................................... )', col1X, row2Y + 34);

  doc.text('Kepala Sekolah', col2X, row2Y);
  doc.setFont('helvetica', 'bold');
  doc.text(academic.principalName, col2X, row2Y + 34);
  doc.setFont('helvetica', 'normal');
  doc.line(col2X, row2Y + 36, col2X + 66, row2Y + 36);

  const safeSlug = summary.studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`Laporan-MARKETVERSE-X-${safeSlug}.pdf`);
}

export function exportGradesSpreadsheet(
  summaries: StudentGradeSummary[],
  chapters: Chapter[],
  academic: AcademicSetting
): void {
  const rows = summaries.map((s, idx) => {
    const row: Record<string, string | number> = {
      No: idx + 1,
      Nama_Siswa: s.studentName,
      NIS_NISN: s.nisNisn,
      Kelas: s.className,
    };
    chapters.forEach((ch) => {
      row[`Bab_${ch.number}`] = s.chapterScores[ch.id] || 0;
    });
    row['Pengetahuan'] = s.knowledgeScore;
    row['Keterampilan'] = s.skillScore;
    row['Proyek'] = s.projectScore;
    row['Game_Edukasi'] = s.gameScore;
    row['Nilai_Akhir'] = s.finalScore;
    row['Penguasaan_%'] = s.masteryPercent;
    row['Total_XP'] = s.xp;
    row['Level'] = s.level;
    row['Tingkat_Karier'] = s.tier;
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');

  const infoSheet = XLSX.utils.json_to_sheet([
    {
      Sekolah: academic.schoolName,
      Tahun_Pelajaran: academic.academicYear,
      Semester: academic.semester,
      Mata_Pelajaran: academic.subjectName,
      Tanggal_Ekspor: new Date().toISOString().slice(0, 10),
    },
  ]);
  XLSX.utils.book_append_sheet(wb, infoSheet, 'Identitas Akademik');
  XLSX.writeFile(wb, `Rekap-Nilai-MARKETVERSE-X-${academic.semester}.xlsx`);
}
