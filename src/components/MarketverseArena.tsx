import React, { useState } from 'react';
import { Award, Briefcase, CheckCircle2, Gamepad2, Megaphone, MessageSquareHeart, ShieldAlert, ShoppingBag, Swords, Trophy } from 'lucide-react';
import type { BootstrapPayload } from '../utils/api.ts';
import { apiRequest } from '../utils/api.ts';
import type { GameId } from '../types/index.ts';
import { RetailTycoonGame } from './games/RetailTycoonGame.tsx';
import { MarketingBattleGame } from './games/MarketingBattleGame.tsx';
import { CustomerServiceHeroGame } from './games/CustomerServiceHeroGame.tsx';
import { DigitalMarketingMasterGame } from './games/DigitalMarketingMasterGame.tsx';
import { K3ChallengeGame } from './games/K3ChallengeGame.tsx';
import { CareerQuestGame } from './games/CareerQuestGame.tsx';

interface MarketverseArenaProps {
  data: BootstrapPayload;
  onRefresh: () => Promise<void>;
}

const GAME_CARDS: {
  id: GameId;
  name: string;
  chapterRef: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'retail_tycoon',
    name: 'Retail Tycoon Simulator',
    chapterRef: 'Bab 1 · Manajemen Toko Ritel',
    desc: 'Kelola kas, stok produk, planogram rak, penetapan harga, dan kepuasan pelanggan multi-hari.',
    icon: ShoppingBag,
  },
  {
    id: 'marketing_battle',
    name: 'Marketing Battle',
    chapterRef: 'Bab 1–5 · Kuis Kompetitif',
    desc: 'Pertandingan soal acak berwaktu dalam mode individu atau tim kelas dengan skor otomatis.',
    icon: Swords,
  },
  {
    id: 'cs_hero',
    name: 'Customer Service Hero',
    chapterRef: 'Bab 5 · Komunikasi Pelanggan',
    desc: 'Hadapi pelanggan bingung, pemburu promo, hingga komplain dengan metode LAST & teknik FAB.',
    icon: MessageSquareHeart,
  },
  {
    id: 'digital_marketing',
    name: 'Digital Marketing Master',
    chapterRef: 'Bab 2 · Strategi Digital',
    desc: 'Rancang kampanye omnichannel, pilih audiens & kanal, atur anggaran iklan, dan optimalkan ROAS.',
    icon: Megaphone,
  },
  {
    id: 'k3_challenge',
    name: 'K3 Retail Challenge',
    chapterRef: 'Bab 4 · Keselamatan Kerja',
    desc: 'Audit denah toko ritel untuk menemukan 5 titik bahaya serta menentukan tindakan koreksi SOP.',
    icon: ShieldAlert,
  },
  {
    id: 'career_quest',
    name: 'Career Quest',
    chapterRef: 'Bab 3 · Profesi & Wirausaha',
    desc: 'Jalani 6 misi profesi dari Kasir, Merchandiser, Supervisor, hingga Pengusaha Ritel.',
    icon: Briefcase,
  },
];

const TIERS = [
  { name: 'Marketing Beginner', minXp: 0 },
  { name: 'Junior Marketer', minXp: 250 },
  { name: 'Retail Explorer', minXp: 600 },
  { name: 'Marketing Specialist', minXp: 1000 },
  { name: 'Retail Professional', minXp: 1500 },
  { name: 'Marketing Master', minXp: 2000 },
];

export const MarketverseArena: React.FC<MarketverseArenaProps> = ({ data, onRefresh }) => {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [tab, setTab] = useState<'games' | 'missions' | 'leaderboard' | 'certificate'>('games');
  const [savingBanner, setSavingBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>('all');

  const isStudent = data.user.role === 'siswa';
  const prog = data.progress[0];

  const handleGameFinish = async (
    gameId: GameId,
    gameName: string,
    result: { score: number; accuracy: number; durationSeconds: number; metrics: Record<string, string | number> }
  ) => {
    setErrorMsg(null);
    if (!isStudent) {
      setSavingBanner(`Mode Pratinjau (${data.user.role}): Skor ${result.score}/100 terhitung.`);
      setActiveGame(null);
      return;
    }
    try {
      const res = await apiRequest<{ xpEarned: number; newlyUnlocked: string[] }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          gameName,
          ...result,
        }),
      });
      await onRefresh();
      setSavingBanner(
        `Hasil ${gameName} tersimpan! Skor ${result.score}/100 · +${res.xpEarned} XP${
          res.newlyUnlocked.length > 0 ? ` · ${res.newlyUnlocked.length} Badge baru terbuka!` : ''
        }`
      );
      setActiveGame(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan skor game.');
      setActiveGame(null);
    }
  };

  if (activeGame) {
    const card = GAME_CARDS.find((g) => g.id === activeGame)!;
    const commonProps = {
      onCancel: () => setActiveGame(null),
      onFinish: (res: { score: number; accuracy: number; durationSeconds: number; metrics: Record<string, string | number> }) =>
        handleGameFinish(card.id, card.name, res),
    };
    return (
      <div className="space-y-4">
        {activeGame === 'retail_tycoon' && <RetailTycoonGame {...commonProps} />}
        {activeGame === 'marketing_battle' && <MarketingBattleGame {...commonProps} />}
        {activeGame === 'cs_hero' && <CustomerServiceHeroGame {...commonProps} />}
        {activeGame === 'digital_marketing' && <DigitalMarketingMasterGame {...commonProps} />}
        {activeGame === 'k3_challenge' && <K3ChallengeGame {...commonProps} />}
        {activeGame === 'career_quest' && <CareerQuestGame {...commonProps} />}
      </div>
    );
  }

  const filteredLeaderboard = data.leaderboard.filter(
    (item) => classFilter === 'all' || item.classId === classFilter
  );

  const subCount = prog?.completedSubchapters.length ?? 0;
  const actCount = prog?.completedActivities.length ?? 0;
  const gameCount = data.gameRecords.length;
  const quizCount = data.assessmentAttempts.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Marketverse Arena
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            6 simulasi bisnis &amp; game kompetensi pemasaran ritel dengan perolehan XP, badge, dan sertifikat pencapaian.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
          {[
            { id: 'games', label: '6 Game Edukasi' },
            { id: 'missions', label: 'Misi & Badge' },
            { id: 'leaderboard', label: 'Leaderboard' },
            { id: 'certificate', label: 'Sertifikat' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {savingBanner && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-4">
          <span>{savingBanner}</span>
          <button type="button" onClick={() => setSavingBanner(null)} className="text-xs underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Career Tier Progress Strip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Jenjang Karier Profesional
            </p>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Level {data.user.level} · {data.user.tier}
            </h3>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold text-amber-500 tabular-nums">
              {data.user.xp.toLocaleString('id-ID')} XP
            </p>
            <p className="text-xs text-slate-500">
              {data.user.badges.length} Badge · {data.user.completedMissions.length} Misi Tuntas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {TIERS.map((tier, i) => {
            const reached = data.user.xp >= tier.minXp;
            return (
              <div
                key={tier.name}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  reached
                    ? 'border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/20 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-mono text-[11px] font-bold">
                  {i + 1}. {tier.minXp} XP
                </div>
                <div className="font-semibold truncate mt-0.5">{tier.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {tab === 'games' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {GAME_CARDS.map((card) => {
            const Icon = card.icon;
            const plays = data.gameRecords.filter((g) => g.gameId === card.id);
            const best = plays.length > 0 ? Math.max(...plays.map((p) => p.score)) : null;
            return (
              <div
                key={card.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#0B193D] dark:bg-blue-600/20 text-amber-400 dark:text-blue-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {best !== null ? `Terbaik: ${best}/100` : 'Belum Dimainkan'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{card.chapterRef}</p>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {card.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{card.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveGame(card.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Mainkan Sekarang</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'missions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Misi Harian &amp; Tantangan Mingguan
            </h3>
            <div className="space-y-3">
              {data.missions.map((m) => {
                const cur =
                  m.metricKey === 'subchapters'
                    ? subCount
                    : m.metricKey === 'games'
                      ? gameCount
                      : m.metricKey === 'quizzes'
                        ? quizCount
                        : actCount;
                const done = data.user.completedMissions.includes(m.id) || cur >= m.targetCount;
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {m.kind === 'daily' ? 'Misi Harian' : 'Tantangan Mingguan'} · +{m.xpReward} XP
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold tabular-nums">
                        {Math.min(cur, m.targetCount)}/{m.targetCount}
                      </span>
                      <div className="mt-1">
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Berjalan</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Koleksi Badge Prestasi Kompetensi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.badges.map((b) => {
                const unlocked = data.user.badges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3.5 space-y-1.5 ${
                      unlocked
                        ? 'border-amber-400/70 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Award className={`w-5 h-5 ${unlocked ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className="text-[11px] font-mono font-semibold">
                        {unlocked ? 'Terbuka' : 'Terkunci'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{b.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Papan Peringkat Individu &amp; Kelas</span>
            </h3>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold"
            >
              <option value="all">Semua Kelas</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Peringkat</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Tingkat Karier</th>
                  <th className="py-2.5 px-3 text-right">Badge</th>
                  <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLeaderboard.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={
                      row.id === data.user.id
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-3 px-3 font-mono font-bold">#{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white">{row.name}</td>
                    <td className="py-3 px-3 text-slate-500">{row.className}</td>
                    <td className="py-3 px-3">
                      Level {row.level} · {row.tier}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{row.badgesCount}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{row.finalScore}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {row.xp.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'certificate' && (
        <div className="rounded-xl border-2 border-amber-400/70 bg-white dark:bg-slate-900 p-8 text-center space-y-5 max-w-3xl mx-auto">
          <img
            src="/src/assets/images/school_emblem_badge_1794705063931.jpg"
            alt="Emblem Akademik MARKETVERSE X"
            referrerPolicy="no-referrer"
            className="w-16 h-16 mx-auto rounded-lg object-cover"
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400">
              SERTIFIKAT PENCAPAIAN KOMPETENSI
            </p>
            <h3 className="font-display text-2xl font-extrabold text-[#0B193D] dark:text-white">
              MARKETVERSE X ACADEMY
            </h3>
            <p className="text-xs text-slate-500">{data.academic.schoolName}</p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">Diberikan kepada:</p>
          <p className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.user.name}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Atas pencapaian kompetensi pada mata pelajaran <strong>{data.academic.subjectName}</strong> dengan tingkatan <strong>Level {data.user.level} ({data.user.tier})</strong>, perolehan <strong>{data.user.xp.toLocaleString('id-ID')} XP</strong>, dan <strong>{data.user.badges.length} Badge Prestasi</strong>.
          </p>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-around gap-6 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <p>Guru Mata Pelajaran</p>
              <p className="font-bold text-slate-900 dark:text-white mt-6">{data.academic.subjectTeacherName}</p>
            </div>
            <div>
              <p>Kepala Sekolah</p>
              <p className="font-bold text-slate-900 dark:text-white mt-6">{data.academic.principalName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 rounded-lg bg-[#0B193D] dark:bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Cetak Sertifikat via Chrome
          </button>
        </div>
      )}
    </div>
  );
};
