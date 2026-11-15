import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface K3ChallengeProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

interface HazardZone {
  id: string;
  area: string;
  finding: string;
  question: string;
  options: string[];
  correct: number;
}

const ZONES: HazardZone[] = [
  {
    id: 'z1',
    area: 'Lorong 2 (Area Minuman)',
    finding: 'Tumpahan air dingin di lantai keramik dekat kulkas.',
    question: 'Tindakan K3 paling tepat dilakukan pertama kali?',
    options: [
      'Pasang papan peringatan lantai licin dan segera pel hingga kering',
      'Tunggu sampai jam tutup toko agar tidak mengganggu pembeli',
      'Tutup tumpahan dengan kardus bekas tanpa rambu',
    ],
    correct: 0,
  },
  {
    id: 'z2',
    area: 'Pintu Darurat Gudang',
    finding: 'Tumpukan 12 kardus stok baru menghalangi jalur pintu keluar darurat.',
    question: 'Mengapa kondisi ini melanggar SOP K3 ritel?',
    options: [
      'Menghambat evakuasi cepat saat terjadi kebakaran atau gempa',
      'Membuat harga barang di kasir berubah',
      'Tidak berpengaruh selama bukan jam istirahat',
    ],
    correct: 0,
  },
  {
    id: 'z3',
    area: 'Rak Gudang Bagian Atas',
    finding: 'Jeriken deterjen cair 5 liter diletakkan di rak paling atas di sebelah snack kemasan.',
    question: 'Perbaikan keselamatan penyimpanan barang yang benar adalah?',
    options: [
      'Pindahkan jeriken berat dan bahan kimia ke rak bawah terpisah dari bahan pangan',
      'Biarkan di atas agar terlihat rapi dari pintu masuk',
      'Tumpuk lebih tinggi lagi supaya hemat ruang',
    ],
    correct: 0,
  },
  {
    id: 'z4',
    area: 'Meja Kasir 1',
    finding: 'Kabel stopkontak mesin EDC terkelupas dan melintang di pijakan kaki kasir.',
    question: 'Langkah pencegahan kecelakaan listrik dan tersandung?',
    options: [
      'Matikan aliran, ganti kabel layak pakai, dan rapikan dengan pelindung kabel',
      'Tempel lakban kertas tipis sambil terus menyalakan mesin',
      'Siram sedikit air supaya kabel lentur',
    ],
    correct: 0,
  },
  {
    id: 'z5',
    area: 'Sudut Dinding Tabung APAR',
    finding: 'Jarum tekanan APAR berada di zona merah dan catatan inspeksi melewati batas.',
    question: 'Tindakan supervisor keamanan toko?',
    options: [
      'Laporkan segera untuk isi ulang/penggantian APAR aktif yang teruji',
      'Gunakan untuk mengganjal pintu gudang',
      'Abaikan karena jarang terjadi kebakaran',
    ],
    correct: 0,
  },
];

export const K3ChallengeGame: React.FC<K3ChallengeProps> = ({ onFinish, onCancel }) => {
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string>(ZONES[0].id);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [startTime] = useState(() => Date.now());

  const activeZone = ZONES.find((z) => z.id === activeId) || ZONES[0];
  const resolvedCount = Object.values(resolved).filter(Boolean).length;
  const allDone = resolvedCount === ZONES.length;

  const handlePick = (optIdx: number) => {
    if (resolved[activeZone.id]) return;
    if (optIdx === activeZone.correct) {
      setResolved((prev) => ({ ...prev, [activeZone.id]: true }));
      setFeedback(`Benar! Bahaya di ${activeZone.area} berhasil ditangani sesuai SOP K3.`);
      const next = ZONES.find((z) => z.id !== activeZone.id && !resolved[z.id]);
      if (next) setActiveId(next.id);
    } else {
      setWrongAttempts((w) => w + 1);
      setFeedback('Kurang tepat — pertimbangkan keselamatan pelanggan, ergonomi, dan standar evakuasi.');
    }
  };

  const finalScore = Math.max(50, 100 - wrongAttempts * 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            K3 Retail Challenge — Inspeksi Keselamatan Toko ({resolvedCount}/{ZONES.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Klik setiap zona inspeksi di denah toko untuk mengidentifikasi bahaya dan memilih tindakan korektif.
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

      {/* Store Floorplan Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {ZONES.map((z, idx) => {
          const isOk = Boolean(resolved[z.id]);
          const isCur = activeZone.id === z.id;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => {
                setActiveId(z.id);
                setFeedback('');
              }}
              className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                isOk
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : isCur
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                <span>Zona {idx + 1}</span>
                {isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">{z.area}</p>
            </button>
          );
        })}
      </div>

      {!allDone ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Temuan Inspeksi · {activeZone.area}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{activeZone.finding}</p>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-900 dark:text-white">{activeZone.question}</p>
          <div className="space-y-2.5">
            {activeZone.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => handlePick(idx)}
                className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 text-sm text-slate-800 dark:text-slate-100 hover:border-blue-600 cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>

          {feedback && (
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{feedback}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-6 space-y-4">
          <h4 className="font-display text-lg font-bold text-emerald-950 dark:text-emerald-200">
            Seluruh 5 Zona Toko Lulus Audit K3!
          </h4>
          <p className="text-sm text-emerald-900 dark:text-emerald-300">
            Skor Keselamatan Kerja Anda: <strong className="font-mono">{finalScore}/100</strong> (Kesalahan koreksi: {wrongAttempts}x).
          </p>
          <button
            type="button"
            onClick={() =>
              onFinish({
                score: finalScore,
                accuracy: finalScore,
                durationSeconds: Math.max(15, Math.round((Date.now() - startTime) / 1000)),
                metrics: { bahayaDitemukan: '5/5', kesalahan: wrongAttempts },
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Skor Audit K3</span>
          </button>
        </div>
      )}
    </div>
  );
};
