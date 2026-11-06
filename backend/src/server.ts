import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import songsRoutes from './routes/songs.routes';
import playlistsRoutes from './routes/playlists.routes';
import mediaRoutes from './routes/media.routes';
import telegramRoutes from './routes/telegram.routes';
import playerRoutes from './routes/player.routes';
import interactionsRoutes from './routes/interactions.routes';
import matchRoutes from './routes/match.routes';
import deezerRoutes from './routes/deezer.routes';
import dohRoutes from './routes/doh.routes';
import { botUsername } from './config';
import { logger } from './utils/logger';

const app = express();

// Media files are served from external providers (Telegram) or stored as base64 in DB
// No local storage used on server disk to prevent filling up storage

// Express Config
app.use(express.json({ limit: '20mb' }));
app.use(express.raw({ type: ['application/octet-stream', 'audio/*', 'application/dns-message'], limit: '20mb' }));
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Compact HTTP Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration);
  });
  next();
});

// Routes
app.use('/', dohRoutes);
app.use('/api', authRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/music', songsRoutes);
app.use('/songs', songsRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/music', songsRoutes);
app.use('/api/music', deezerRoutes);
app.use('/api/deezer', deezerRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/player', playerRoutes);
app.use('/', mediaRoutes);

// Over-The-Air iOS & Android Distribution
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate directories for static files
const candidatePublicDirs = [
  path.resolve(process.cwd(), 'backend/public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
];

// Dedicated handler for app icons (/icon.png and /images/icon.png)
app.get(['/icon.png', '/images/icon.png'], (_req, res) => {
  const iconCandidates = [
    path.resolve(process.cwd(), 'backend/public/images/icon.png'),
    path.resolve(process.cwd(), 'backend/public/icon.png'),
    path.resolve(process.cwd(), 'public/images/icon.png'),
    path.resolve(process.cwd(), 'public/icon.png'),
    path.resolve(process.cwd(), 'assets/images/icon.png'),
    path.resolve(__dirname, '../public/images/icon.png'),
    path.resolve(__dirname, '../public/icon.png'),
  ];
  for (const ic of iconCandidates) {
    if (fs.existsSync(ic)) {
      const stat = fs.statSync(ic);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return fs.createReadStream(ic).pipe(res);
    }
  }
  res.status(404).send('Icon not found');
});

// Dedicated handler for single canonical Tone.ipa
app.get(['/ios/Tone.ipa', '/download/Tone.ipa'], (_req, res) => {
  const ipaCandidates = [
    path.resolve(process.cwd(), 'backend/public/ios/Tone.ipa'),
    path.resolve(process.cwd(), 'public/ios/Tone.ipa'),
    path.resolve(__dirname, '../public/ios/Tone.ipa'),
  ];
  for (const ipa of ipaCandidates) {
    if (fs.existsSync(ipa)) {
      const stat = fs.statSync(ipa);
      logger.success('OTA', `Tone.ipa served | ${(stat.size / (1024 * 1024)).toFixed(2)}MB | stream started`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="Tone.ipa"');
      return fs.createReadStream(ipa).pipe(res);
    }
  }
  logger.error('OTA', 'Tone.ipa not found on disk');
  res.status(404).send('Tone.ipa not found');
});

// Legacy redirect for old IPA names
app.get(['/ios/Tone-Enterprise.ipa', '/download/Tone-Enterprise.ipa', '/ios/Tone-unsigned.ipa', '/download/Tone-unsigned.ipa'], (_req, res) => {
  logger.warn('OTA', 'legacy IPA request -> redirecting 307 to /ios/Tone.ipa');
  res.redirect(307, '/ios/Tone.ipa');
});

// Dedicated handler for antirevoke profile with Apple MIME type
app.get(['/ios/antirevoke.mobileconfig'], (_req, res) => {
  const configCandidates = [
    path.resolve(process.cwd(), 'backend/public/ios/antirevoke.mobileconfig'),
    path.resolve(process.cwd(), 'public/ios/antirevoke.mobileconfig'),
    path.resolve(__dirname, '../public/ios/antirevoke.mobileconfig'),
  ];
  for (const cfg of configCandidates) {
    if (fs.existsSync(cfg)) {
      const stat = fs.statSync(cfg);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', 'attachment; filename="antirevoke.mobileconfig"');
      return fs.createReadStream(cfg).pipe(res);
    }
  }
  res.status(404).send('Profile not found');
});

// Dynamic manifest.plist endpoint for iOS OTA
app.get('/ios/manifest.plist', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'musicly-4l0y.onrender.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const baseUrl = `${proto}://${host}`;

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${baseUrl}/ios/Tone.ipa?v=1.1.1</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>display-image</string>
                    <key>needs-shine</key>
                    <true/>
                    <key>url</key>
                    <string>${baseUrl}/images/icon.png</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string>
                    <key>needs-shine</key>
                    <true/>
                    <key>url</key>
                    <string>${baseUrl}/images/icon.png</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>hk.com.hsbc.enterprise.hsbchkrewards.local2</string>
                <key>bundle-version</key>
                <string>1.1.1</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>Tone</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  logger.info('OTA', 'manifest delivered | Tone v1.1.1');
  res.send(manifest);
});

// Standalone Web iOS Installer Page
app.get('/ios', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'musicly-4l0y.onrender.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const manifestUrl = `${proto}://${host}/ios/manifest.plist`;
  const itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
  logger.info('OTA', `installer page loaded | host=${host}`);

  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install Tone on iPhone</title>
  <style>
    body { background: #0d0f0d; color: #fff8f2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { background: #121613; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px 24px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #b9cbba; font-size: 12px; font-weight: 600; text-decoration: none; margin-bottom: 24px; transition: transform 0.15s; }
    .back-btn:hover { background: rgba(255,255,255,0.12); color: #fff8f2; transform: scale(1.02); }
    .icon { width: 68px; height: 68px; margin: 0 auto 16px; border-radius: 20px; background: #141815; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 12px 30px rgba(0,0,0,0.6); }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 6px; color: #fff8f2; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .version-pill { font-size: 10px; font-family: monospace; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: #b9cbba; border: 1px solid rgba(255,255,255,0.1); }
    p.subtitle { font-size: 13px; color: #a6ada6; margin: 0 0 24px; }
    .step { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 18px; margin-bottom: 14px; text-align: left; }
    .step-title { font-size: 14px; font-weight: 600; color: #fff8f2; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: #b9cbba; color: #0d0f0d; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; shrink: 0; }
    .step-desc { font-size: 12px; color: #a6ada6; line-height: 1.5; margin-bottom: 12px; }
    .btn { display: block; width: 100%; box-sizing: border-box; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; transition: transform 0.15s, background 0.15s; }
    .btn-primary { background: #b9cbba; color: #0d0f0d; }
    .btn-primary:active { transform: scale(0.99); }
    .btn-secondary { background: rgba(255,255,255,0.06); color: #fff8f2; border: 1px solid rgba(255,255,255,0.12); }
    .note { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; font-size: 11px; color: #a6ada6; text-align: left; line-height: 1.5; margin-top: 14px; }
    .note strong { color: #fff8f2; }
  </style>
</head>
<body>
  <div class="card">
    <a href="https://musicly-web.vercel.app" class="back-btn">← Back to Tone</a>
    <div class="icon">🎵</div>
    <h1><span>Install Tone</span> <span class="version-pill">v1.1.1</span></h1>
    <p class="subtitle">Follow two quick steps to install Tone on your iPhone.</p>

    <div class="step">
      <div class="step-title"><span class="step-num">1</span> Download Profile</div>
      <div class="step-desc">Tap below, tap <strong>Allow</strong>, then go to <strong>Settings ➔ Profile Downloaded ➔ Install</strong>.</div>
      <a href="/ios/antirevoke.mobileconfig" class="btn btn-secondary">1. Download Profile</a>
    </div>

    <div class="step">
      <div class="step-title"><span class="step-num">2</span> Install App</div>
      <div class="step-desc">Tap below, then tap <strong>Install</strong>. Tone will start downloading to your home screen.</div>
      <a href="${itmsUrl}" class="btn btn-primary">2. Install Tone</a>
    </div>

    <div class="note">
      <strong>Before opening Tone:</strong><br>
      Go to Settings ➔ General ➔ VPN &amp; Device Management, tap <strong>HSBC Bank plc</strong>, and tap <strong>Trust</strong>.
    </div>
  </div>
</body>
</html>`);
});

// Fallback static files
for (const dir of candidatePublicDirs) {
  if (fs.existsSync(dir)) {
    app.use(express.static(dir));
  }
}

// App Download Route - redirects to iOS installer
app.get(['/download/musicly.apk', '/download/tone.apk'], (_req, res) => {
  logger.warn('OTA', 'APK download route -> redirecting 307 to /ios');
  return res.redirect(307, '/ios');
});

app.get('/', (_req, res) => {
  res.json({
    app: "Tone Backend API",
    version: "2.0.0",
    engine: "TypeScript + Drizzle + Timing-Safe Auth",
    bot: `@${botUsername}`,
    status: "operational"
  });
});

// Initialize Telegram Bot services
import { initTelegramBot } from './services/telegram.service';
initTelegramBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.success('SYS', `backend listening on port ${PORT} | bot="@${botUsername}"`);
});

process.on('uncaughtException', (err) => {
  logger.error('SYS', 'uncaught exception', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('SYS', 'unhandled rejection', reason);
});

export default app;
