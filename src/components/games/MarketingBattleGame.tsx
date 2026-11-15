import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Swords } from 'lucide-react';

interface MarketingBattleProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

interface BattleQuestion {
  id: string;
  tag: string;
  prompt: string;
  options: string[];
  correct: number;
}

const BATTLE_POOL: BattleQuestion[] = [
  {
    id: 'mb-1',
    tag: 'Pilihan Ganda',
    prompt: 'Metode rotasi produk susu kemasan di minimarket agar produk terdekat kedaluwarsa terjual dulu adalah...',
    options: ['LIFO', 'FEFO', 'JIT', 'Dropship'],
    correct: 1,
  },
  {
    id: 'mb-2',
    tag: 'Benar / Salah',
    prompt: 'Posisi rak paling menguntungkan untuk produk impulsif bernilai margin tinggi adalah sejajar pandangan mata (eye-level).',
    options: ['Benar', 'Salah'],
    correct: 0,
  },
  {
    id: 'mb-3',
    tag: 'Susun Strategi',
    prompt: 'Urutan langkah penanganan keluhan pelanggan menurut kerangka LAST yang benar adalah...',
    options: [
      'Listen -> Apologize -> Solve -> Thank',
      'Leave -> Argue -> Sell -> Talk',
      'Look -> Ask -> Stop -> Tell',
      'Learn -> Audit -> Save -> Test',
    ],
    correct: 0,
  },
  {
    id: 'mb-4',
    tag: 'Analisis Kasus',
    prompt: 'Pelanggan membeli via aplikasi toko lalu mengambil barang di gerai fisik terdekat. Strategi ini dinamakan...',
    options: ['BOPIS (Omnichannel)', 'Wholesaling', 'Direct Mail', 'Cash on Delivery'],
    correct: 0,
  },
  {
    id: 'mb-5',
    tag: 'Tebak Display & K3',
    prompt: 'Jika rak bawah menyimpan galon air 19L dan rak atas menyimpan keripik ringan, tata letak tersebut memenuhi prinsip...',
    options: ['Pelanggaran K3', 'Keselamatan beban & ergonomi rak', 'Shrinkage', 'Overstock'],
    correct: 1,
  },
  {
    id: 'mb-6',
    tag: 'Digital Marketing',
    prompt: 'Sistem yang menyimpan riwayat belanja pelanggan untuk memberi penawaran personal dan poin loyalitas adalah...',
    options: ['CRM', 'APAR', 'FIFO', 'SKU'],
    correct: 0,
  },
  {
    id: 'mb-7',
    tag: 'Profesi Ritel',
    prompt: 'Profesi yang bertanggung jawab merancang planogram, label harga, dan rotasi pajangan di lantai toko adalah...',
    options: ['Merchandiser', 'Auditor Pajak', 'Kurir', 'Security'],
    correct: 0,
  },
];

export const MarketingBattleGame: React.FC<MarketingBattleProps> = ({ onFinish, onCancel }) => {
  const [mode, setMode] = useState<'individu' | 'kelompok'>('individu');
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [startTime] = useState(() => Date.now());

  // Randomize 5 questions on mount (anti-cheating)
  const questions = useMemo(() => {
    const copy = [...BATTLE_POOL];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, 5);
  }, []);

  const isDone = started && (index >= questions.length || secondsLeft <= 0);

  useEffect(() => {
    if (!started || isDone) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [started, isDone]);

  const handleAnswer = (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const q = questions[index];
    if (optIdx === q.correct) {
      setCorrectCount((c) => c + 1);
    }
    // Simulated rival bot/team progress
    if (Math.random() > 0.35) {
      setOpponentScore((o) => o + 20);
    }
    setTimeout(() => {
      setSelected(null);
      setIndex((i) => i + 1);
    }, 650);
  };

  const myScore = Math.round((correctCount / questions.length) * 100);

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Marketing Battle — Arena Kuis Kompetitif
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Soal diacak otomatis setiap sesi. Jawab akurat dalam batas waktu 90 detik.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Kembali
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode('individu')}
            className={`rounded-xl border p-5 text-left transition-colors cursor-pointer ${
              mode === 'individu'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="font-display font-bold text-slate-900 dark:text-white">Duel Individu</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Tanding cepat 1 lawan 1 menghadapi penantang kelas X PM.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('kelompok')}
            className={`rounded-xl border p-5 text-left transition-colors cursor-pointer ${
              mode === 'kelompok'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="font-display font-bold text-slate-900 dark:text-white">Kompetisi Kelompok</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Sumbang poin kompetensi tim kelas untuk peringkat leaderboard.
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>Mulai Pertandingan ({mode === 'individu' ? 'Mode Individu' : 'Mode Kelompok'})</span>
        </button>
      </div>
    );
  }

  if (isDone) {
    const won = myScore >= opponentScore;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          {won ? 'Kemenangan Kompetensi!' : 'Pertandingan Selesai'}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-500">Skor Anda</p>
            <p className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{myScore}</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-500">Skor Penantang</p>
            <p className="font-mono text-2xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">{opponentScore}</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-500">Jawaban Benar</p>
            <p className="font-mono text-2xl font-bold text-emerald-600 tabular-nums">
              {correctCount}/{questions.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onFinish({
              score: myScore,
              accuracy: myScore,
              durationSeconds: Math.max(10, Math.round((Date.now() - startTime) / 1000)),
              metrics: {
                mode: mode === 'individu' ? 'Individu' : 'Kelompok',
                hasil: won ? 'Menang' : 'Selesai',
              },
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Hasil ke Leaderboard</span>
        </button>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Soal {index + 1} dari {questions.length} · {q.tag}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-bold">
          <span className="text-blue-600 dark:text-blue-400">Anda: {myScore}</span>
          <span className="text-slate-500">Lawan: {opponentScore}</span>
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Clock className="w-3.5 h-3.5" /> {secondsLeft}d
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h4 className="font-display text-base font-bold text-slate-900 dark:text-white leading-snug">
          {q.prompt}
        </h4>
        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map((opt, idx) => {
            const isPicked = selected === idx;
            const isRight = idx === q.correct;
            let cls =
              'border-slate-200 dark:border-slate-700 hover:border-blue-600 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100';
            if (selected !== null) {
              if (isRight) cls = 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200';
              else if (isPicked) cls = 'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200';
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswer(idx)}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
