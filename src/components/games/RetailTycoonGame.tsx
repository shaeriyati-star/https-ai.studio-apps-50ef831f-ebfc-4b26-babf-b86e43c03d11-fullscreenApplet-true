import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, ShoppingBag, TrendingUp } from 'lucide-react';

interface RetailTycoonProps {
  onFinish: (result: {
    score: number;
    accuracy: number;
    durationSeconds: number;
    metrics: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
}

interface ProductLine {
  id: string;
  name: string;
  cost: number;
  baseDemand: number;
  recommendedPrice: number;
  stock: number;
  price: number;
  shelf: 'eye-level' | 'top' | 'bottom' | 'kasir';
}

const INITIAL_PRODUCTS: ProductLine[] = [
  { id: 'p1', name: 'Air Mineral & Isotonik 600ml', cost: 2800, baseDemand: 38, recommendedPrice: 4500, stock: 40, price: 4500, shelf: 'eye-level' },
  { id: 'p2', name: 'Roti Cokelat Sarapan', cost: 4200, baseDemand: 28, recommendedPrice: 6500, stock: 25, price: 6500, shelf: 'kasir' },
  { id: 'p3', name: 'Buku Tulis & Pulpen Paket', cost: 9000, baseDemand: 20, recommendedPrice: 13500, stock: 20, price: 13500, shelf: 'eye-level' },
  { id: 'p4', name: 'Minyak Goreng Pouch 1L', cost: 14500, baseDemand: 18, recommendedPrice: 17500, stock: 15, price: 17500, shelf: 'bottom' },
];

export const RetailTycoonGame: React.FC<RetailTycoonProps> = ({ onFinish, onCancel }) => {
  const [day, setDay] = useState(1);
  const [cash, setCash] = useState(1500000);
  const [satisfaction, setSatisfaction] = useState(82);
  const [totalProfit, setTotalProfit] = useState(0);
  const [products, setProducts] = useState<ProductLine[]>(INITIAL_PRODUCTS);
  const [promoMode, setPromoMode] = useState<'none' | 'bundling' | 'cashless'>('cashless');
  const [dayLog, setDayLog] = useState<string[]>([
    'Hari 1 siap dimulai. Periksa stok, tata letak rak (planogram), dan harga jual sebelum membuka toko.',
  ]);
  const [startTime] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const restockProduct = (id: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const costTotal = p.cost * qty;
        if (cash < costTotal) return p;
        setCash((c) => c - costTotal);
        return { ...p, stock: p.stock + qty };
      })
    );
  };

  const updateProduct = (id: string, patch: Partial<ProductLine>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const simulateDay = () => {
    let revenue = 0;
    let cogs = 0;
    let soldCount = 0;
    let stockouts = 0;
    let placementBonus = 0;
    let pricingPenalty = 0;

    const updated = products.map((p) => {
      const shelfMultiplier =
        p.id === 'p4'
          ? p.shelf === 'bottom'
            ? 1.15
            : 0.85
          : p.shelf === 'eye-level' || p.shelf === 'kasir'
            ? 1.2
            : 0.9;

      if (p.id === 'p4' && p.shelf === 'bottom') placementBonus += 5;
      if ((p.id === 'p1' || p.id === 'p3') && p.shelf === 'eye-level') placementBonus += 5;
      if (p.id === 'p2' && p.shelf === 'kasir') placementBonus += 5;

      const priceRatio = p.price / p.recommendedPrice;
      const demandFactor = priceRatio <= 1.05 ? 1.1 : priceRatio <= 1.2 ? 0.85 : 0.55;
      if (priceRatio > 1.22) pricingPenalty += 6;

      const promoFactor = promoMode === 'bundling' ? 1.15 : promoMode === 'cashless' ? 1.1 : 1;
      const expectedDemand = Math.round(p.baseDemand * shelfMultiplier * demandFactor * promoFactor);
      const actualSold = Math.min(p.stock, expectedDemand);
      if (p.stock < expectedDemand) stockouts++;

      revenue += actualSold * p.price;
      cogs += actualSold * p.cost;
      soldCount += actualSold;

      return { ...p, stock: p.stock - actualSold };
    });

    const dailyOpEx = 120000;
    const netDailyProfit = revenue - cogs - dailyOpEx;
    const nextSat = Math.max(
      40,
      Math.min(100, satisfaction + Math.round(placementBonus / 3) - stockouts * 5 - pricingPenalty + (promoMode === 'cashless' ? 3 : 1))
    );

    setProducts(updated);
    setCash((c) => c + revenue);
    setTotalProfit((tp) => tp + netDailyProfit);
    setSatisfaction(nextSat);
    setDayLog((logs) => [
      `Hari ${day}: Terjual ${soldCount} unit · Omzet Rp ${revenue.toLocaleString('id-ID')} · Laba Bersih Rp ${netDailyProfit.toLocaleString('id-ID')} · Stockout: ${stockouts}`,
      ...logs,
    ]);

    if (day >= 3) {
      setFinished(true);
    } else {
      setDay((d) => d + 1);
    }
  };

  const computeScore = () => {
    const profitScore = Math.min(40, Math.max(10, Math.round((totalProfit / 900000) * 40)));
    const satScore = Math.round((satisfaction / 100) * 40);
    const planogramScore =
      (products[0].shelf === 'eye-level' ? 5 : 2) +
      (products[1].shelf === 'kasir' ? 5 : 2) +
      (products[2].shelf === 'eye-level' ? 5 : 2) +
      (products[3].shelf === 'bottom' ? 5 : 1);
    return Math.min(100, Math.max(45, profitScore + satScore + planogramScore));
  };

  const handleComplete = () => {
    const score = computeScore();
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    onFinish({
      score,
      accuracy: satisfaction,
      durationSeconds,
      metrics: {
        laba: `Rp ${totalProfit.toLocaleString('id-ID')}`,
        kepuasan: `${satisfaction}%`,
        kasAkhir: `Rp ${cash.toLocaleString('id-ID')}`,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Retail Tycoon Simulator — Hari {day} dari 3
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atur stok, posisi rak (barang berat di bawah, produk impulsif di kasir/eye-level), dan harga kompetitif.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          Kembali ke Arena
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kas Toko</p>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            Rp {cash.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Akumulasi Laba</p>
          <p className={`font-mono text-lg font-bold mt-1 tabular-nums ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
            Rp {totalProfit.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kepuasan Pelanggan</p>
          <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {satisfaction}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Strategi Promosi</p>
          <select
            value={promoMode}
            onChange={(e) => setPromoMode(e.target.value as 'none' | 'bundling' | 'cashless')}
            disabled={finished}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
          >
            <option value="cashless">Promo Cashback QRIS (+Kepuasan)</option>
            <option value="bundling">Paket Bundling Hemat (+Permintaan)</option>
            <option value="none">Tanpa Promo Tambahan</option>
          </select>
        </div>
      </div>

      {/* Product Inventory & Display Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="py-3 px-4 font-semibold">Produk Dagangan</th>
              <th className="py-3 px-4 font-semibold">HPP</th>
              <th className="py-3 px-4 font-semibold">Stok Saat Ini</th>
              <th className="py-3 px-4 font-semibold">Harga Jual (Rp)</th>
              <th className="py-3 px-4 font-semibold">Posisi Rak (Planogram)</th>
              <th className="py-3 px-4 font-semibold text-right">Isi Ulang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  {p.name}
                  <div className="text-[11px] font-normal text-slate-500">
                    Saran harga: Rp {p.recommendedPrice.toLocaleString('id-ID')}
                  </div>
                </td>
                <td className="py-3 px-4 font-mono tabular-nums">Rp {p.cost.toLocaleString('id-ID')}</td>
                <td className="py-3 px-4 font-mono font-bold tabular-nums">
                  <span className={p.stock < 15 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}>
                    {p.stock} unit
                  </span>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    step={500}
                    min={p.cost}
                    value={p.price}
                    disabled={finished}
                    onChange={(e) => updateProduct(p.id, { price: Number(e.target.value) })}
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs tabular-nums"
                  />
                </td>
                <td className="py-3 px-4">
                  <select
                    value={p.shelf}
                    disabled={finished}
                    onChange={(e) =>
                      updateProduct(p.id, {
                        shelf: e.target.value as ProductLine['shelf'],
                      })
                    }
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs"
                  >
                    <option value="eye-level">Eye-Level (Sejajar Mata)</option>
                    <option value="kasir">Area Kasir (Impulsif)</option>
                    <option value="bottom">Rak Bawah (Barang Berat)</option>
                    <option value="top">Rak Atas</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    disabled={finished || cash < p.cost * 15}
                    onClick={() => restockProduct(p.id, 15)}
                    className="rounded-md bg-slate-900 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-600 disabled:opacity-40 cursor-pointer"
                  >
                    +15 Unit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action / Result Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4">
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {dayLog.slice(0, 2).map((l, idx) => (
            <p key={idx} className={idx === 0 ? 'font-semibold text-slate-900 dark:text-white' : ''}>
              {l}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!finished ? (
            <button
              type="button"
              onClick={simulateDay}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buka Toko Hari {day}</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDay(1);
                  setCash(1500000);
                  setSatisfaction(82);
                  setTotalProfit(0);
                  setProducts(INITIAL_PRODUCTS);
                  setFinished(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi</span>
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Skor ({computeScore()}/100)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {finished && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center gap-3 text-sm text-emerald-900 dark:text-emerald-200">
          <TrendingUp className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>
            Simulasi 3 hari selesai! Skor kompetensi Anda dihitung dari ketepatan planogram, kepuasan pelanggan ({satisfaction}%), dan profitabilitas toko.
          </span>
        </div>
      )}
    </div>
  );
};
