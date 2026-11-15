import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileCheck2, Plus, Send } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest, uploadFileToServer } from '../utils/api.ts';
import type { Assessment, AssessmentAttempt, QuestionItem } from '../types/index.ts';

interface AssessmentViewProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
  focusChapterId?: string | null;
}

const KIND_LABELS: Record<string, string> = {
  pre_test: 'Pre-Test',
  subbab_quiz: 'Kuis Subbab',
  ujian_bab: 'Ujian Bab',
  post_test: 'Post-Test',
  uas: 'Ujian Akhir Semester',
};

export const AssessmentView: React.FC<AssessmentViewProps> = ({
  data,
  onRefresh,
  focusChapterId,
}) => {
  const [tab, setTab] = useState<'exams' | 'assignments' | 'manage'>('exams');
  const [chapterFilter, setChapterFilter] = useState<string>(focusChapterId || 'all');

  // Active exam session
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [examStartTime, setExamStartTime] = useState(0);
  const [examResult, setExamResult] = useState<{
    attempt: AssessmentAttempt;
    xpEarned: number;
    assessment: Assessment;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Assignment submission state
  const [activeAssignId, setActiveAssignId] = useState<string | null>(null);
  const [assignContent, setAssignContent] = useState('');
  const [assignFile, setAssignFile] = useState<File | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Teacher grading state
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: number; feedback: string }>>({});

  // Teacher builder states
  const [newAssessTitle, setNewAssessTitle] = useState('');
  const [newAssessKind, setNewAssessKind] = useState<Assessment['kind']>('subbab_quiz');
  const [newAssessChapter, setNewAssessChapter] = useState('bab-1');
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOpts, setNewQOpts] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);
  const [newQExplain, setNewQExplain] = useState('');

  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgChapter, setNewAsgChapter] = useState('bab-1');
  const [newAsgKind, setNewAsgKind] = useState<'individu' | 'kelompok' | 'praktik' | 'proyek'>('individu');
  const [newAsgDue, setNewAsgDue] = useState('2026-12-01');

  const [weights, setWeights] = useState(data.gradeWeights);

  const isTeacherOrAdmin =
    data.user.role === 'guru' || data.user.role === 'admin' || data.user.role === 'super_admin';
  const isStudent = data.user.role === 'siswa';

  // Randomized questions for active exam
  const randomizedQuestions: QuestionItem[] = useMemo(() => {
    if (!activeAssessment) return [];
    const copy = [...activeAssessment.questions];
    if (activeAssessment.randomizeQuestions) {
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
    }
    return copy;
  }, [activeAssessment]);

  useEffect(() => {
    if (!activeAssessment || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAssessment, secondsLeft]);

  const startAssessment = (assess: Assessment) => {
    setErrorMsg('');
    setExamResult(null);
    setAnswers({});
    setActiveAssessment(assess);
    setSecondsLeft(assess.durationMinutes * 60);
    setExamStartTime(Date.now());
  };

  const submitAssessment = async () => {
    if (!activeAssessment) return;
    if (!isStudent) {
      setActiveAssessment(null);
      return;
    }
    try {
      const dur = Math.max(10, Math.round((Date.now() - examStartTime) / 1000));
      const res = await apiRequest<{ attempt: AssessmentAttempt; xpEarned: number }>(
        `/api/assessments/${activeAssessment.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ answers, durationSeconds: dur }),
        }
      );
      await onRefresh();
      setExamResult({
        attempt: res.attempt,
        xpEarned: res.xpEarned,
        assessment: activeAssessment,
      });
      setActiveAssessment(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim jawaban.');
      setActiveAssessment(null);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignId) return;
    setSubmittingAssign(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      if (assignFile) {
        const up = await uploadFileToServer(assignFile);
        attachmentUrl = up.fileUrl;
        attachmentName = up.fileName;
      }
      await apiRequest(`/api/assignments/${activeAssignId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ content: assignContent, attachmentUrl, attachmentName }),
      });
      setActiveAssignId(null);
      setAssignContent('');
      setAssignFile(null);
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengumpulkan tugas.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleGradeSubmission = async (subId: string) => {
    const inp = gradeInputs[subId] || { score: 85, feedback: 'Baik, pertahankan.' };
    await apiRequest(`/api/submissions/${subId}/grade`, {
      method: 'POST',
      body: JSON.stringify(inp),
    });
    await onRefresh();
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/assessments', {
      method: 'POST',
      body: JSON.stringify({
        title: newAssessTitle,
        kind: newAssessKind,
        chapterId: newAssessChapter,
        durationMinutes: 15,
        maxAttempts: 2,
        passingScore: 75,
        questions: [
          {
            prompt: newQPrompt,
            type: 'multiple_choice',
            options: newQOpts.filter((o) => o.trim().length > 0),
            correctIndex: newQCorrect,
            explanation: newQExplain,
          },
        ],
      }),
    });
    setNewAssessTitle('');
    setNewQPrompt('');
    setNewQOpts(['', '', '', '']);
    await onRefresh();
    setTab('exams');
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title: newAsgTitle,
        description: newAsgDesc,
        chapterId: newAsgChapter,
        kind: newAsgKind,
        dueDate: newAsgDue,
      }),
    });
    setNewAsgTitle('');
    setNewAsgDesc('');
    await onRefresh();
    setTab('assignments');
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/api/settings/weights', {
        method: 'PUT',
        body: JSON.stringify(weights),
      });
      await onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan bobot nilai.');
    }
  };

  if (activeAssessment) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {KIND_LABELS[activeAssessment.kind]} · Soal Diacak Otomatis
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {activeAssessment.title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setActiveAssessment(null)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {randomizedQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {idx + 1}. {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                      answers[q.id] === optIdx
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === optIdx}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={submitAssessment}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Kumpulkan Jawaban Evaluasi</span>
        </button>
      </div>
    );
  }

  const visibleAssessments = data.assessments.filter(
    (a) => chapterFilter === 'all' || a.chapterId === chapterFilter || a.chapterId === null
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Sistem Evaluasi, Tugas &amp; Penilaian Otomatis
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pre-test, kuis, ujian bab, post-test, UAS, serta pengumpulan tugas individu, kelompok, dan proyek.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setTab('exams')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
              tab === 'exams'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Kuis &amp; Ujian
          </button>
          <button
            type="button"
            onClick={() => setTab('assignments')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
              tab === 'assignments'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tugas &amp; Proyek
          </button>
          {isTeacherOrAdmin && (
            <button
              type="button"
              onClick={() => setTab('manage')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                tab === 'manage'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Buat &amp; Bobot Nilai
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {examResult && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Hasil Penilaian Otomatis
              </p>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {examResult.assessment.title}
              </h3>
            </div>
            <div className="text-right font-mono">
              <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {examResult.attempt.score}/100
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Benar {examResult.attempt.correctCount}/{examResult.attempt.totalQuestions} · +{examResult.xpEarned} XP
              </p>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
            {examResult.assessment.questions.map((q, i) => (
              <p key={q.id} className="text-xs text-slate-700 dark:text-slate-300">
                <strong>{i + 1}.</strong> {q.explanation}
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === 'exams' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
            >
              <option value="all">Semua Bab &amp; Ujian Umum</option>
              {data.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Bab {c.number}: {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleAssessments.map((a) => {
              const myAttempts = data.assessmentAttempts.filter(
                (at) => at.assessmentId === a.id && (!isStudent || at.studentId === data.user.id)
              );
              const best = myAttempts.length > 0 ? Math.max(...myAttempts.map((x) => x.score)) : null;
              const maxedOut = isStudent && myAttempts.length >= a.maxAttempts;

              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {KIND_LABELS[a.kind]} · {a.questions.length} Soal
                      </span>
                      <span className="font-mono text-slate-500">
                        {a.durationMinutes} mnt · Maks {a.maxAttempts}x
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Jadwal: {a.scheduledDate} · KKM: {a.passingScore}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-mono">
                      {best !== null ? (
                        <span className={best >= a.passingScore ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                          Skor Terbaik: {best} ({myAttempts.length}/{a.maxAttempts})
                        </span>
                      ) : (
                        <span className="text-slate-400">Belum dikerjakan</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={maxedOut}
                      onClick={() => startAssessment(a)}
                      className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                    >
                      {maxedOut ? 'Batas Tercapai' : isStudent ? 'Kerjakan' : 'Pratinjau Soal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          {data.assignments.map((asg) => {
            const mySub = data.submissions.find(
              (s) => s.assignmentId === asg.id && s.studentId === data.user.id
            );
            const allSubsForTeachers = data.submissions.filter((s) => s.assignmentId === asg.id);

            return (
              <div
                key={asg.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 capitalize">
                      Tugas {asg.kind} · Bab {asg.chapterId.replace('bab-', '')} · Tenggat {asg.dueDate}
                    </p>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {asg.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{asg.description}</p>
                  </div>

                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAssignId(asg.id);
                        setAssignContent(mySub?.content || '');
                      }}
                      className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer shrink-0"
                    >
                      {mySub ? 'Perbarui Jawaban' : 'Kumpulkan Tugas'}
                    </button>
                  )}
                </div>

                {isStudent && mySub && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {mySub.status === 'graded' ? `Dinilai: ${mySub.score}/100` : 'Terkirim · Menunggu Penilaian'}
                      </span>
                      {mySub.attachmentName && (
                        <a href={mySub.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          {mySub.attachmentName}
                        </a>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{mySub.content}</p>
                    {mySub.feedback && (
                      <p className="text-blue-700 dark:text-blue-300 font-medium">
                        Umpan Balik Guru: {mySub.feedback}
                      </p>
                    )}
                  </div>
                )}

                {isTeacherOrAdmin && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Jawaban Siswa ({allSubsForTeachers.length})
                    </p>
                    {allSubsForTeachers.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada siswa yang mengumpulkan.</p>
                    ) : (
                      allSubsForTeachers.map((sub) => {
                        const student = data.users.find((u) => u.id === sub.studentId);
                        const curInput = gradeInputs[sub.id] || {
                          score: sub.score ?? 88,
                          feedback: sub.feedback ?? 'Kerja bagus, analisis jelas.',
                        };
                        return (
                          <div
                            key={sub.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{student?.name || sub.studentId}</span>
                              <span className="font-mono text-blue-600">
                                {sub.status === 'graded' ? `Nilai: ${sub.score}` : 'Belum Dinilai'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300">{sub.content}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={curInput.score}
                                onChange={(e) =>
                                  setGradeInputs((prev) => ({
                                    ...prev,
                                    [sub.id]: { ...curInput, score: Number(e.target.value) },
                                  }))
                                }
                                className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono"
                              />
                              <input
                                type="text"
                                value={curInput.feedback}
                                onChange={(e) =>
                                  setGradeInputs((prev) => ({
                                    ...prev,
                                    [sub.id]: { ...curInput, feedback: e.target.value },
                                  }))
                                }
                                className="flex-1 min-w-[180px] rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1"
                                placeholder="Umpan balik guru..."
                              />
                              <button
                                type="button"
                                onClick={() => handleGradeSubmission(sub.id)}
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" /> Simpan Nilai
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activeAssignId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
              <form
                onSubmit={handleSubmitAssignment}
                className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xl"
              >
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Kumpulkan Jawaban Tugas
                </h3>
                <textarea
                  rows={5}
                  required
                  value={assignContent}
                  onChange={(e) => setAssignContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
                  placeholder="Tuliskan ringkasan hasil observasi atau jawaban proyek Anda..."
                />
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Lampiran Berkas (PDF / Gambar / PPT, opsional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setAssignFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAssignId(null)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAssign}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    {submittingAssign ? 'Mengirim...' : 'Kirim Tugas'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === 'manage' && isTeacherOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bobot Nilai */}
          <form
            onSubmit={handleSaveWeights}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Pengaturan Bobot Nilai (Total 100%)
            </h3>
            {[
              { key: 'knowledge', label: 'Nilai Pengetahuan (%)' },
              { key: 'skill', label: 'Nilai Keterampilan (%)' },
              { key: 'project', label: 'Nilai Proyek & Tugas (%)' },
              { key: 'game', label: 'Nilai Game Edukasi (%)' },
            ].map((item) => (
              <div key={item.key}>
                <label className="block text-xs font-semibold mb-1">{item.label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[item.key as keyof typeof weights]}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [item.key]: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                />
              </div>
            ))}
            <p className="text-xs font-mono">
              Jumlah Saat Ini: {weights.knowledge + weights.skill + weights.project + weights.game}%
            </p>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Simpan Bobot Penilaian
            </button>
          </form>

          {/* Buat Kuis / Ujian */}
          <form
            onSubmit={handleCreateAssessment}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Buat Kuis / Ujian Baru
            </h3>
            <input
              type="text"
              required
              value={newAssessTitle}
              onChange={(e) => setNewAssessTitle(e.target.value)}
              placeholder="Judul Kuis / Ujian"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newAssessKind}
                onChange={(e) => setNewAssessKind(e.target.value as Assessment['kind'])}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
              >
                <option value="subbab_quiz">Kuis Subbab</option>
                <option value="ujian_bab">Ujian Bab</option>
                <option value="pre_test">Pre-Test</option>
                <option value="post_test">Post-Test</option>
                <option value="uas">UAS</option>
              </select>
              <select
                value={newAssessChapter}
                onChange={(e) => setNewAssessChapter(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
              >
                {data.chapters.map((c) => (
                  <option key={c.id} value={c.id}>Bab {c.number}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              value={newQPrompt}
              onChange={(e) => setNewQPrompt(e.target.value)}
              placeholder="Pertanyaan soal..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            {newQOpts.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIdx"
                  checked={newQCorrect === idx}
                  onChange={() => setNewQCorrect(idx)}
                />
                <input
                  type="text"
                  required={idx < 2}
                  value={opt}
                  onChange={(e) =>
                    setNewQOpts((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                  }
                  placeholder={`Pilihan ${idx + 1}`}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs"
                />
              </div>
            ))}
            <input
              type="text"
              value={newQExplain}
              onChange={(e) => setNewQExplain(e.target.value)}
              placeholder="Pembahasan jawaban benar..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B193D] dark:bg-blue-600 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Publikasikan Evaluasi
            </button>
          </form>

          {/* Buat Tugas */}
          <form
            onSubmit={handleCreateAssignment}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Buat Tugas / Proyek Baru
            </h3>
            <input
              type="text"
              required
              value={newAsgTitle}
              onChange={(e) => setNewAsgTitle(e.target.value)}
              placeholder="Judul Tugas / Proyek"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newAsgChapter}
                onChange={(e) => setNewAsgChapter(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
              >
                {data.chapters.map((c) => (
                  <option key={c.id} value={c.id}>Bab {c.number}</option>
                ))}
              </select>
              <select
                value={newAsgKind}
                onChange={(e) => setNewAsgKind(e.target.value as typeof newAsgKind)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
              >
                <option value="individu">Individu</option>
                <option value="kelompok">Kelompok</option>
                <option value="praktik">Praktik</option>
                <option value="proyek">Proyek</option>
              </select>
            </div>
            <input
              type="date"
              value={newAsgDue}
              onChange={(e) => setNewAsgDue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
            />
            <textarea
              rows={4}
              required
              value={newAsgDesc}
              onChange={(e) => setNewAsgDesc(e.target.value)}
              placeholder="Instruksi tugas dan kriteria penilaian..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B193D] dark:bg-blue-600 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Bagikan Tugas ke Siswa
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
