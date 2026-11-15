import React, { useState } from 'react';
import { BarChart3, CheckCircle2, Megaphone } from 'lucide-react';

interface DigitalMarketingMasterProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

export const DigitalMarketingMasterGame: React.FC<DigitalMarketingMasterProps> = ({
  onFinish,
  onCancel,
}) => {
  const [productName, setProductName] = useState<'snack' | 'tumbler' | 'batik'>('snack');
  const [audience, setAudience] = useState<'pelajar' | 'pekerja' | 'keluarga'>('pelajar');
  const [channel, setChannel] = useState<'tiktok' | 'instagram' | 'marketplace' | 'whatsapp'>('tiktok');
  const [contentType, setContentType] = useState<'video_demo' | 'edukasi' | 'flash_sale'>('video_demo');
  const [budgetSocial, setBudgetSocial] = useState(60);
  const [ethicsOptIn, setEthicsOptIn] = useState(true);
  const [result, setResult] = useState<{
    roas: number;
    ctr: number;
    conv: number;
    score: number;
    insight: string;
  } | null>(null);
  const [startTime] = useState(() => Date.now());

  const runCampaign = () => {
    // Competency scoring based on audience-channel-content-ethics fit
    let fitScore = 50;
    if (productName === 'snack' && audience === 'pelajar' && (channel === 'tiktok' || channel === 'instagram')) {
      fitScore += 22;
    } else if (productName === 'tumbler' && audience === 'pekerja' && (channel === 'instagram' || channel === 'marketplace')) {
      fitScore += 22;
    } else if (productName === 'batik' && audience === 'keluarga' && (channel === 'marketplace' || channel === 'whatsapp')) {
      fitScore += 22;
    } else {
      fitScore += 10;
    }

    if (contentType === 'video_demo' || contentType === 'edukasi') fitScore += 12;
    else fitScore += 8;

    if (budgetSocial >= 40 && budgetSocial <= 75) fitScore += 8;
    if (ethicsOptIn) fitScore += 8;
    else fitScore -= 12;

    const finalScore = Math.max(40, Math.min(100, fitScore));
    const roas = Number((1.8 + (finalScore / 100) * 2.9).toFixed(1));
    const ctr = Number((1.4 + (finalScore / 100) * 4.2).toFixed(1));
    const conv = Number((2.1 + (finalScore / 100) * 5.0).toFixed(1));

    const insight = ethicsOptIn
      ? 'Kampanye patuh perlindungan data (opt-in) dan memiliki kesesuaian kanal-audiens yang solid.'
      : 'Peringatan Etika: Mengirim pesan tanpa izin opt-in menurunkan kepercayaan konsumen dan skor kampanye.';

    setResult({ roas, ctr, conv, score: finalScore, insight });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Digital Marketing Master — Simulator Kampanye Omnichannel
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih produk, target konsumen, media promosi, alokasi anggaran Rp 1.000.000, dan kepatuhan etika data.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              1. Produk Kampanye
            </label>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value as typeof productName)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="snack">Paket Camilan Sehat Pelajar (Rp 12.000)</option>
              <option value="tumbler">Tumbler Stainless Kantor &amp; Kampus (Rp 75.000)</option>
              <option value="batik">Kemeja Batik UMKM Modern (Rp 165.000)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              2. Target Konsumen Utama
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="pelajar">Pelajar &amp; Gen-Z Aktif Media Sosial</option>
              <option value="pekerja">Pekerja Muda &amp; Profesional</option>
              <option value="keluarga">Keluarga &amp; Pembeli Rumah Tangga</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              3. Kanal Media Promosi Utama
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="tiktok">Social Commerce &amp; Video Pendek</option>
              <option value="instagram">Instagram Visual &amp; Reels</option>
              <option value="marketplace">Iklan Pencarian Marketplace</option>
              <option value="whatsapp">CRM WhatsApp Broadcast</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              4. Format Strategi Konten
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as typeof contentType)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="video_demo">Video Demo Manfaat &amp; Testimoni Nyata</option>
              <option value="edukasi">Konten Edukasi &amp; Tips Penggunaan</option>
              <option value="flash_sale">Poster Diskon Terbatas</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Alokasi Anggaran Iklan Berbayar vs Produksi Konten</span>
              <span className="font-mono text-blue-600">{budgetSocial}% Iklan / {100 - budgetSocial}% Konten</span>
            </div>
            <input
              type="range"
              min={20}
              max={90}
              step={5}
              value={budgetSocial}
              onChange={(e) => setBudgetSocial(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={ethicsOptIn}
              onChange={(e) => setEthicsOptIn(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              Terapkan persetujuan data konsumen (opt-in) &amp; klaim harga transparan tanpa biaya tersembunyi.
            </span>
          </label>

          <button
            type="button"
            onClick={runCampaign}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Jalankan Simulasi Kampanye 7 Hari</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-5">
          {!result ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-2 text-slate-500">
              <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Analitik Kampanye Belum Dijalankan
              </p>
              <p className="text-xs max-w-xs">
                Atur strategi di panel kiri lalu tekan tombol Jalankan Simulasi untuk melihat proyeksi CTR, Konversi, dan ROAS.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Laporan Kinerja Kampanye Digital
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-500">ROAS</p>
                    <p className="font-mono text-xl font-bold text-emerald-600 tabular-nums">{result.roas}x</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-500">CTR</p>
                    <p className="font-mono text-xl font-bold text-blue-600 tabular-nums">{result.ctr}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[11px] text-slate-500">Konversi</p>
                    <p className="font-mono text-xl font-bold text-violet-600 tabular-nums">{result.conv}%</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {result.insight}
                </div>
                <div className="text-sm font-semibold">
                  Skor Kompetensi Digital Marketer:{' '}
                  <span className="font-mono text-blue-600 dark:text-blue-400">{result.score}/100</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onFinish({
                    score: result.score,
                    accuracy: result.score,
                    durationSeconds: Math.max(20, Math.round((Date.now() - startTime) / 1000)),
                    metrics: { roas: `${result.roas}x`, konversi: `${result.conv}%`, ctr: `${result.ctr}%` },
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Hasil Kampanye</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
