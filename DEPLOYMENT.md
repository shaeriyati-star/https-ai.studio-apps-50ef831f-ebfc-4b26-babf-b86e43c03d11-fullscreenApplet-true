# Dokumentasi Konfigurasi & Deployment MARKETVERSE X

Dokumen ini menjelaskan arsitektur autentikasi terintegrasi, skema database, keamanan, dan langkah deployment aplikasi **MARKETVERSE X – Digital Marketing Learning & Game Academy**.

## 1. Arsitektur Aplikasi
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + PWA (`vite-plugin-pwa`).
- **Backend**: Express (`server.ts`) yang melayani API REST terproteksi RBAC (`/api/*`) dan aset frontend.
- **Database Persisten**: Penyimpanan permanen JSON terstruktur di `data/marketverse-db.json` beserta berkas unggahan di `data/uploads/`.

## 2. Tabel Database Autentikasi & Akademik
Database mencakup seluruh tabel inti yang diminta:
- `users`: Akun pengguna (`id`, `username`, `name`, `email`, `passwordHash` bcrypt, `role`, `isActive`, `lastLoginAt`, `lastLoginDevice`, `avatarUrl`, data akademik & gamifikasi).
- `roles`: Definisi tingkat peran (`super_admin`, `admin`, `guru`, `siswa`, `orang_tua`) dan daftar hak akses (`permissions`).
- `user_profiles`: Profil terperinci pengguna (`fullName`, `phone`, `address`, `gender`, `bio`, `avatarUrl`, `department`).
- `user_sessions`: Sesi autentikasi persisten berbasis hash SHA-256 token dengan `ipAddress`, `userAgent`, `deviceLabel`, `browser`, `os`, `rememberMe`, `expiresAt`, `isRevoked`.
- `login_attempts`: Catatan seluruh percobaan login berhasil dan gagal untuk *rate limiting*, *account lockout*, deteksi perangkat baru, serta riwayat login pengguna.
- `password_resets`: Token kode verifikasi 6 digit (di-hash SHA-256) dengan masa berlaku 15 menit dan batas percobaan verifikasi.
- `audit_logs`: Jejak audit seluruh aktivitas login, logout, perubahan profil, reset sandi, impor massal, dan perubahan pengaturan sistem.
- Tabel LMS lainnya: `classes`, `subjects`, `websiteConfig`, `academicSettings`, `gradeWeights`, `chapters`, `customMaterials`, `assessments`, `assessmentAttempts`, `assignments`, `submissions`, `gameRecords`, `progress`, `attendance`, `teacherNotes`, `notifications`.

## 3. Keamanan Autentikasi
- **Hashing Kata Sandi**: Menggunakan `bcrypt` (`bcryptjs`, cost 10). Kata sandi tidak pernah disimpan dalam teks biasa.
- **Cookie & Sesi**: Cookie `mvx_token` disetel dengan `HttpOnly`, `SameSite=Lax`, dan otomatis `Secure` saat berjalan di HTTPS (`trust proxy` aktif).
- **Rate Limiting & Lockout**: Maksimum 5 percobaan gagal berturut-turut (dapat dikonfigurasi Super Admin), penundaan progresif setelah 3 kegagalan, dan penguncian sementara 5 menit disertai notifikasi login mencurigakan.
- **Proteksi XSS, CSRF, dan Input**: Header keamanan (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`), sanitasi input di server, dan verifikasi `Origin`/`Host` + header `X-Requested-With` untuk request mutasi.

## 4. Variabel Lingkungan (`.env`)
- `PORT`: Port server HTTP (default `3000`).
- `NODE_ENV`: Setel `production` saat deployment online.
- `SKIP_SEED_SUPERADMIN`: Setel `true` pada server produksi bersih apabila ingin membuat akun Super Admin pertama secara manual lewat UI/endpoint `/api/auth/setup-superadmin`.
- `SUPERADMIN_SETUP_KEY`: (Opsional) Kunci pengaman tambahan untuk bootstrap Super Admin pertama.

## 5. Perintah Build & Menjalankan di Produksi
1. Pasang dependensi: `npm install`
2. Bangun aplikasi frontend: `npm run build`
3. Jalankan server produksi: `NODE_ENV=production npm start` (`node server.ts`)
4. Pastikan reverse proxy (Nginx / Cloudflare / Cloud Run) meneruskan header `X-Forwarded-Proto: https` dan `X-Forwarded-For` agar cookie `Secure` dan deteksi IP perangkat berjalan akurat.
