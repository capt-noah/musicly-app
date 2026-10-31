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

const app = express();

// Media files are served from external providers (Telegram) or stored as base64 in DB
// No local storage used on server disk to prevent filling up storage

// Express Config
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Routes
app.use('/api', authRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/music', songsRoutes);
app.use('/songs', songsRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/music', songsRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/player', playerRoutes);
app.use('/', mediaRoutes);

// Over-The-Air iOS & Android Distribution
import fs from 'fs';
import path from 'path';

// Serve static iOS / public assets across all possible root directories
const candidatePublicDirs = [
  path.resolve(process.cwd(), 'backend/public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
];

for (const dir of candidatePublicDirs) {
  if (fs.existsSync(dir)) {
    app.use(express.static(dir));
  }
}

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
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return fs.createReadStream(ic).pipe(res);
    }
  }
  res.status(404).send('Icon not found');
});

// Dedicated handler for signed Enterprise IPA
app.get(['/ios/Tone-Enterprise.ipa', '/download/Tone-Enterprise.ipa'], (_req, res) => {
  const ipaCandidates = [
    path.resolve(process.cwd(), 'backend/public/ios/Tone-Enterprise.ipa'),
    path.resolve(process.cwd(), 'public/ios/Tone-Enterprise.ipa'),
    path.resolve(__dirname, '../public/ios/Tone-Enterprise.ipa'),
  ];
  for (const ipa of ipaCandidates) {
    if (fs.existsSync(ipa)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="Tone-Enterprise.ipa"');
      return fs.createReadStream(ipa).pipe(res);
    }
  }
  res.status(404).send('IPA not found');
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
      res.setHeader('Content-Type', 'application/x-apple-aspen-config');
      res.setHeader('Content-Disposition', 'attachment; filename="antirevoke.mobileconfig"');
      return fs.createReadStream(cfg).pipe(res);
    }
  }
  res.status(404).send('Profile not found');
});

// Dynamic manifest.plist endpoint for iOS OTA
app.get('/ios/manifest.plist', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'tone-web-dghw.onrender.com';
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
                    <string>${baseUrl}/ios/Tone-Enterprise.ipa</string>
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
                <string>com.gto.supposetv.ent</string>
                <key>bundle-version</key>
                <string>1.0.0</string>
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
  res.send(manifest);
});

// Standalone Web iOS Installer Page
app.get('/ios', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'musicly-4l0y.onrender.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const manifestUrl = `${proto}://${host}/ios/manifest.plist`;
  const itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;

  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tone iOS — Native Installation</title>
  <style>
    body { background: #0d0f0d; color: #fff8f2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
    .card { background: #161c17; border: 1px solid rgba(185,203,186,0.25); border-radius: 28px; padding: 36px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 30px 90px rgba(0,0,0,0.9); }
    h1 { font-size: 24px; font-weight: 800; margin: 8px 0; color: #fff8f2; }
    p { font-size: 13px; color: #a6ada6; line-height: 1.6; margin: 0 0 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: rgba(185,203,186,0.15); color: #b9cbba; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
    .step { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 18px; margin-bottom: 14px; text-align: left; }
    .step-title { font-size: 13px; font-weight: 700; color: #fff8f2; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: #b9cbba; color: #0d0f0d; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
    .step-desc { font-size: 11px; color: #a6ada6; line-height: 1.5; margin-bottom: 12px; }
    .btn { display: block; width: 100%; box-sizing: border-box; padding: 12px 18px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; transition: transform 0.2s, background 0.2s; }
    .btn-primary { background: #b9cbba; color: #0d0f0d; }
    .btn-primary:hover { background: #fff8f2; }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #fff8f2; border: 1px solid rgba(255,255,255,0.15); }
    .btn-secondary:hover { background: rgba(255,255,255,0.14); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">NATIVE IOS APP (NO COMPUTER / $0 COST)</div>
    <h1>Install Tone for iOS</h1>
    <p>Follow these 3 quick steps in Safari to install Tone directly to your home screen with zero expiration limits.</p>

    <div class="step">
      <div class="step-title"><span class="step-num">1</span> Anti-Revoke DNS (Required First)</div>
      <div class="step-desc">Blocks Apple's remote certificate blacklist servers to ensure your app never expires.</div>
      <a href="/ios/antirevoke.mobileconfig" class="btn btn-secondary">Install Anti-Revoke Profile</a>
    </div>

    <div class="step">
      <div class="step-title"><span class="step-num">2</span> Install Native App</div>
      <div class="step-desc">Triggers Apple's Over-The-Air installer. Tap 'Install' on the popup prompt.</div>
      <a href="${itmsUrl}" class="btn btn-primary">Install Tone iOS</a>
    </div>

    <div class="step">
      <div class="step-title"><span class="step-num">3</span> Trust Developer Certificate</div>
      <div class="step-desc">Open Settings &gt; General &gt; VPN &amp; Device Management &gt; Tap 'GLOBAL TAKEOFF, INC' &gt; Tap 'Trust'.</div>
    </div>
  </div>
</body>
</html>`);
});

// Android APK Download Route
app.get(['/download/musicly.apk', '/download/tone.apk'], (req, res) => {
  const candidatePaths = [
    path.resolve(process.cwd(), 'public/download/musicly.apk'),
    path.resolve(process.cwd(), 'public/download/tone.apk'),
    path.resolve(process.cwd(), 'public/musicly.apk'),
    path.resolve(process.cwd(), 'public/tone.apk'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="tone.apk"');
      return fs.createReadStream(p).pipe(res);
    }
  }

  // Detect iOS user agent and offer instant redirect/option to install iOS app
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');

  if (isIOS) {
    return res.redirect('/ios');
  }

  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tone App Downloads</title>
  <style>
    body { background: #0d0f0d; color: #fff8f2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #161c17; border: 1px solid rgba(185,203,186,0.25); border-radius: 28px; padding: 36px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 30px 90px rgba(0,0,0,0.9); }
    .icon { font-size: 40px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #fff8f2; }
    p { font-size: 13px; color: #a6ada6; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: block; width: 100%; box-sizing: border-box; padding: 14px 20px; border-radius: 9999px; font-size: 14px; font-weight: 700; text-decoration: none; transition: transform 0.2s, background 0.2s; margin-bottom: 10px; }
    .btn-primary { background: #b9cbba; color: #0d0f0d; }
    .btn-primary:hover { background: #fff8f2; transform: scale(1.02); }
    .btn-secondary { background: rgba(255,255,255,0.06); color: #fff8f2; border: 1px solid rgba(255,255,255,0.15); }
    .btn-secondary:hover { background: rgba(255,255,255,0.12); transform: scale(1.02); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: rgba(185,203,186,0.15); color: #b9cbba; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎵</div>
    <div class="badge">TONE NATIVE APP</div>
    <h1>Install Tone</h1>
    <p>The Android APK build is currently being compiled for direct download. If you are on an iPhone or iPad, you can install the signed native app right now!</p>
    <a href="/ios" class="btn btn-primary">📱 Install Tone for iOS (OTA)</a>
  </div>
</body>
</html>`);
});

app.get('/', (req, res) => {
  res.send('Musicly Backend API (TypeScript + Drizzle + Manual Sessions)');
});

// Initialize Telegram Bot services
import { initTelegramBot } from './services/telegram.service';
initTelegramBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Musicly Backend listening on port ${PORT}...`);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

export default app;
