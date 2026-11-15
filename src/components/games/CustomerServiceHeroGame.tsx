import React, { useState } from 'react';
import { CheckCircle2, MessageSquareHeart } from 'lucide-react';

interface CustomerServiceHeroProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

interface Scenario {
  character: string;
  mood: string;
  customerLine: string;
  stage: string;
  choices: {
    text: string;
    points: number;
    feedback: string;
  }[];
}

const SCENARIOS: Scenario[] = [
  {
    character: 'Ibu Sari (Pelanggan Baru)',
    mood: 'Bingung mencari produk',
    stage: 'Menyambut & Mengidentifikasi Kebutuhan',
    customerLine: 'Permisi Dek, saya lagi cari bahan minuman sehat buat bekal anak sekolah, tapi bingung pilih yang mana ya?',
    choices: [
      {
        text: 'Selamat pagi Ibu, mari saya bantu! Anak Ibu biasanya lebih suka rasa buah segar atau susu rendah gula ya?',
        points: 25,
        feedback: 'Tepat! Menerapkan 3S dan pertanyaan terbuka untuk menggali kebutuhan pelanggan.',
      },
      {
        text: 'Lihat saja sendiri di rak sebelah sana Bu, label harganya sudah ada semua.',
        points: 5,
        feedback: 'Kurang ramah dan tidak membantu mengidentifikasi kebutuhan pembeli.',
      },
      {
        text: 'Beli saja yang paling mahal Bu, pasti enak.',
        points: 10,
        feedback: 'Menawarkan tanpa memahami preferensi dan kebutuhan anak.',
      },
    ],
  },
  {
    character: 'Bapak Hendra (Pelanggan Komplain)',
    mood: 'Kesal karena kemasan penyok',
    stage: 'Menangani Keluhan (Metode LAST)',
    customerLine: 'Kenapa roti yang saya beli barusan ternyata kemasannya robek di bagian bawah?! Padahal baru sampai parkiran!',
    choices: [
      {
        text: 'Maaf Pak atas ketidaknyamanannya, pasti Bapak kecewa. Boleh saya lihat struknya agar langsung kami tukar dengan roti baru yang tersegel rapi?',
        points: 25,
        feedback: 'Sempurna! Mengakui perasaan pelanggan, meminta maaf tulus, dan langsung memberi solusi.',
      },
      {
        text: 'Itu salah Bapak sendiri waktu memasukkan ke tas belanja, di kasir tadi baik-baik saja.',
        points: 0,
        feedback: 'Sikap defensif dan menyalahkan pelanggan memperburuk citra toko.',
      },
      {
        text: 'Ya sudah tunggu sebentar ya Pak, saya tanya manajer dulu entah bisa ditukar atau tidak.',
        points: 12,
        feedback: 'Kurang sigap dan tidak menunjukkan empati terlebih dahulu.',
      },
    ],
  },
  {
    character: 'Kak Nadia (Pemburu Promo)',
    mood: 'Membandingkan harga',
    stage: 'Teknik Menawarkan Produk (FAB)',
    customerLine: 'Kok harga botol minum tumbler ini lebih mahal Rp15.000 dibanding merek sebelah?',
    choices: [
      {
        text: 'Betul Kak, keunggulannya bahan stainless food-grade ini tahan dingin hingga 12 jam sehingga Kakak tidak perlu beli air minum lagi di luar.',
        points: 25,
        feedback: 'Unggul! Menjelaskan Feature -> Advantage -> Benefit yang menghemat biaya pelanggan.',
      },
      {
        text: 'Kalau merasa mahal ambil yang murah saja Kak, kualitas ya ada harga.',
        points: 8,
        feedback: 'Nada terdengar meremehkan dan gagal mengedukasi nilai produk.',
      },
      {
        text: 'Kurang tahu Kak, dari pusat harganya memang segitu.',
        points: 10,
        feedback: 'Kurang menguasai pengetahuan produk (product knowledge).',
      },
    ],
  },
  {
    character: 'Mas Dimas (Pembeli Terburu-buru)',
    mood: 'Ingin checkout cepat',
    stage: 'Pelayanan Prima & Cross-Selling',
    customerLine: 'Mas cepat ya, saya buru-buru mau rapat. Ini baterainya dua bungkus bayar pakai QRIS.',
    choices: [
      {
        text: 'Baik Mas, total Rp24.000 silakan pindai QRIS di sebelah kanan. Sekalian butuh tisu saku atau permen untuk di jalan? Ini struknya, terima kasih!',
        points: 25,
        feedback: 'Cekatan! Pembayaran nontunai cepat disertai cross-selling singkat tanpa menghambat waktu.',
      },
      {
        text: 'Sebentar Mas lagi ngitung uang kas dulu, antre ya.',
        points: 6,
        feedback: 'Tidak memprioritaskan kecepatan layanan bagi pelanggan yang terburu-buru.',
      },
      {
        text: 'Oke sudah lunas, ambil sendiri kantongnya.',
        points: 12,
        feedback: 'Transaksi selesai tetapi kurang sentuhan pelayanan prima.',
      },
    ],
  },
];

export const CustomerServiceHeroGame: React.FC<CustomerServiceHeroProps> = ({
  onFinish,
  onCancel,
}) => {
  const [step, setStep] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [startTime] = useState(() => Date.now());

  const done = step >= SCENARIOS.length;
  const current = SCENARIOS[step];

  const pickChoice = (points: number, feedback: string) => {
    if (lastFeedback) return;
    setTotalPoints((p) => p + points);
    setLastFeedback(feedback);
    setTimeout(() => {
      setLastFeedback(null);
      setStep((s) => s + 1);
    }, 1200);
  };

  if (done) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <MessageSquareHeart className="w-6 h-6 text-blue-600" />
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Sesi Customer Service Hero Selesai!
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Skor Komunikasi &amp; Empati Pelayanan Anda:{' '}
          <strong className="font-mono text-blue-600 dark:text-blue-400">{totalPoints}/100</strong>
        </p>
        <button
          type="button"
          onClick={() =>
            onFinish({
              score: totalPoints,
              accuracy: totalPoints,
              durationSeconds: Math.max(15, Math.round((Date.now() - startTime) / 1000)),
              metrics: { pelangganTerlayani: SCENARIOS.length, empati: `${totalPoints}%` },
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Simpan Skor &amp; Klaim XP</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Customer Service Hero — Pelanggan {step + 1}/{SCENARIOS.length}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{current.stage}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
        >
          Kembali
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0B193D] dark:text-amber-400">{current.character}</span>
            <span className="text-slate-500 dark:text-slate-400">{current.mood}</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
            &ldquo;{current.customerLine}&rdquo;
          </p>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Pilih respons terbaik Anda:
          </p>
          {current.choices.map((c) => (
            <button
              key={c.text}
              type="button"
              onClick={() => pickChoice(c.points, c.feedback)}
              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 text-sm text-slate-800 dark:text-slate-100 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
            >
              {c.text}
            </button>
          ))}
        </div>

        {lastFeedback && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs font-semibold text-blue-900 dark:text-blue-200">
            {lastFeedback}
          </div>
        )}
      </div>
    </div>
  );
};
