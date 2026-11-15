import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import {
  appendAudit,
  BADGES_SEED,
  calculateStudentSummary,
  computeLevelAndTier,
  evaluateGamificationUnlocks,
  getDb,
  hashToken,
  MISSIONS_SEED,
  sanitizeUser,
  saveDb,
} from './server/database.ts';
import type { GameId, PublicUser, UserRole } from './src/types/index.ts';

interface AuthedRequest extends Request {
  currentUser?: PublicUser;
  currentSessionId?: string;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim();
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return req.secure || proto.includes('https');
}

function parseDeviceInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceLabel: string;
} {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipAddress = forwarded || req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ua = String(req.headers['user-agent'] || 'Unknown');

  let browser = 'Browser Lain';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/curl|node/i.test(ua)) browser = 'API Client';

  let os = 'Sistem Lain';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    ipAddress,
    userAgent: ua.slice(0, 220),
    browser,
    os,
    deviceLabel: `${browser} di ${os}`,
  };
}

function createPersistentSession(userId: string, req: Request, rememberMe: boolean): { token: string; sessionId: string; maxAgeMs: number } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const dev = parseDeviceInfo(req);
  const timeoutMins = Math.max(30, db.websiteConfig?.sessionTimeoutMinutes || 1440);
  const maxAgeMs = rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * timeoutMins;
  const now = new Date().toISOString();
  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  db.user_sessions.unshift({
    id: sessionId,
    userId,
    tokenHash,
    ipAddress: dev.ipAddress,
    userAgent: dev.userAgent,
    deviceLabel: dev.deviceLabel,
    browser: dev.browser,
    os: dev.os,
    rememberMe,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: Date.now() + maxAgeMs,
    isRevoked: false,
  });

  // Keep latest 120 sessions to avoid unbounded growth
  const nowMs = Date.now();
  db.user_sessions = db.user_sessions
    .filter((s) => !s.isRevoked && s.expiresAt > nowMs)
    .slice(0, 120);

  return { token, sessionId, maxAgeMs };
}

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookieToken = req.cookies?.mvx_token;
  return typeof cookieToken === 'string' && cookieToken.length > 0 ? cookieToken : null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = getTokenFromReq(req);
  if (!token) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk kembali.' });
    return;
  }
  const db = getDb();
  const tokenHash = hashToken(token);
  const session = db.user_sessions.find((s) => s.tokenHash === tokenHash && !s.isRevoked);
  if (!session || session.expiresAt < Date.now()) {
    if (session && !session.isRevoked) {
      session.isRevoked = true;
      saveDb();
    }
    res.status(401).json({ error: 'Sesi telah kedaluwarsa. Silakan login kembali.' });
    return;
  }
  const user = db.users.find((u) => u.id === session.userId && u.isActive);
  if (!user) {
    res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan.' });
    return;
  }
  session.lastActiveAt = new Date().toISOString();
  req.currentUser = sanitizeUser(user);
  req.currentSessionId = session.id;
  next();
}

function requireRoles(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin akses untuk fitur ini.' });
      return;
    }
    next();
  };
}

function canAccessStudent(actor: PublicUser, studentId: string): boolean {
  if (actor.role === 'super_admin' || actor.role === 'admin' || actor.role === 'guru') return true;
  if (actor.role === 'siswa') return actor.id === studentId;
  if (actor.role === 'orang_tua') return actor.linkedStudentId === studentId;
  return false;
}

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));
  app.use(cookieParser());

  // Security headers (XSS, Clickjacking, MIME-sniffing protection)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // CSRF defense-in-depth on mutating API calls
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
          res.status(403).json({ error: 'Permintaan lintas-situs ditolak (CSRF protection).' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'Origin permintaan tidak valid.' });
        return;
      }
    }
    next();
  });

  app.use('/uploads', express.static(UPLOAD_DIR));

  // Ensure DB initialized & migrated
  getDb();

  // Sample downloadable material endpoints
  app.get('/api/materials/sample/:slug', (_req, res) => {
    const slug = _req.params.slug;
    const text =
      slug === 'planogram'
        ? 'MODUL PLANOGRAM & DISPLAY RITEL MODERN\n\n1. Penempatan Eye-Level untuk produk margin tinggi.\n2. Penerapan FEFO untuk makanan dan minuman.\n3. Label harga harus menghadap depan dan sesuai sistem POS.'
        : 'CHECKLIST ETIKA & PERLINDUNGAN DATA KONSUMEN\n\n1. Dapatkan persetujuan opt-in sebelum mengirim pesan promosi.\n2. Amankan data nomor telepon & alamat pembeli.\n3. Transparansi harga tanpa biaya tersembunyi.';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${slug}.txt"`);
    res.send(text);
  });

  // Setup status & secure initial Super Admin bootstrap
  app.get('/api/auth/setup-status', (_req, res) => {
    const db = getDb();
    const hasSuperAdmin = db.users.some((u) => u.role === 'super_admin' && u.isActive);
    res.json({
      hasSuperAdmin,
      websiteConfig: db.websiteConfig,
    });
  });

  app.post('/api/auth/setup-superadmin', (req, res) => {
    const { name, username, email, password, setupKey } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      setupKey?: string;
    };
    const db = getDb();
    const existingSuper = db.users.some((u) => u.role === 'super_admin' && u.isActive);
    const configuredKey = process.env.SUPERADMIN_SETUP_KEY;
    if (existingSuper && (!configuredKey || setupKey !== configuredKey)) {
      res.status(403).json({ error: 'Akun Super Admin sudah tersedia di sistem.' });
      return;
    }
    if (!name || !email || !password || password.length < 8) {
      res.status(400).json({ error: 'Nama, email, dan kata sandi (min. 8 karakter) wajib diisi.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanUser = sanitizeText(username || cleanEmail.split('@')[0]).toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUser)) {
      res.status(400).json({ error: 'Username atau email sudah terdaftar.' });
      return;
    }
    const newSuper = {
      id: `superadmin-${Date.now()}`,
      username: cleanUser,
      name: sanitizeText(name),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'super_admin' as const,
      nip: '-',
      avatarColor: '#4F46E5',
      isActive: true,
      xp: 0,
      level: 1,
      tier: 'Marketing Master' as const,
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(newSuper);
    db.user_profiles.push({
      id: `prof-${newSuper.id}`,
      userId: newSuper.id,
      fullName: newSuper.name,
      phone: '-',
      address: '-',
      gender: '-',
      bio: 'Super Administrator utama sistem MARKETVERSE X.',
      department: 'Administrator Sistem',
      updatedAt: new Date().toISOString(),
    });
    const safeUser = sanitizeUser(newSuper);
    const { token, maxAgeMs } = createPersistentSession(safeUser.id, req, false);
    const dev = parseDeviceInfo(req);
    appendAudit(safeUser, 'SETUP_SUPERADMIN', `Inisialisasi akun Super Admin pertama: ${safeUser.email}`, {
      ipAddress: dev.ipAddress,
      deviceLabel: dev.deviceLabel,
    });
    res.cookie('mvx_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      maxAge: maxAgeMs,
    });
    res.json({ token, user: safeUser });
  });

  // Auth routes (supports username OR email, rememberMe, rate limit + lockout, audit, notifications)
  app.post('/api/auth/login', async (req, res) => {
    const { identifier, email, password, rememberMe, expectedRole } = req.body as {
      identifier?: string;
      email?: string;
      password?: string;
      rememberMe?: boolean;
      expectedRole?: UserRole;
    };
    const rawId = (identifier || email || '').trim().toLowerCase();
    if (!rawId || !password) {
      res.status(400).json({ error: 'Username/email dan kata sandi wajib diisi.' });
      return;
    }

    const db = getDb();
    const dev = parseDeviceInfo(req);
    const maxAttempts = db.websiteConfig?.maxLoginAttempts || 5;
    const lockoutMs = (db.websiteConfig?.lockoutMinutes || 5) * 60 * 1000;
    const cutoff = Date.now() - lockoutMs;

    // Count recent consecutive failed attempts for this identifier or IP
    const recentForId = db.login_attempts
      .filter((a) => new Date(a.attemptedAt).getTime() >= cutoff && (a.identifier === rawId || a.ipAddress === dev.ipAddress))
      .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

    let consecutiveFails = 0;
    for (const att of recentForId) {
      if (att.success) break;
      consecutiveFails++;
    }

    if (consecutiveFails >= maxAttempts) {
      const oldestRecent = recentForId[consecutiveFails - 1];
      const elapsed = Date.now() - new Date(oldestRecent.attemptedAt).getTime();
      const remainingSec = Math.max(5, Math.ceil((lockoutMs - elapsed) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      res.status(429).json({
        error: `Akun/IP dikunci sementara akibat ${consecutiveFails} percobaan gagal berulang. Coba lagi dalam ${mins} menit ${secs} detik.`,
        lockedUntilSeconds: remainingSec,
      });
      return;
    }

    // Progressive delay after 3 failed attempts
    if (consecutiveFails >= 3) {
      await new Promise((resolve) => setTimeout(resolve, 650));
    }

    const user = db.users.find(
      (u) => u.email.toLowerCase() === rawId || (u.username && u.username.toLowerCase() === rawId),
    );

    const recordAttempt = (success: boolean, reason: string, userId?: string) => {
      db.login_attempts.unshift({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        identifier: rawId,
        userId,
        ipAddress: dev.ipAddress,
        userAgent: dev.userAgent,
        deviceLabel: dev.deviceLabel,
        success,
        reason,
        attemptedAt: new Date().toISOString(),
      });
      if (db.login_attempts.length > 400) {
        db.login_attempts = db.login_attempts.slice(0, 400);
      }
    };

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      recordAttempt(false, 'Username/email atau kata sandi salah', user?.id);
      const newFailCount = consecutiveFails + 1;
      if (user && newFailCount >= 3) {
        db.notifications.unshift({
          id: `notif-sec-${Date.now()}`,
          targetRole: user.role,
          targetUserId: user.id,
          category: 'keamanan',
          title: 'Peringatan Login Mencurigakan',
          message: `Terdeteksi ${newFailCount}x percobaan kata sandi salah ke akun Anda dari ${dev.deviceLabel} (${dev.ipAddress}).`,
          isReadBy: [],
          createdAt: new Date().toISOString(),
        });
      }
      saveDb();
      const remaining = Math.max(0, maxAttempts - newFailCount);
      res.status(401).json({
        error:
          remaining > 0
            ? `Username/email atau kata sandi salah. Sisa percobaan: ${remaining} kali.`
            : 'Username/email atau kata sandi salah. Batas percobaan tercapai; akun dikunci sementara.',
      });
      return;
    }

    if (!user.isActive) {
      recordAttempt(false, 'Akun dinonaktifkan', user.id);
      saveDb();
      res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      const roleLabelMap: Record<UserRole, string> = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        guru: 'Guru',
        siswa: 'Siswa',
        orang_tua: 'Orang Tua',
      };
      recordAttempt(false, `Role tidak sesuai (${expectedRole})`, user.id);
      saveDb();
      res.status(403).json({
        error: `Akun ini terdaftar sebagai ${roleLabelMap[user.role]}. Silakan masuk melalui Menu Login ${roleLabelMap[user.role]}.`,
      });
      return;
    }

    // Successful login
    const prevSuccessLogins = db.login_attempts.filter((a) => a.userId === user.id && a.success);
    const isNewDevice =
      prevSuccessLogins.length > 0 && !prevSuccessLogins.some((a) => a.deviceLabel === dev.deviceLabel);

    recordAttempt(true, 'Login berhasil', user.id);
    const nowIso = new Date().toISOString();
    user.lastLoginAt = nowIso;
    user.lastLoginDevice = dev.deviceLabel;

    const safeUser = sanitizeUser(user);
    const { token, maxAgeMs } = createPersistentSession(safeUser.id, req, Boolean(rememberMe));

    db.notifications.unshift({
      id: `notif-login-${Date.now()}`,
      targetRole: safeUser.role,
      targetUserId: safeUser.id,
      category: 'keamanan',
      title: isNewDevice ? 'Login Berhasil dari Perangkat Baru' : 'Login Berhasil',
      message: `Masuk ke MARKETVERSE X pada ${new Date().toLocaleString('id-ID')} menggunakan ${dev.deviceLabel} (IP: ${dev.ipAddress}).`,
      isReadBy: [],
      createdAt: nowIso,
    });

    if (consecutiveFails >= 2 || isNewDevice) {
      db.notifications.unshift({
        id: `notif-sus-${Date.now() + 1}`,
        targetRole: 'super_admin',
        category: 'keamanan',
        title: 'Aktivitas Login Perlu Perhatian',
        message: `${safeUser.name} (${safeUser.username}) login dari ${dev.deviceLabel} setelah ${consecutiveFails} kegagalan / perangkat baru.`,
        isReadBy: [],
        createdAt: nowIso,
      });
    }

    appendAudit(safeUser, 'LOGIN', `Login berhasil (${safeUser.role}) via ${dev.deviceLabel}`, {
      ipAddress: dev.ipAddress,
      deviceLabel: dev.deviceLabel,
    });

    res.cookie('mvx_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttpsRequest(req),
      maxAge: maxAgeMs,
    });
    res.json({ token, user: safeUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = getTokenFromReq(req);
    if (token) {
      const db = getDb();
      const tHash = hashToken(token);
      const sess = db.user_sessions.find((s) => s.tokenHash === tHash);
      if (sess) {
        sess.isRevoked = true;
        const usr = db.users.find((u) => u.id === sess.userId);
        if (usr) {
          appendAudit(sanitizeUser(usr), 'LOGOUT', `Logout dari ${sess.deviceLabel}`, {
            ipAddress: sess.ipAddress,
            deviceLabel: sess.deviceLabel,
          });
        } else {
          saveDb();
        }
      }
    }
    res.clearCookie('mvx_token');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.currentUser });
  });

  // Forgot password & reset password via verification code
  app.post('/api/auth/forgot-password', (req, res) => {
    const { identifier } = req.body as { identifier?: string };
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId) {
      res.status(400).json({ error: 'Masukkan username atau email akun Anda.' });
      return;
    }
    const db = getDb();
    if (db.websiteConfig && !db.websiteConfig.allowForgotPassword) {
      res.status(403).json({ error: 'Fitur reset sandi mandiri dinonaktifkan oleh Super Admin. Hubungi Admin sekolah.' });
      return;
    }
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanId || (u.username && u.username.toLowerCase() === cleanId),
    );
    if (!user) {
      res.status(404).json({ error: 'Akun dengan username atau email tersebut tidak ditemukan.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Akun nonaktif. Hubungi Administrator.' });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const hasSmtp = Boolean(process.env.SMTP_HOST);

    db.password_resets.unshift({
      id: `rst-${Date.now()}`,
      userId: user.id,
      identifier: user.email,
      codeHash: hashToken(code),
      devCodePreview: hasSmtp ? undefined : code,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
    if (db.password_resets.length > 50) {
      db.password_resets = db.password_resets.slice(0, 50);
    }

    db.notifications.unshift({
      id: `notif-rst-${Date.now()}`,
      targetRole: 'super_admin',
      category: 'keamanan',
      title: 'Permintaan Reset Kata Sandi',
      message: `Akun ${user.name} (${user.email}) meminta verifikasi reset kata sandi.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    appendAudit(sanitizeUser(user), 'FORGOT_PASSWORD_REQUEST', `Permintaan kode verifikasi reset password untuk ${user.email}`);

    const [localPart, domainPart] = user.email.split('@');
    const maskedEmail = `${localPart.slice(0, 2)}***@${domainPart || 'marketverse.sch.id'}`;

    res.json({
      ok: true,
      maskedEmail,
      expiresInMinutes: 15,
      message: `Kode verifikasi 6 digit telah dibuat untuk ${maskedEmail}. Berlaku 15 menit.`,
      devCodePreview: hasSmtp ? undefined : code,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { identifier, code, newPassword } = req.body as {
      identifier?: string;
      code?: string;
      newPassword?: string;
    };
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    if (!cleanId || !cleanCode || !newPassword) {
      res.status(400).json({ error: 'Username/email, kode verifikasi, dan kata sandi baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanId || (u.username && u.username.toLowerCase() === cleanId),
    );
    if (!user) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    const resetRec = db.password_resets.find((r) => r.userId === user.id && !r.usedAt);
    if (!resetRec) {
      res.status(400).json({ error: 'Belum ada permintaan reset kata sandi aktif. Silakan minta kode baru.' });
      return;
    }
    if (new Date(resetRec.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ error: 'Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.' });
      return;
    }
    if (resetRec.attempts >= 5) {
      res.status(429).json({ error: 'Terlalu banyak percobaan kode verifikasi salah. Minta kode baru.' });
      return;
    }

    if (resetRec.codeHash !== hashToken(cleanCode)) {
      resetRec.attempts += 1;
      saveDb();
      res.status(400).json({ error: 'Kode verifikasi tidak valid.' });
      return;
    }

    resetRec.usedAt = new Date().toISOString();
    resetRec.devCodePreview = undefined;
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();

    // Revoke all active sessions on password reset
    for (const s of db.user_sessions) {
      if (s.userId === user.id) s.isRevoked = true;
    }

    db.notifications.unshift({
      id: `notif-pwd-${Date.now()}`,
      targetRole: user.role,
      targetUserId: user.id,
      category: 'keamanan',
      title: 'Kata Sandi Berhasil Direset',
      message: 'Kata sandi akun Anda baru saja diperbarui melalui verifikasi pemulihan.',
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });

    appendAudit(sanitizeUser(user), 'RESET_PASSWORD', `Reset password berhasil untuk ${user.email}`);
    res.json({ ok: true, message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.' });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Kata sandi lama dan baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai.' });
      return;
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    appendAudit(req.currentUser!, 'CHANGE_PASSWORD', `Pengguna mengganti kata sandi sendiri`);
    res.json({ ok: true, message: 'Kata sandi berhasil diperbarui.' });
  });

  // Profile & Active Sessions management (all authenticated roles)
  app.put('/api/profile', requireAuth, (req: AuthedRequest, res) => {
    const { name, username, phone, address, gender, bio, avatarUrl } = req.body as {
      name?: string;
      username?: string;
      phone?: string;
      address?: string;
      gender?: 'L' | 'P' | '-';
      bio?: string;
      avatarUrl?: string;
    };
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }
    if (username) {
      const cleanU = sanitizeText(username).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (cleanU.length < 3) {
        res.status(400).json({ error: 'Username minimal 3 karakter.' });
        return;
      }
      if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === cleanU)) {
        res.status(400).json({ error: 'Username sudah digunakan pengguna lain.' });
        return;
      }
      user.username = cleanU;
    }
    if (name) user.name = sanitizeText(name);
    if (phone !== undefined) user.phone = sanitizeText(phone);
    if (bio !== undefined) user.bio = sanitizeText(bio);
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    user.updatedAt = new Date().toISOString();

    let prof = db.user_profiles.find((p) => p.userId === user.id);
    if (!prof) {
      prof = {
        id: `prof-${user.id}`,
        userId: user.id,
        fullName: user.name,
        phone: user.phone || '-',
        address: '-',
        gender: '-',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl,
        department: 'MARKETVERSE X',
        updatedAt: new Date().toISOString(),
      };
      db.user_profiles.push(prof);
    }
    prof.fullName = user.name;
    if (phone !== undefined) prof.phone = sanitizeText(phone);
    if (address !== undefined) prof.address = sanitizeText(address);
    if (gender !== undefined) prof.gender = gender;
    if (bio !== undefined) prof.bio = sanitizeText(bio);
    if (avatarUrl !== undefined) prof.avatarUrl = avatarUrl;
    prof.updatedAt = new Date().toISOString();

    appendAudit(sanitizeUser(user), 'UPDATE_PROFILE', 'Memperbarui profil & foto pengguna');
    res.json({ user: sanitizeUser(user), profile: prof });
  });

  app.delete('/api/profile/sessions/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const sess = db.user_sessions.find((s) => s.id === req.params.id && s.userId === req.currentUser!.id);
    if (!sess) {
      res.status(404).json({ error: 'Sesi tidak ditemukan.' });
      return;
    }
    sess.isRevoked = true;
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/profile/sessions/revoke-others', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    for (const s of db.user_sessions) {
      if (s.userId === req.currentUser!.id && s.id !== req.currentSessionId) {
        s.isRevoked = true;
      }
    }
    appendAudit(req.currentUser!, 'REVOKE_OTHER_SESSIONS', 'Mengeluarkan semua sesi perangkat lain');
    res.json({ ok: true });
  });

  // Bootstrap endpoint scoped strictly to role permissions
  app.get('/api/bootstrap', requireAuth, (req: AuthedRequest, res) => {
    const actor = req.currentUser!;
    const db = getDb();
    const activeAcademic = db.academicSettings.find((a) => a.isActive) || db.academicSettings[0];

    const notifications = db.notifications.filter((n) => {
      if (n.targetUserId) return n.targetUserId === actor.id;
      return n.targetRole === 'all' || n.targetRole === actor.role;
    });

    const myProfile = db.user_profiles.find((p) => p.userId === actor.id) || null;
    const mySessions = db.user_sessions
      .filter((s) => s.userId === actor.id && !s.isRevoked && s.expiresAt > Date.now())
      .map(({ tokenHash: _th, ...rest }) => ({ ...rest, isCurrent: rest.id === req.currentSessionId }));
    const myLoginHistory = db.login_attempts
      .filter((a) => a.userId === actor.id || a.identifier === actor.email || a.identifier === actor.username)
      .slice(0, 20);

    // Public leaderboard (only student display metrics, no PII email/password)
    const leaderboard = db.users
      .filter((u) => u.role === 'siswa' && u.isActive)
      .map((s) => {
        const cls = db.classes.find((c) => c.id === s.classId);
        const sum = calculateStudentSummary(s.id);
        return {
          id: s.id,
          name: s.name,
          classId: s.classId || '',
          className: cls?.name || '-',
          xp: s.xp,
          level: s.level,
          tier: s.tier,
          badgesCount: s.badges.length,
          finalScore: sum?.finalScore ?? 0,
          avatarColor: s.avatarColor,
        };
      })
      .sort((a, b) => b.xp - a.xp);

    if (actor.role === 'super_admin' || actor.role === 'admin') {
      const studentSummaries = db.users
        .filter((u) => u.role === 'siswa')
        .map((s) => calculateStudentSummary(s.id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const visibleUsers =
        actor.role === 'super_admin'
          ? db.users.map(sanitizeUser)
          : db.users.filter((u) => u.role !== 'super_admin').map(sanitizeUser);

      res.json({
        user: actor,
        myProfile,
        mySessions,
        myLoginHistory,
        academic: activeAcademic,
        academicSettings: db.academicSettings,
        classes: db.classes,
        subjects: db.subjects,
        websiteConfig: db.websiteConfig,
        roles: db.roles,
        userProfiles: db.user_profiles,
        activeSessions:
          actor.role === 'super_admin'
            ? db.user_sessions
                .filter((s) => !s.isRevoked && s.expiresAt > Date.now())
                .map(({ tokenHash: _th, ...rest }) => ({ ...rest, isCurrent: rest.id === req.currentSessionId }))
            : mySessions,
        loginAttempts: db.login_attempts.slice(0, 80),
        passwordResets: db.password_resets.slice(0, 30).map(({ codeHash: _ch, ...rest }) => rest),
        gradeWeights: db.gradeWeights,
        chapters: db.chapters,
        customMaterials: db.customMaterials,
        assessments: db.assessments,
        assessmentAttempts: db.assessmentAttempts,
        assignments: db.assignments,
        submissions: db.submissions,
        gameRecords: db.gameRecords,
        progress: db.progress,
        attendance: db.attendance,
        teacherNotes: db.teacherNotes,
        users: visibleUsers,
        studentSummaries,
        leaderboard,
        missions: MISSIONS_SEED,
        badges: BADGES_SEED,
        notifications,
        auditLogs: db.auditLogs.slice(0, 100),
      });
      return;
    }

    if (actor.role === 'guru') {
      const students = db.users.filter((u) => u.role === 'siswa').map(sanitizeUser);
      const studentSummaries = students
        .map((s) => calculateStudentSummary(s.id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      res.json({
        user: actor,
        myProfile,
        mySessions,
        myLoginHistory,
        academic: activeAcademic,
        academicSettings: db.academicSettings,
        classes: db.classes,
        subjects: db.subjects,
        websiteConfig: db.websiteConfig,
        gradeWeights: db.gradeWeights,
        chapters: db.chapters,
        customMaterials: db.customMaterials,
        assessments: db.assessments,
        assessmentAttempts: db.assessmentAttempts,
        assignments: db.assignments,
        submissions: db.submissions,
        gameRecords: db.gameRecords,
        progress: db.progress,
        attendance: db.attendance,
        teacherNotes: db.teacherNotes,
        users: students,
        studentSummaries,
        leaderboard,
        missions: MISSIONS_SEED,
        badges: BADGES_SEED,
        notifications,
        auditLogs: [],
      });
      return;
    }

    if (actor.role === 'siswa') {
      const summary = calculateStudentSummary(actor.id);
      const myProgress = db.progress.find((p) => p.studentId === actor.id) || {
        studentId: actor.id,
        completedSubchapters: [],
        completedActivities: [],
        completedVideos: [],
        reflections: {},
        updatedAt: new Date().toISOString(),
      };
      res.json({
        user: actor,
        myProfile,
        mySessions,
        myLoginHistory,
        academic: activeAcademic,
        academicSettings: [activeAcademic],
        classes: db.classes,
        subjects: db.subjects,
        websiteConfig: db.websiteConfig,
        gradeWeights: db.gradeWeights,
        chapters: db.chapters,
        customMaterials: db.customMaterials,
        assessments: db.assessments,
        assessmentAttempts: db.assessmentAttempts.filter((a) => a.studentId === actor.id),
        assignments: db.assignments,
        submissions: db.submissions.filter((s) => s.studentId === actor.id),
        gameRecords: db.gameRecords.filter((g) => g.studentId === actor.id),
        progress: [myProgress],
        attendance: db.attendance.filter((a) => a.studentId === actor.id),
        teacherNotes: db.teacherNotes.filter((n) => n.studentId === actor.id),
        users: [actor],
        studentSummaries: summary ? [summary] : [],
        leaderboard,
        missions: MISSIONS_SEED,
        badges: BADGES_SEED,
        notifications,
        auditLogs: [],
      });
      return;
    }

    // Role: orang_tua — STRICTLY scoped to linkedStudentId only
    const childId = actor.linkedStudentId || '';
    const childUser = db.users.find((u) => u.id === childId && u.role === 'siswa');
    const summary = childUser ? calculateStudentSummary(childUser.id) : null;

    res.json({
      user: actor,
      myProfile,
      mySessions,
      myLoginHistory,
      academic: activeAcademic,
      academicSettings: [activeAcademic],
      classes: db.classes,
      subjects: db.subjects,
      websiteConfig: db.websiteConfig,
      gradeWeights: db.gradeWeights,
      chapters: db.chapters,
      customMaterials: [],
      assessments: db.assessments.map((a) => ({ ...a, questions: [] })),
      assessmentAttempts: childUser ? db.assessmentAttempts.filter((a) => a.studentId === childUser.id) : [],
      assignments: db.assignments,
      submissions: childUser ? db.submissions.filter((s) => s.studentId === childUser.id) : [],
      gameRecords: childUser ? db.gameRecords.filter((g) => g.studentId === childUser.id) : [],
      progress: childUser ? db.progress.filter((p) => p.studentId === childUser.id) : [],
      attendance: childUser ? db.attendance.filter((a) => a.studentId === childUser.id) : [],
      teacherNotes: childUser ? db.teacherNotes.filter((n) => n.studentId === childUser.id) : [],
      users: childUser ? [actor, sanitizeUser(childUser)] : [actor],
      studentSummaries: summary ? [summary] : [],
      leaderboard: [],
      missions: MISSIONS_SEED,
      badges: BADGES_SEED,
      notifications,
      auditLogs: [],
    });
  });

  // File Upload (PDF, PPT, Video, Gambar) -> saved locally under data/uploads
  app.post('/api/upload', requireAuth, (req: AuthedRequest, res) => {
    const { fileName, base64Data } = req.body as { fileName?: string; base64Data?: string };
    if (!fileName || !base64Data) {
      res.status(400).json({ error: 'Nama file dan konten wajib disertakan.' });
      return;
    }
    const cleanBase = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedName = `${Date.now()}-${cleanBase}`;
    const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(raw, 'base64');
    if (buffer.length > 12 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran berkas maksimal 12 MB.' });
      return;
    }
    fs.writeFileSync(path.join(UPLOAD_DIR, savedName), buffer);
    res.json({ fileName: cleanBase, fileUrl: `/uploads/${savedName}` });
  });

  // Custom Material CRUD (Guru & Admin)
  app.post('/api/materials', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { chapterId, title, description, fileType, fileName, fileUrl } = req.body as {
      chapterId?: string;
      title?: string;
      description?: string;
      fileType?: 'pdf' | 'ppt' | 'video' | 'gambar' | 'dokumen';
      fileName?: string;
      fileUrl?: string;
    };
    if (!chapterId || !title) {
      res.status(400).json({ error: 'Bab dan judul materi wajib diisi.' });
      return;
    }
    const db = getDb();
    const item = {
      id: `mat-${Date.now()}`,
      chapterId,
      title: title.trim(),
      description: (description || '').trim(),
      fileType: fileType || 'dokumen',
      fileName: fileName || 'Materi_Pembelajaran.pdf',
      fileUrl: fileUrl || '/api/materials/sample/planogram',
      uploadedBy: req.currentUser!.name,
      createdAt: new Date().toISOString(),
    };
    db.customMaterials.unshift(item);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'siswa',
      category: 'materi',
      title: `Materi Baru: ${item.title}`,
      message: `${req.currentUser!.name} mengunggah materi ${item.fileType.toUpperCase()} baru.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_MATERIAL', `Menambahkan materi ${item.title}`);
    res.json({ material: item });
  });

  app.delete('/api/materials/:id', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    db.customMaterials = db.customMaterials.filter((m) => m.id !== req.params.id);
    saveDb();
    res.json({ ok: true });
  });

  // Student Progress & Reflection
  app.post('/api/progress/subchapter', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const { subchapterId, chapterId, minutesSpent } = req.body as {
      subchapterId?: string;
      chapterId?: string;
      minutesSpent?: number;
    };
    if (!subchapterId) {
      res.status(400).json({ error: 'subchapterId diperlukan.' });
      return;
    }
    const db = getDb();
    const student = db.users.find((u) => u.id === req.currentUser!.id);
    if (!student) {
      res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      return;
    }
    let prog = db.progress.find((p) => p.studentId === student.id);
    if (!prog) {
      prog = {
        studentId: student.id,
        completedSubchapters: [],
        completedActivities: [],
        completedVideos: [],
        reflections: {},
        updatedAt: new Date().toISOString(),
      };
      db.progress.push(prog);
    }
    let xpAwarded = 0;
    if (!prog.completedSubchapters.includes(subchapterId)) {
      prog.completedSubchapters.push(subchapterId);
      xpAwarded = 25;
      student.xp += xpAwarded;
    }
    if (chapterId) prog.lastChapterId = chapterId;
    prog.updatedAt = new Date().toISOString();
    student.studyMinutes += Math.min(60, Math.max(1, Number(minutesSpent || 5)));
    evaluateGamificationUnlocks(student.id);
    saveDb();
    res.json({ progress: prog, xpAwarded, user: sanitizeUser(student) });
  });

  app.post('/api/progress/activity', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const { activityId, videoChapterId } = req.body as { activityId?: string; videoChapterId?: string };
    const db = getDb();
    const student = db.users.find((u) => u.id === req.currentUser!.id);
    if (!student) {
      res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      return;
    }
    let prog = db.progress.find((p) => p.studentId === student.id);
    if (!prog) {
      prog = {
        studentId: student.id,
        completedSubchapters: [],
        completedActivities: [],
        completedVideos: [],
        reflections: {},
        updatedAt: new Date().toISOString(),
      };
      db.progress.push(prog);
    }
    let xpAwarded = 0;
    if (activityId && !prog.completedActivities.includes(activityId)) {
      prog.completedActivities.push(activityId);
      xpAwarded += 60;
      student.xp += 60;
    }
    if (videoChapterId && !prog.completedVideos.includes(videoChapterId)) {
      prog.completedVideos.push(videoChapterId);
      xpAwarded += 30;
      student.xp += 30;
    }
    student.studyMinutes += 10;
    prog.updatedAt = new Date().toISOString();
    evaluateGamificationUnlocks(student.id);
    saveDb();
    res.json({ progress: prog, xpAwarded, user: sanitizeUser(student) });
  });

  app.post('/api/progress/reflection', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const { chapterId, answer1, answer2 } = req.body as { chapterId?: string; answer1?: string; answer2?: string };
    if (!chapterId || !answer1?.trim()) {
      res.status(400).json({ error: 'Isi refleksi pembelajaran terlebih dahulu.' });
      return;
    }
    const db = getDb();
    let prog = db.progress.find((p) => p.studentId === req.currentUser!.id);
    if (!prog) {
      prog = {
        studentId: req.currentUser!.id,
        completedSubchapters: [],
        completedActivities: [],
        completedVideos: [],
        reflections: {},
        updatedAt: new Date().toISOString(),
      };
      db.progress.push(prog);
    }
    prog.reflections[chapterId] = {
      answer1: answer1.trim(),
      answer2: (answer2 || '').trim(),
      savedAt: new Date().toISOString(),
    };
    prog.updatedAt = new Date().toISOString();
    saveDb();
    res.json({ progress: prog });
  });

  // Assessments & Auto-Grading
  app.post('/api/assessments', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const payload = req.body as {
      title?: string;
      kind?: 'pre_test' | 'subbab_quiz' | 'ujian_bab' | 'post_test' | 'uas';
      chapterId?: string | null;
      durationMinutes?: number;
      maxAttempts?: number;
      passingScore?: number;
      scheduledDate?: string;
      questions?: Array<{
        prompt: string;
        type: 'multiple_choice' | 'true_false';
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
    };
    if (!payload.title || !payload.questions || payload.questions.length === 0) {
      res.status(400).json({ error: 'Judul evaluasi dan minimal 1 soal wajib diisi.' });
      return;
    }
    const db = getDb();
    const id = `assess-${Date.now()}`;
    const newAssess = {
      id,
      title: payload.title.trim(),
      kind: payload.kind || 'subbab_quiz',
      chapterId: payload.chapterId || null,
      durationMinutes: Number(payload.durationMinutes || 15),
      maxAttempts: Number(payload.maxAttempts || 2),
      passingScore: Number(payload.passingScore || 75),
      scheduledDate: payload.scheduledDate || new Date().toISOString().slice(0, 10),
      randomizeQuestions: true,
      createdBy: req.currentUser!.id,
      questions: payload.questions.map((q, idx) => ({
        id: `${id}-q${idx + 1}`,
        chapterId: payload.chapterId || 'bab-1',
        type: q.type || 'multiple_choice',
        prompt: q.prompt,
        options: q.options,
        correctIndex: Number(q.correctIndex),
        explanation: q.explanation || 'Sesuai konsep dasar pemasaran ritel.',
      })),
    };
    db.assessments.push(newAssess);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'siswa',
      category: 'ujian',
      title: `Evaluasi Baru: ${newAssess.title}`,
      message: `Jadwal pelaksanaan ${newAssess.scheduledDate} · Durasi ${newAssess.durationMinutes} menit.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_ASSESSMENT', `Membuat ${newAssess.title}`);
    res.json({ assessment: newAssess });
  });

  app.post('/api/assessments/:id/submit', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const db = getDb();
    const assessment = db.assessments.find((a) => a.id === req.params.id);
    if (!assessment) {
      res.status(404).json({ error: 'Evaluasi tidak ditemukan.' });
      return;
    }
    const student = db.users.find((u) => u.id === req.currentUser!.id);
    if (!student) {
      res.status(404).json({ error: 'Akun siswa tidak ditemukan.' });
      return;
    }
    const priorAttempts = db.assessmentAttempts.filter(
      (a) => a.assessmentId === assessment.id && a.studentId === student.id
    );
    if (priorAttempts.length >= assessment.maxAttempts) {
      res.status(400).json({
        error: `Batas maksimal percobaan (${assessment.maxAttempts}x) telah tercapai untuk evaluasi ini (Anti-Kecurangan).`,
      });
      return;
    }

    const { answers, durationSeconds } = req.body as {
      answers?: Record<string, number>;
      durationSeconds?: number;
    };
    const submittedAnswers = answers || {};
    let correctCount = 0;
    for (const q of assessment.questions) {
      if (submittedAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    }
    const totalQuestions = Math.max(1, assessment.questions.length);
    const score = Math.round((correctCount / totalQuestions) * 100);
    const attempt = {
      id: `att-${Date.now()}`,
      assessmentId: assessment.id,
      studentId: student.id,
      score,
      correctCount,
      totalQuestions,
      durationSeconds: Math.max(10, Number(durationSeconds || 60)),
      submittedAt: new Date().toISOString(),
      answers: submittedAnswers,
    };
    db.assessmentAttempts.push(attempt);

    const xpEarned = Math.round(35 + score * 0.65);
    student.xp += xpEarned;
    student.studyMinutes += Math.max(2, Math.round(attempt.durationSeconds / 60));
    evaluateGamificationUnlocks(student.id);

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'siswa',
      targetUserId: student.id,
      category: 'nilai',
      title: `Nilai Keluar: ${assessment.title}`,
      message: `Skor otomatis Anda ${score}/100 (${correctCount}/${totalQuestions} benar). +${xpEarned} XP.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();

    res.json({ attempt, xpEarned, user: sanitizeUser(student) });
  });

  // Assignments & Submissions
  app.post('/api/assignments', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { title, description, chapterId, kind, dueDate, maxScore } = req.body as {
      title?: string;
      description?: string;
      chapterId?: string;
      kind?: 'individu' | 'kelompok' | 'praktik' | 'proyek';
      dueDate?: string;
      maxScore?: number;
    };
    if (!title || !chapterId) {
      res.status(400).json({ error: 'Judul tugas dan bab wajib diisi.' });
      return;
    }
    const db = getDb();
    const item = {
      id: `asg-${Date.now()}`,
      title: title.trim(),
      description: (description || '').trim(),
      chapterId,
      kind: kind || 'individu',
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      maxScore: Number(maxScore || 100),
      createdBy: req.currentUser!.id,
    };
    db.assignments.unshift(item);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'siswa',
      category: 'tugas',
      title: `Tugas Baru: ${item.title}`,
      message: `Batas pengumpulan: ${item.dueDate}. Segera kerjakan di menu Tugas & Evaluasi.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_ASSIGNMENT', `Membuat tugas ${item.title}`);
    res.json({ assignment: item });
  });

  app.post('/api/assignments/:id/submit', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const db = getDb();
    const assignment = db.assignments.find((a) => a.id === req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Tugas tidak ditemukan.' });
      return;
    }
    const { content, attachmentUrl, attachmentName } = req.body as {
      content?: string;
      attachmentUrl?: string;
      attachmentName?: string;
    };
    if (!content?.trim()) {
      res.status(400).json({ error: 'Jawaban tugas tidak boleh kosong.' });
      return;
    }
    const existing = db.submissions.find(
      (s) => s.assignmentId === assignment.id && s.studentId === req.currentUser!.id
    );
    if (existing) {
      existing.content = content.trim();
      if (attachmentUrl) existing.attachmentUrl = attachmentUrl;
      if (attachmentName) existing.attachmentName = attachmentName;
      existing.submittedAt = new Date().toISOString();
    } else {
      db.submissions.push({
        id: `sub-${Date.now()}`,
        assignmentId: assignment.id,
        studentId: req.currentUser!.id,
        content: content.trim(),
        attachmentUrl,
        attachmentName,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      });
      const student = db.users.find((u) => u.id === req.currentUser!.id);
      if (student) {
        student.xp += 45;
        evaluateGamificationUnlocks(student.id);
      }
    }
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'guru',
      category: 'tugas',
      title: `Pengumpulan Tugas: ${assignment.title}`,
      message: `${req.currentUser!.name} mengumpulkan jawaban tugas.`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/submissions/:id/grade', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const sub = db.submissions.find((s) => s.id === req.params.id);
    if (!sub) {
      res.status(404).json({ error: 'Pengumpulan tugas tidak ditemukan.' });
      return;
    }
    const { score, feedback } = req.body as { score?: number; feedback?: string };
    const cleanScore = Math.min(100, Math.max(0, Number(score ?? 0)));
    sub.score = cleanScore;
    sub.feedback = (feedback || '').trim();
    sub.status = 'graded';
    sub.gradedAt = new Date().toISOString();

    const asg = db.assignments.find((a) => a.id === sub.assignmentId);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'siswa',
      targetUserId: sub.studentId,
      category: 'nilai',
      title: `Tugas Dinilai: ${asg?.title || 'Tugas'}`,
      message: `Nilai Anda: ${cleanScore}/100. Catatan guru: ${sub.feedback || 'Bagus, pertahankan.'}`,
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    appendAudit(req.currentUser!, 'GRADE_SUBMISSION', `Memberi nilai ${cleanScore} pada submission ${sub.id}`);
    res.json({ submission: sub });
  });

  // Marketverse Arena Game Result Persistence (with anti-cheat bounds & daily cap)
  app.post('/api/games/play', requireAuth, requireRoles('siswa'), (req: AuthedRequest, res) => {
    const { gameId, gameName, score, accuracy, durationSeconds, metrics } = req.body as {
      gameId?: GameId;
      gameName?: string;
      score?: number;
      accuracy?: number;
      durationSeconds?: number;
      metrics?: Record<string, string | number>;
    };
    if (!gameId || !gameName) {
      res.status(400).json({ error: 'Data permainan tidak lengkap.' });
      return;
    }
    const db = getDb();
    const student = db.users.find((u) => u.id === req.currentUser!.id);
    if (!student) {
      res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      return;
    }

    // Anti-cheat validation: realistic bounds & max 12 plays per game per day
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const playsToday = db.gameRecords.filter(
      (g) => g.studentId === student.id && g.gameId === gameId && g.playedAt.startsWith(todayPrefix)
    ).length;
    if (playsToday >= 12) {
      res.status(429).json({
        error: 'Batas bermain harian (12 sesi per game) tercapai untuk menjaga keseimbangan belajar.',
      });
      return;
    }

    const boundedScore = Math.min(100, Math.max(0, Math.round(Number(score ?? 0))));
    const boundedAcc = Math.min(100, Math.max(0, Math.round(Number(accuracy ?? boundedScore))));
    const boundedDur = Math.max(5, Math.round(Number(durationSeconds ?? 45)));

    // Competence-based XP (accuracy & score weighted, not speed alone)
    const xpEarned = Math.round(30 + boundedScore * 0.8 + boundedAcc * 0.5);

    const record = {
      id: `gm-${Date.now()}`,
      studentId: student.id,
      gameId,
      gameName,
      score: boundedScore,
      xpEarned,
      accuracy: boundedAcc,
      durationSeconds: boundedDur,
      metrics: metrics || {},
      playedAt: new Date().toISOString(),
    };

    db.gameRecords.unshift(record);
    student.xp += xpEarned;
    student.studyMinutes += Math.max(2, Math.round(boundedDur / 60));
    const prevBadges = [...student.badges];
    evaluateGamificationUnlocks(student.id);

    const newlyUnlocked = student.badges.filter((b) => !prevBadges.includes(b));
    if (newlyUnlocked.length > 0) {
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        targetRole: 'siswa',
        targetUserId: student.id,
        category: 'prestasi',
        title: 'Badge Prestasi Baru Terbuka!',
        message: `Selamat! Anda membuka ${newlyUnlocked.length} badge baru di Marketverse Arena.`,
        isReadBy: [],
        createdAt: new Date().toISOString(),
      });
    }

    saveDb();
    res.json({ record, xpEarned, newlyUnlocked, user: sanitizeUser(student) });
  });

  // Attendance & Teacher Notes
  app.post('/api/attendance', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { studentId, date, status, note } = req.body as {
      studentId?: string;
      date?: string;
      status?: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
      note?: string;
    };
    if (!studentId || !date || !status) {
      res.status(400).json({ error: 'Siswa, tanggal, dan status kehadiran wajib diisi.' });
      return;
    }
    const db = getDb();
    const existing = db.attendance.find((a) => a.studentId === studentId && a.date === date);
    if (existing) {
      existing.status = status;
      existing.note = note;
    } else {
      db.attendance.unshift({
        id: `abs-${Date.now()}`,
        studentId,
        date,
        status,
        note,
      });
    }
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/teacher-notes', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { studentId, strengths, improvements, recommendation, note } = req.body as {
      studentId?: string;
      strengths?: string;
      improvements?: string;
      recommendation?: string;
      note?: string;
    };
    if (!studentId) {
      res.status(400).json({ error: 'ID siswa wajib dipilih.' });
      return;
    }
    const db = getDb();
    const existing = db.teacherNotes.find((n) => n.studentId === studentId);
    if (existing) {
      existing.strengths = strengths ?? existing.strengths;
      existing.improvements = improvements ?? existing.improvements;
      existing.recommendation = recommendation ?? existing.recommendation;
      existing.note = note ?? existing.note;
      existing.teacherId = req.currentUser!.id;
      existing.teacherName = req.currentUser!.name;
      existing.updatedAt = new Date().toISOString();
    } else {
      db.teacherNotes.push({
        id: `note-${Date.now()}`,
        studentId,
        teacherId: req.currentUser!.id,
        teacherName: req.currentUser!.name,
        strengths: strengths || '',
        improvements: improvements || '',
        recommendation: recommendation || '',
        note: note || '',
        updatedAt: new Date().toISOString(),
      });
    }
    // Notify student and linked parent
    const linkedParent = db.users.find((u) => u.role === 'orang_tua' && u.linkedStudentId === studentId);
    if (linkedParent) {
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        targetRole: 'orang_tua',
        targetUserId: linkedParent.id,
        category: 'orang_tua',
        title: 'Catatan Baru dari Guru Mata Pelajaran',
        message: `${req.currentUser!.name} memperbarui catatan perkembangan kompetensi anak Anda.`,
        isReadBy: [],
        createdAt: new Date().toISOString(),
      });
    }
    saveDb();
    res.json({ ok: true });
  });

  // Notifications read & custom announcement
  app.post('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif && !notif.isReadBy.includes(req.currentUser!.id)) {
      notif.isReadBy.push(req.currentUser!.id);
      saveDb();
    }
    res.json({ ok: true });
  });

  app.post('/api/notifications/broadcast', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { targetRole, title, message, category } = req.body as {
      targetRole?: UserRole | 'all';
      title?: string;
      message?: string;
      category?: 'materi' | 'tugas' | 'deadline' | 'ujian' | 'nilai' | 'prestasi' | 'guru' | 'orang_tua';
    };
    if (!title || !message) {
      res.status(400).json({ error: 'Judul dan pesan notifikasi wajib diisi.' });
      return;
    }
    const db = getDb();
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: targetRole || 'all',
      category: category || 'guru',
      title: title.trim(),
      message: message.trim(),
      isReadBy: [],
      createdAt: new Date().toISOString(),
    });
    saveDb();
    res.json({ ok: true });
  });

  // Grade Weights (Guru & Admin)
  app.put('/api/settings/weights', requireAuth, requireRoles('guru', 'admin', 'super_admin'), (req: AuthedRequest, res) => {
    const { knowledge, skill, project, game } = req.body as {
      knowledge?: number;
      skill?: number;
      project?: number;
      game?: number;
    };
    const k = Number(knowledge ?? 35);
    const s = Number(skill ?? 25);
    const p = Number(project ?? 20);
    const g = Number(game ?? 20);
    if (k + s + p + g !== 100) {
      res.status(400).json({ error: 'Total bobot nilai harus berjumlah tepat 100%.' });
      return;
    }
    const db = getDb();
    db.gradeWeights = { knowledge: k, skill: s, project: p, game: g };
    saveDb();
    appendAudit(req.currentUser!, 'UPDATE_WEIGHTS', `Bobot baru: P=${k}%, K=${s}%, Pr=${p}%, G=${g}%`);
    res.json({ gradeWeights: db.gradeWeights });
  });

  // Admin & Super Admin Management Routes
  app.post('/api/admin/users', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { name, username, email, password, role, classId, nisNisn, nip, linkedStudentId } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      classId?: string;
      nisNisn?: string;
      nip?: string;
      linkedStudentId?: string;
    };
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Nama, email, kata sandi, dan peran wajib diisi.' });
      return;
    }
    if (req.currentUser!.role === 'admin' && (role === 'super_admin' || role === 'admin')) {
      res.status(403).json({ error: 'Hanya Super Admin yang berwenang membuat akun Admin atau Super Admin.' });
      return;
    }
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = sanitizeText(username || cleanEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername)) {
      res.status(400).json({ error: 'Email atau username sudah terdaftar di sistem.' });
      return;
    }
    const newId = `${role}-${Date.now()}`;
    const { level, tier } = computeLevelAndTier(0);
    const newUser = {
      id: newId,
      username: cleanUsername || newId,
      name: sanitizeText(name),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role,
      classId: role === 'siswa' ? classId || db.classes[0]?.id : undefined,
      nisNisn: role === 'siswa' ? sanitizeText(nisNisn || '261099') : undefined,
      nip: role === 'guru' || role === 'admin' || role === 'super_admin' ? sanitizeText(nip || '-') : undefined,
      linkedStudentId: role === 'orang_tua' ? linkedStudentId : undefined,
      avatarColor: role === 'super_admin' ? '#4F46E5' : role === 'guru' ? '#1D4ED8' : '#2563EB',
      isActive: true,
      xp: 0,
      level,
      tier,
      studyMinutes: 0,
      badges: [],
      completedMissions: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    db.user_profiles.push({
      id: `prof-${newId}`,
      userId: newId,
      fullName: newUser.name,
      phone: '-',
      address: '-',
      gender: '-',
      bio: `Akun ${role.replace('_', ' ')} terdaftar di MARKETVERSE X.`,
      department: role === 'siswa' ? 'Program Keahlian Pemasaran' : 'SMK Negeri 1 Nusantara Bisnis & Pemasaran',
      updatedAt: new Date().toISOString(),
    });
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_USER', `Membuat akun ${newUser.role}: ${newUser.username} (${newUser.email})`);
    res.json({ user: sanitizeUser(newUser) });
  });

  app.put('/api/admin/users/:id', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { name, username, email, role, classId, nisNisn, nip, linkedStudentId } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      role?: UserRole;
      classId?: string;
      nisNisn?: string;
      nip?: string;
      linkedStudentId?: string;
    };
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Akun pengguna tidak ditemukan.' });
      return;
    }
    if (req.currentUser!.role === 'admin' && (target.role === 'super_admin' || target.role === 'admin')) {
      res.status(403).json({ error: 'Admin tidak berwenang mengubah akun Admin/Super Admin.' });
      return;
    }
    if (role && role !== target.role && req.currentUser!.role !== 'super_admin') {
      if (role === 'super_admin' || role === 'admin') {
        res.status(403).json({ error: 'Hanya Super Admin yang berwenang menetapkan hak akses Admin/Super Admin.' });
        return;
      }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (db.users.some((u) => u.id !== target.id && u.email.toLowerCase() === cleanEmail)) {
        res.status(400).json({ error: 'Email sudah digunakan akun lain.' });
        return;
      }
      target.email = cleanEmail;
    }
    if (username) {
      const cleanUser = sanitizeText(username).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (db.users.some((u) => u.id !== target.id && u.username.toLowerCase() === cleanUser)) {
        res.status(400).json({ error: 'Username sudah digunakan akun lain.' });
        return;
      }
      target.username = cleanUser;
    }
    if (name) target.name = sanitizeText(name);
    if (role && req.currentUser!.role === 'super_admin' && target.id !== req.currentUser!.id) {
      target.role = role;
    } else if (role && role !== 'super_admin' && role !== 'admin' && target.id !== req.currentUser!.id) {
      target.role = role;
    }
    if (classId !== undefined) target.classId = classId;
    if (nisNisn !== undefined) target.nisNisn = sanitizeText(nisNisn);
    if (nip !== undefined) target.nip = sanitizeText(nip);
    if (linkedStudentId !== undefined) target.linkedStudentId = linkedStudentId;
    target.updatedAt = new Date().toISOString();

    const prof = db.user_profiles.find((p) => p.userId === target.id);
    if (prof && name) {
      prof.fullName = target.name;
      prof.updatedAt = new Date().toISOString();
    }
    saveDb();
    appendAudit(req.currentUser!, 'UPDATE_USER', `Memperbarui akun ${target.username} (${target.role})`);
    res.json({ user: sanitizeUser(target) });
  });

  app.delete('/api/admin/users/:id', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target || target.id === req.currentUser!.id) {
      res.status(400).json({ error: 'Akun tidak ditemukan atau tidak dapat menghapus akun sendiri.' });
      return;
    }
    if (req.currentUser!.role === 'admin' && (target.role === 'super_admin' || target.role === 'admin')) {
      res.status(403).json({ error: 'Hanya Super Admin yang berwenang menghapus akun Admin/Super Admin.' });
      return;
    }
    db.users = db.users.filter((u) => u.id !== target.id);
    db.user_profiles = db.user_profiles.filter((p) => p.userId !== target.id);
    db.user_sessions = db.user_sessions.filter((s) => s.userId !== target.id);
    saveDb();
    appendAudit(req.currentUser!, 'DELETE_USER', `Menghapus akun ${target.email} (${target.role})`);
    res.json({ ok: true });
  });

  app.post('/api/admin/users/:id/reset-password', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { newPassword } = req.body as { newPassword?: string };
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }
    if (req.currentUser!.role === 'admin' && (target.role === 'super_admin' || target.role === 'admin')) {
      res.status(403).json({ error: 'Admin tidak berwenang mereset kata sandi Admin/Super Admin.' });
      return;
    }
    const pwd = newPassword && newPassword.length >= 8 ? newPassword : `Mvx#${Math.floor(1000 + Math.random() * 9000)}!`;
    target.passwordHash = bcrypt.hashSync(pwd, 10);
    target.mustChangePassword = true;
    target.updatedAt = new Date().toISOString();
    for (const s of db.user_sessions) {
      if (s.userId === target.id) s.isRevoked = true;
    }
    saveDb();
    appendAudit(req.currentUser!, 'ADMIN_RESET_PASSWORD', `Mereset kata sandi akun ${target.email}`);
    res.json({ ok: true, temporaryPassword: pwd });
  });

  app.post('/api/admin/users/bulk', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { items } = req.body as {
      items?: {
        name: string;
        username?: string;
        email: string;
        password?: string;
        role: UserRole;
        classId?: string;
        nisNisn?: string;
        nip?: string;
      }[];
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Daftar akun untuk impor/pembuatan massal kosong.' });
      return;
    }
    const db = getDb();
    const created: PublicUser[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const row = items[idx];
      const cleanEmail = (row.email || '').trim().toLowerCase();
      const targetRole = row.role || 'siswa';
      if (!row.name || !cleanEmail) {
        skipped.push({ email: cleanEmail || `Baris ${idx + 1}`, reason: 'Nama atau email kosong' });
        continue;
      }
      if (req.currentUser!.role === 'admin' && (targetRole === 'super_admin' || targetRole === 'admin')) {
        skipped.push({ email: cleanEmail, reason: 'Admin tidak diizinkan membuat akun Admin/Super Admin' });
        continue;
      }
      const cleanUsername = sanitizeText(row.username || cleanEmail.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername)) {
        skipped.push({ email: cleanEmail, reason: 'Email atau username sudah ada' });
        continue;
      }
      const pwd = row.password && row.password.length >= 6 ? row.password : 'Marketverse123!';
      const newId = `${targetRole}-${Date.now()}-${idx}`;
      const { level, tier } = computeLevelAndTier(0);
      const newUser = {
        id: newId,
        username: cleanUsername || newId,
        name: sanitizeText(row.name),
        email: cleanEmail,
        passwordHash: bcrypt.hashSync(pwd, 10),
        role: targetRole,
        classId: targetRole === 'siswa' ? row.classId || db.classes[0]?.id : undefined,
        nisNisn: targetRole === 'siswa' ? sanitizeText(row.nisNisn || `2611${10 + idx}`) : undefined,
        nip: targetRole === 'guru' || targetRole === 'admin' || targetRole === 'super_admin' ? sanitizeText(row.nip || '-') : undefined,
        avatarColor: targetRole === 'guru' ? '#1D4ED8' : '#2563EB',
        isActive: true,
        xp: 0,
        level,
        tier,
        studyMinutes: 0,
        badges: [],
        completedMissions: [],
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      db.user_profiles.push({
        id: `prof-${newId}`,
        userId: newId,
        fullName: newUser.name,
        phone: '-',
        address: '-',
        gender: '-',
        bio: `Akun ${targetRole.replace('_', ' ')} dibuat melalui impor massal.`,
        department: targetRole === 'siswa' ? 'Program Keahlian Pemasaran' : 'SMK Negeri 1 Nusantara Bisnis & Pemasaran',
        updatedAt: new Date().toISOString(),
      });
      created.push(sanitizeUser(newUser));
    }

    saveDb();
    appendAudit(req.currentUser!, 'BULK_CREATE_USERS', `Membuat ${created.length} akun massal (dilewati: ${skipped.length})`);
    res.json({ createdCount: created.length, skipped, created });
  });

  app.patch('/api/admin/users/:id/toggle', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target || target.id === req.currentUser!.id) {
      res.status(400).json({ error: 'Akun tidak valid untuk diubah statusnya.' });
      return;
    }
    if (req.currentUser!.role === 'admin' && (target.role === 'super_admin' || target.role === 'admin')) {
      res.status(403).json({ error: 'Hanya Super Admin yang berwenang menonaktifkan akun Admin/Super Admin.' });
      return;
    }
    target.isActive = !target.isActive;
    if (!target.isActive) {
      for (const s of db.user_sessions) {
        if (s.userId === target.id) s.isRevoked = true;
      }
    }
    saveDb();
    appendAudit(req.currentUser!, 'TOGGLE_USER', `${target.email} -> ${target.isActive ? 'Aktif' : 'Nonaktif'}`);
    res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/classes', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { name, homeroomTeacher } = req.body as { name?: string; homeroomTeacher?: string };
    if (!name) {
      res.status(400).json({ error: 'Nama kelas wajib diisi.' });
      return;
    }
    const db = getDb();
    const activeAcad = db.academicSettings.find((a) => a.isActive) || db.academicSettings[0];
    const cls = {
      id: `cls-${Date.now()}`,
      name: sanitizeText(name),
      grade: 'Kelas X',
      major: 'Program Keahlian Pemasaran',
      homeroomTeacher: sanitizeText(homeroomTeacher || 'Ratna Sari, S.E., M.Pd.'),
      academicYearId: activeAcad.id,
    };
    db.classes.push(cls);
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_CLASS', `Menambahkan kelas ${cls.name}`);
    res.json({ classItem: cls });
  });

  app.post('/api/admin/subjects', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { code, name, grade, hoursPerWeek, teacherName } = req.body as {
      code?: string;
      name?: string;
      grade?: string;
      hoursPerWeek?: number;
      teacherName?: string;
    };
    if (!code || !name) {
      res.status(400).json({ error: 'Kode dan nama mata pelajaran wajib diisi.' });
      return;
    }
    const db = getDb();
    const subj = {
      id: `subj-${Date.now()}`,
      code: sanitizeText(code).toUpperCase(),
      name: sanitizeText(name),
      grade: sanitizeText(grade || 'Kelas X'),
      hoursPerWeek: Number(hoursPerWeek || 4),
      teacherName: sanitizeText(teacherName || 'Ratna Sari, S.E., M.Pd.'),
      isActive: true,
    };
    db.subjects.push(subj);
    saveDb();
    appendAudit(req.currentUser!, 'CREATE_SUBJECT', `Menambahkan mata pelajaran ${subj.code} - ${subj.name}`);
    res.json({ subject: subj });
  });

  app.delete('/api/admin/subjects/:id', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    db.subjects = db.subjects.filter((s) => s.id !== req.params.id);
    saveDb();
    appendAudit(req.currentUser!, 'DELETE_SUBJECT', `Menghapus mata pelajaran ${req.params.id}`);
    res.json({ ok: true });
  });

  app.post('/api/admin/academic/activate', requireAuth, requireRoles('super_admin', 'admin'), (req: AuthedRequest, res) => {
    const { academicId, schoolName, schoolAddress, principalName, subjectTeacherName } = req.body as {
      academicId?: string;
      schoolName?: string;
      schoolAddress?: string;
      principalName?: string;
      subjectTeacherName?: string;
    };
    const db = getDb();
    if (academicId) {
      for (const item of db.academicSettings) {
        item.isActive = item.id === academicId;
      }
    }
    const active = db.academicSettings.find((a) => a.isActive) || db.academicSettings[0];
    if (schoolName) active.schoolName = sanitizeText(schoolName);
    if (schoolAddress) active.schoolAddress = sanitizeText(schoolAddress);
    if (principalName) active.principalName = sanitizeText(principalName);
    if (subjectTeacherName) active.subjectTeacherName = sanitizeText(subjectTeacherName);
    saveDb();
    appendAudit(req.currentUser!, 'UPDATE_ACADEMIC', `Tahun ajaran aktif: ${active.academicYear} ${active.semester}`);
    res.json({ academic: active, academicSettings: db.academicSettings });
  });

  // Super Admin exclusive routes: Website Config, Role Permissions, Session Revoke
  app.put('/api/superadmin/website-config', requireAuth, requireRoles('super_admin'), (req: AuthedRequest, res) => {
    const {
      siteName,
      tagline,
      copyrightText,
      maintenanceMode,
      allowForgotPassword,
      maxLoginAttempts,
      lockoutMinutes,
      sessionTimeoutMinutes,
    } = req.body as Partial<import('./src/types/index.ts').WebsiteConfig>;
    const db = getDb();
    if (siteName) db.websiteConfig.siteName = sanitizeText(siteName);
    if (tagline) db.websiteConfig.tagline = sanitizeText(tagline);
    if (copyrightText) db.websiteConfig.copyrightText = sanitizeText(copyrightText);
    if (typeof maintenanceMode === 'boolean') db.websiteConfig.maintenanceMode = maintenanceMode;
    if (typeof allowForgotPassword === 'boolean') db.websiteConfig.allowForgotPassword = allowForgotPassword;
    if (maxLoginAttempts) db.websiteConfig.maxLoginAttempts = Math.max(3, Math.min(20, Number(maxLoginAttempts)));
    if (lockoutMinutes) db.websiteConfig.lockoutMinutes = Math.max(1, Math.min(60, Number(lockoutMinutes)));
    if (sessionTimeoutMinutes) db.websiteConfig.sessionTimeoutMinutes = Math.max(30, Math.min(10080, Number(sessionTimeoutMinutes)));
    db.websiteConfig.updatedAt = new Date().toISOString();
    saveDb();
    appendAudit(req.currentUser!, 'UPDATE_WEBSITE_CONFIG', `Memperbarui konfigurasi keamanan & website`);
    res.json({ websiteConfig: db.websiteConfig });
  });

  app.put('/api/superadmin/roles/:role', requireAuth, requireRoles('super_admin'), (req: AuthedRequest, res) => {
    const { displayName, description, permissions } = req.body as {
      displayName?: string;
      description?: string;
      permissions?: string[];
    };
    const db = getDb();
    const roleDef = db.roles.find((r) => r.role === req.params.role);
    if (!roleDef) {
      res.status(404).json({ error: 'Role tidak ditemukan.' });
      return;
    }
    if (displayName) roleDef.displayName = sanitizeText(displayName);
    if (description) roleDef.description = sanitizeText(description);
    if (Array.isArray(permissions)) roleDef.permissions = permissions.map(sanitizeText).filter(Boolean);
    roleDef.updatedAt = new Date().toISOString();
    saveDb();
    appendAudit(req.currentUser!, 'UPDATE_ROLE_PERMISSIONS', `Memperbarui hak akses role ${roleDef.role}`);
    res.json({ role: roleDef });
  });

  app.post('/api/superadmin/sessions/:id/revoke', requireAuth, requireRoles('super_admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const sess = db.user_sessions.find((s) => s.id === req.params.id);
    if (!sess) {
      res.status(404).json({ error: 'Sesi tidak ditemukan.' });
      return;
    }
    sess.isRevoked = true;
    saveDb();
    appendAudit(req.currentUser!, 'REVOKE_USER_SESSION', `Super Admin mencabut sesi ${sess.id} (${sess.deviceLabel})`);
    res.json({ ok: true });
  });

  app.get('/api/admin/backup', requireAuth, requireRoles('super_admin', 'admin'), (_req: AuthedRequest, res) => {
    const db = getDb();
    const safeBackup =
      _req.currentUser!.role === 'super_admin'
        ? db
        : {
            ...db,
            user_sessions: [],
            password_resets: [],
          };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="marketverse-x-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(safeBackup, null, 2));
  });

  // Report verification endpoint (respecting RBAC strictly)
  app.get('/api/reports/student/:id', requireAuth, (req: AuthedRequest, res) => {
    const studentId = req.params.id;
    if (!canAccessStudent(req.currentUser!, studentId)) {
      res.status(403).json({ error: 'Anda hanya dapat mengakses laporan sesuai hak akses Anda.' });
      return;
    }
    const summary = calculateStudentSummary(studentId);
    if (!summary) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
      return;
    }
    res.json({ summary });
  });

  // Frontend serving (Vite dev middleware in dev, static dist in prod)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MARKETVERSE X server running on http://0.0.0.0:${port}`);
  });
}

startServer();
