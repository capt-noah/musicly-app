import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { bot } from './config';
import authRoutes from './routes/auth.routes';
import songsRoutes from './routes/songs.routes';
import playlistsRoutes from './routes/playlists.routes';
import mediaRoutes from './routes/media.routes';
import telegramRoutes from './routes/telegram.routes';
import playerRoutes from './routes/player.routes';
import interactionsRoutes from './routes/interactions.routes';

const app = express();

app.use('/uploads', express.static('uploads'));

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
app.use('/songs', songsRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/player', playerRoutes);
app.use('/', mediaRoutes);

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
