import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest, uploadFileToServer } from '../utils/api.ts';
import type { Chapter } from '../types/index.ts';

interface CurriculumViewProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
  onOpenExamForChapter: (chapterId: string) => void;
  initialChapterId?: string;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  data,
  onRefresh,
  onOpenExamForChapter,
  initialChapterId,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || data.chapters[0]?.id || 'bab-1'
  );
  const [sectionTab, setSectionTab] = useState<
    'materi' | 'video' | 'infografis' | 'kasus' | 'aktivitas' | 'rangkuman' | 'refleksi' | 'bahan'
  >('materi');
  const [activeSubId, setActiveSubId] = useState<string>('');
  const [videoSlideIdx, setVideoSlideIdx] = useState(0);

  // Interactive chapter activity states
  const [simAnswer, setSimAnswer] = useState('');
  const [simOption, setSimOption] = useState(0);
  const [ref1, setRef1] = useState('');
  const [ref2, setRef2] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Teacher Material Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matType, setMatType] = useState<'pdf' | 'ppt' | 'video' | 'gambar' | 'dokumen'>('pdf');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const chapter: Chapter =
    data.chapters.find((c) => c.id === selectedChapterId) || data.chapters[0];
  const currentSub =
    chapter.subchapters.find((s) => s.id === activeSubId) || chapter.subchapters[0];

  const myProgress = data.progress[0];
  const completedSubs = myProgress?.completedSubchapters || [];
  const completedActs = myProgress?.completedActivities || [];
  const completedVideos = myProgress?.completedVideos || [];
  const savedReflection = myProgress?.reflections?.[chapter.id];

  const isTeacherOrAdmin =
    data.user.role === 'guru' || data.user.role === 'admin' || data.user.role === 'super_admin';
  const isStudent = data.user.role === 'siswa';

  const chapterDoneCount = chapter.subchapters.filter((s) =>
    completedSubs.includes(s.id)
  ).length;
  const chapterPercent = Math.round(
    (chapterDoneCount / Math.max(1, chapter.subchapters.length)) * 100
  );

  const handleMarkSubchapter = async (subId: string) => {
    if (!isStudent) return;
    try {
      const res = await apiRequest<{ xpAwarded: number }>('/api/progress/subchapter', {
        method: 'POST',
        body: JSON.stringify({ subchapterId: subId, chapterId: chapter.id, minutesSpent: 6 }),
      });
      await onRefresh();
      setStatusMsg(
        res.xpAwarded > 0
          ? `Subbab ditandai selesai! +${res.xpAwarded} XP.`
          : 'Progres subbab diperbarui.'
      );
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan progres.');
    }
  };

  const handleCompleteVideo = async () => {
    if (!isStudent) return;
    try {
      const res = await apiRequest<{ xpAwarded: number }>('/api/progress/activity', {
        method: 'POST',
        body: JSON.stringify({ videoChapterId: chapter.id }),
      });
      await onRefresh();
      setStatusMsg(
        res.xpAwarded > 0
          ? `Video pembelajaran Bab ${chapter.number} selesai! +${res.xpAwarded} XP.`
          : 'Video sudah tercatat selesai.'
      );
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan status video.');
    }
  };

  const handleCompleteActivity = async () => {
    if (!isStudent) {
      setStatusMsg('Mode pratinjau aktivitas interaktif berhasil diuji.');
      return;
    }
    try {
      const res = await apiRequest<{ xpAwarded: number }>('/api/progress/activity', {
        method: 'POST',
        body: JSON.stringify({ activityId: chapter.interactiveActivityId }),
      });
      await onRefresh();
      setStatusMsg(
        res.xpAwarded > 0
          ? `Aktivitas "${chapter.interactiveActivityTitle}" selesai! +${res.xpAwarded} XP.`
          : 'Aktivitas interaktif sudah tercatat selesai.'
      );
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan aktivitas.');
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStudent) return;
    try {
      await apiRequest('/api/progress/reflection', {
        method: 'POST',
        body: JSON.stringify({
          chapterId: chapter.id,
          answer1: ref1 || savedReflection?.answer1 || '',
          answer2: ref2 || savedReflection?.answer2 || '',
        }),
      });
      await onRefresh();
      setStatusMsg('Refleksi pembelajaran Anda berhasil disimpan.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal menyimpan refleksi.');
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let fileName = `${matTitle.replace(/\s+/g, '_')}.${matType === 'pdf' ? 'pdf' : matType === 'ppt' ? 'pptx' : 'dat'}`;
      let fileUrl = '/api/materials/sample/planogram';
      if (matFile) {
        const uploaded = await uploadFileToServer(matFile);
        fileName = uploaded.fileName;
        fileUrl = uploaded.fileUrl;
      }
      await apiRequest('/api/materials', {
        method: 'POST',
        body: JSON.stringify({
          chapterId: chapter.id,
          title: matTitle,
          description: matDesc,
          fileType: matType,
          fileName,
          fileUrl,
        }),
      });
      setMatTitle('');
      setMatDesc('');
      setMatFile(null);
      setShowUploadModal(false);
      await onRefresh();
      setStatusMsg('Materi tambahan berhasil diunggah dan dibagikan ke siswa.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Gagal mengunggah materi.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    await apiRequest(`/api/materials/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const chapterMaterials = data.customMaterials.filter((m) => m.chapterId === chapter.id);

  return (
    <div className="space-y-6">
      {/* Chapter Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {data.chapters.map((ch) => {
          const doneN = ch.subchapters.filter((s) => completedSubs.includes(s.id)).length;
          const pct = Math.round((doneN / ch.subchapters.length) * 100);
          const active = ch.id === chapter.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => {
                setSelectedChapterId(ch.id);
                setActiveSubId(ch.subchapters[0]?.id || '');
                setVideoSlideIdx(0);
                setStatusMsg('');
              }}
              className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                active
                  ? 'border-blue-600 bg-[#0B193D] text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={active ? 'text-amber-400 font-bold' : 'text-blue-600 dark:text-blue-400 font-bold'}>
                  BAB {ch.number}
                </span>
                <span className={active ? 'text-slate-300' : 'text-slate-500'}>{pct}%</span>
              </div>
              <p className="mt-1 text-xs font-bold leading-snug line-clamp-2">{ch.title}</p>
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg('')} className="underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Chapter Banner & Objectives */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-4 relative min-h-[200px] bg-slate-900">
            <img
              src={chapter.coverImage}
              alt={chapter.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070E24]/85 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-mono">
              Progres Bab {chapter.number}: {chapterDoneCount}/{chapter.subchapters.length} subbab ({chapterPercent}%)
            </div>
          </div>

          <div className="lg:col-span-8 p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Bab {chapter.number} · {chapter.subchapters.length} Subbab Lengkap
                </p>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {chapter.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{chapter.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenExamForChapter(chapter.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Ujian Bab {chapter.number}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white mb-1">Tujuan Pembelajaran</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {chapter.learningObjectives.map((obj) => (
                    <li key={obj}>{obj}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white mb-1">Capaian Pembelajaran</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {chapter.learningOutcomes.map((out) => (
                    <li key={out}>{out}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
          {[
            { id: 'materi', label: 'Materi Subbab' },
            { id: 'video', label: 'Video Belajar' },
            { id: 'infografis', label: 'Infografis' },
            { id: 'kasus', label: 'Studi Kasus' },
            { id: 'aktivitas', label: 'Aktivitas Interaktif' },
            { id: 'rangkuman', label: 'Rangkuman' },
            { id: 'refleksi', label: 'Refleksi' },
            { id: 'bahan', label: `Berkas (${chapterMaterials.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSectionTab(t.id as typeof sectionTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                sectionTab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isTeacherOrAdmin && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah PDF/PPT/Video</span>
          </button>
        )}
      </div>

      {/* TAB: MATERI SUBBAB */}
      {sectionTab === 'materi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1.5 max-h-[540px] overflow-y-auto">
            <p className="text-xs font-bold text-slate-500 px-2 pb-1">
              Daftar Subbab ({chapter.subchapters.length})
            </p>
            {chapter.subchapters.map((sub) => {
              const isDone = completedSubs.includes(sub.id);
              const isActive = currentSub.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubId(sub.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate">
                    {sub.order}. {sub.title}
                  </span>
                  {isDone && (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Subbab {chapter.number}.{currentSub.order} · Estimasi {currentSub.durationMinutes} menit
                </p>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {currentSub.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{currentSub.summary}</p>
              </div>

              {isStudent && (
                <button
                  type="button"
                  onClick={() => handleMarkSubchapter(currentSub.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    completedSubs.includes(currentSub.id)
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completedSubs.includes(currentSub.id) ? 'Sudah Selesai' : 'Tandai Selesai (+25 XP)'}
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
              {currentSub.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">Inti Sari Kompetensi</p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">{currentSub.keyTakeaway}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: VIDEO PEMBELAJARAN */}
      {sectionTab === 'video' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                <span>{chapter.videoLesson.title}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengajar: {chapter.videoLesson.instructor} · Durasi {chapter.videoLesson.durationLabel}
              </p>
            </div>
            {isStudent && (
              <button
                type="button"
                onClick={handleCompleteVideo}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {completedVideos.includes(chapter.id) ? 'Video Telah Ditonton' : 'Selesaikan Video (+30 XP)'}
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 rounded-xl bg-[#0B193D] text-white p-6 flex flex-col justify-between min-h-[260px]">
              <div className="flex items-center justify-between text-xs font-mono text-amber-400">
                <span>Segmen {chapter.videoLesson.slides[videoSlideIdx]?.timestamp}</span>
                <span>Slide {videoSlideIdx + 1} / {chapter.videoLesson.slides.length}</span>
              </div>
              <div className="space-y-3 my-4">
                <h4 className="font-display text-xl font-bold">
                  {chapter.videoLesson.slides[videoSlideIdx]?.heading}
                </h4>
                <ul className="space-y-2 text-sm text-slate-200 list-disc pl-5">
                  {chapter.videoLesson.slides[videoSlideIdx]?.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-white/10 px-3.5 py-2 text-xs text-blue-200">
                Visual Penjelasan: {chapter.videoLesson.slides[videoSlideIdx]?.visualNote}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-500">Penanda Waktu Video (Chapters)</p>
              {chapter.videoLesson.slides.map((sl, idx) => (
                <button
                  key={sl.timestamp}
                  type="button"
                  onClick={() => setVideoSlideIdx(idx)}
                  className={`w-full text-left rounded-lg border p-3 text-xs transition-colors cursor-pointer ${
                    idx === videoSlideIdx
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-semibold text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-mono">{sl.timestamp}</span>
                  </div>
                  <p className="mt-1">{sl.heading}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: INFOGRAFIS */}
      {sectionTab === 'infografis' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Alur Visual Konsep</p>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {chapter.infographicTitle}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {chapter.infographicNodes.map((node, idx) => (
              <div
                key={node.label}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{node.label}</span>
                  <span className="text-slate-400">#{idx + 1}</span>
                </div>
                <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {node.value}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {node.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: STUDI KASUS */}
      {sectionTab === 'kasus' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {chapter.caseStudy.title}
          </h3>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p><strong>Situasi Lapangan:</strong> {chapter.caseStudy.context}</p>
            <p><strong>Tantangan Pemecahan Masalah:</strong> {chapter.caseStudy.challenge}</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Pertanyaan Diskusi:</p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {chapter.caseStudy.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
            <p className="font-bold">Kunci Analisis Profesional:</p>
            <p className="leading-relaxed">{chapter.caseStudy.modelSolution}</p>
          </div>
        </div>
      )}

      {/* TAB: AKTIVITAS INTERAKTIF */}
      {sectionTab === 'aktivitas' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Praktik Laboratorium Pemasaran
              </p>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {chapter.interactiveActivityTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{chapter.interactiveActivityDesc}</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600">
              {completedActs.includes(chapter.interactiveActivityId) ? 'Sudah Selesai' : 'Siap Dikerjakan'}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Keputusan Praktik Terbaik untuk {chapter.interactiveActivityTitle}:
            </p>
            <div className="space-y-2">
              {[
                'Menerapkan SOP profesional, analisis data pelanggan, serta mengutamakan efisiensi dan kepuasan konsumen.',
                'Menjalankan toko tanpa pencatatan stok maupun standar komunikasi pelanggan.',
                'Mengabaikan keamanan transaksi dan etika perlindungan data.',
              ].map((opt, idx) => (
                <label
                  key={opt}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs cursor-pointer"
                >
                  <input
                    type="radio"
                    name="simOpt"
                    checked={simOption === idx}
                    onChange={() => setSimOption(idx)}
                    className="mt-0.5"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Rencana Aksi Singkat Anda:
              </label>
              <textarea
                rows={3}
                value={simAnswer}
                onChange={(e) => setSimAnswer(e.target.value)}
                placeholder="Tuliskan langkah konkret yang Anda pilih dalam simulasi bab ini..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={simOption !== 0 || simAnswer.trim().length < 10}
              onClick={handleCompleteActivity}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesaikan Aktivitas Interaktif (+60 XP)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: RANGKUMAN */}
      {sectionTab === 'rangkuman' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Rangkuman Bab {chapter.number}</span>
          </h3>
          <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200 list-disc pl-5">
            {chapter.summaryPoints.map((pt) => (
              <li key={pt} className="leading-relaxed">{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TAB: REFLEKSI */}
      {sectionTab === 'refleksi' && (
        <form
          onSubmit={handleSaveReflection}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Refleksi Pembelajaran Bab {chapter.number}
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              1. {chapter.reflectionPrompts[0]}
            </label>
            <textarea
              rows={3}
              value={ref1 || savedReflection?.answer1 || ''}
              onChange={(e) => setRef1(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
              placeholder="Tuliskan refleksi pemahaman Anda..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              2. {chapter.reflectionPrompts[1]}
            </label>
            <textarea
              rows={3}
              value={ref2 || savedReflection?.answer2 || ''}
              onChange={(e) => setRef2(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
              placeholder="Tuliskan rencana penerapan Anda..."
            />
          </div>
          {isStudent && (
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Simpan Refleksi Pembelajaran
            </button>
          )}
        </form>
      )}

      {/* TAB: BAHAN AJAR GURU */}
      {sectionTab === 'bahan' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Dokumen &amp; Bahan Ajar Tambahan (PDF, PPT, Video, Gambar)
            </h3>
          </div>
          {chapterMaterials.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada berkas tambahan untuk bab ini.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chapterMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-[11px] font-mono uppercase text-blue-600 dark:text-blue-400">
                      {mat.fileType} · {mat.fileName}
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{mat.title}</p>
                    <p className="text-xs text-slate-500">{mat.description}</p>
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline pt-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Buka / Unduh Berkas
                    </a>
                  </div>
                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(mat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Hapus materi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Unggah Materi Guru */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleUploadMaterial}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Unggah Materi Bab {chapter.number}
            </h3>
            <div>
              <label className="block text-xs font-semibold mb-1">Judul Materi</label>
              <input
                type="text"
                required
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                placeholder="Contoh: Modul Planogram Ritel"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jenis Berkas</label>
              <select
                value={matType}
                onChange={(e) => setMatType(e.target.value as typeof matType)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="pdf">Dokumen PDF</option>
                <option value="ppt">Presentasi PPT/PPTX</option>
                <option value="video">Video Pembelajaran</option>
                <option value="gambar">Infografis / Gambar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Deskripsi Singkat</label>
              <textarea
                rows={2}
                value={matDesc}
                onChange={(e) => setMatDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Pilih Berkas (Opsional, maks 12MB)</label>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.mp4,.webm,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                className="w-full text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Mengunggah...' : 'Simpan Materi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
