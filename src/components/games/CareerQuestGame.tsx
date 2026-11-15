import React, { useState } from 'react';
import { Briefcase, CheckCircle2 } from 'lucide-react';

interface CareerQuestProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

interface CareerMission {
  role: string;
  scenario: string;
  options: string[];
  correct: number;
  explanation: string;
}

const CAREERS: CareerMission[] = [
  {
    role: 'Kasir Profesional',
    scenario: 'Saat closing shift malam, kasir mendapati selisih Rp25.000 antara uang fisik di laci dan laporan sistem POS.',
    options: [
      'Menghitung ulang lembar uang, memeriksa struk pembatalan/void, dan melaporkan jujur ke Supervisor.',
      'Menutupi selisih dengan mengambil barang pajangan agar tidak dimarahi.',
      'Langsung pulang dan membiarkan shift pagi menghitung.',
    ],
    correct: 0,
    explanation: 'Integritas dan audit transaksi wajib dilakukan sebelum serah terima shift.',
  },
  {
    role: 'Sales Executive',
    scenario: 'Seorang pemilik koperasi sekolah ragu memesan 50 dus minuman karena khawatir stok tidak habis sebelum masa kedaluwarsa.',
    options: [
      'Menawarkan pengiriman bertahap (2 kali kirim) agar stok selalu segar disertai dukungan banner promo.',
      'Memaksa mereka beli 100 dus sekaligus tanpa garansi.',
      'Mengakhiri pertemuan karena dianggap tidak potensial.',
    ],
    correct: 0,
    explanation: 'Sales Executive handal memberi solusi win-win atas kekhawatiran risiko klien.',
  },
  {
    role: 'Merchandiser',
    scenario: 'Produk sereal sarapan baru sulit laku padahal kualitasnya bagus dan harganya terjangkau.',
    options: [
      'Memindahkannya dari rak paling bawah ke rak eye-level dekat susu UHT dengan signage promo sarapan.',
      'Menyembunyikannya di gudang belakang.',
      'Menghapus label harga supaya pembeli penasaran.',
    ],
    correct: 0,
    explanation: 'Cross-merchandising di posisi eye-level meningkatkan visibilitas dan pembelian impulsif.',
  },
  {
    role: 'Supervisor Toko',
    scenario: 'Dua anggota tim pramuniaga berdebat soal pembagian tugas merapikan gudang saat toko sedang ramai pelanggan.',
    options: [
      'Menengahi secara tenang di ruang belakang, membagi tugas jelas per zona, dan memprioritaskan pelayanan lantai toko.',
      'Memarahi keduanya di depan pelanggan yang sedang antre.',
      'Membiarkan perdebatan berlangsung agar mereka belajar mandiri.',
    ],
    correct: 0,
    explanation: 'Supervisor menjaga profesionalisme di hadapan pembeli dan menegakkan kejelasan pembagian kerja.',
  },
  {
    role: 'Digital Marketer',
    scenario: 'Iklan produk fesyen menghasilkan banyak klik (CTR tinggi 5%) namun tingkat pembelian di halaman toko hanya 0,4%.',
    options: [
      'Mengevaluasi halaman produk: perjelas foto ukuran, ongkir, ulasan pembeli, dan permudah checkout QRIS.',
      'Terus menambah anggaran iklan tanpa mengubah halaman produk.',
      'Membeli komentar ulasan palsu.',
    ],
    correct: 0,
    explanation: 'CTR tinggi namun konversi rendah menandakan kendala pada landing page atau kejelasan informasi checkout.',
  },
  {
    role: 'Pengusaha Ritel',
    scenario: 'Anda ingin membuka gerai ritel camilan modern di dekat dua sekolah SMK dan satu kawasan kos mahasiswa.',
    options: [
      'Menyusun Business Model Canvas, menghitung BEP, menguji 3 produk terlaris, dan menyiapkan layanan pre-order cashless.',
      'Langsung menyewa ruko 5 tahun tanpa riset pasar atau perhitungan HPP.',
      'Menjual produk yang sama persis tanpa diferensiasi harga atau layanan.',
    ],
    correct: 0,
    explanation: 'Kewirausahaan ritel yang matang memadukan validasi pasar, kontrol biaya, dan keunikan nilai.',
  },
];

export const CareerQuestGame: React.FC<CareerQuestProps> = ({ onFinish, onCancel }) => {
  const [step, setStep] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [note, setNote] = useState('');
  const [startTime] = useState(() => Date.now());

  const done = step >= CAREERS.length;
  const current = CAREERS[step];

  const choose = (idx: number) => {
    if (note) return;
    if (idx === current.correct) setCorrectCount((c) => c + 1);
    setNote(current.explanation);
    setTimeout(() => {
      setNote('');
      setStep((s) => s + 1);
    }, 1100);
  };

  const score = Math.round((correctCount / CAREERS.length) * 100);

  if (done) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-amber-500" />
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Seluruh 6 Misi Profesi Career Quest Tuntas!
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ketepatan Keputusan Profesional: <strong className="font-mono text-blue-600 dark:text-blue-400">{correctCount}/{CAREERS.length} ({score}/100)</strong>
        </p>
        <button
          type="button"
          onClick={() =>
            onFinish({
              score,
              accuracy: score,
              durationSeconds: Math.max(20, Math.round((Date.now() - startTime) / 1000)),
              metrics: { profesiTuntas: '6 Profesi', skor: score },
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Pencapaian Career Quest</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Career Quest — Misi {step + 1}/{CAREERS.length}: {current.role}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selesaikan skenario keputusan profesional di setiap jenjang karier pemasaran.
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Peran Aktif: {current.role}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">{current.scenario}</p>

        <div className="space-y-2.5">
          {current.options.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onClick={() => choose(idx)}
              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 text-sm text-slate-800 dark:text-slate-100 hover:border-blue-600 cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>

        {note && (
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
            {note}
          </div>
        )}
      </div>
    </div>
  );
};
