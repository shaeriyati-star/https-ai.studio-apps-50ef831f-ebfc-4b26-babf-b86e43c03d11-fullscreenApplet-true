import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>{compact ? 'Instal' : 'Instal Aplikasi'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>{compact ? 'Aplikasi' : isIOS ? 'Pasang di iOS' : 'Pasang ke Layar'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tambahkan MARKETVERSE X ke Layar Utama
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Akses cepat seperti aplikasi di Android, iPhone, iPad, atau Google Chrome.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {isIOS ? (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-4 space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-white">Safari iPhone / iPad:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-xs leading-relaxed">
                    <li>Ketuk ikon <strong>Bagikan (Share)</strong> pada bilah Safari.</li>
                    <li>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                    <li>Ketuk <strong>Tambah</strong> untuk membuka aplikasi layar penuh.</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-4 space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-white">Google Chrome Android / Desktop:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-xs leading-relaxed">
                    <li>Buka menu titik tiga di pojok kanan atas Chrome.</li>
                    <li>Pilih <strong>Instal Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</li>
                    <li>Aplikasi tetap dapat dibuka langsung dari browser tanpa instalasi wajib.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-4 h-4" />
      <span>Mode Offline — Menampilkan data tersimpan lokal</span>
    </div>
  );
};
