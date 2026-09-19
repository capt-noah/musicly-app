import { bot } from '../config';
import { linkTelegramToUser } from './auth.service';
import { consumeLinkToken } from './linking.service';
import { enqueueMusic } from './sync.service';
import { notifyWorker } from './sync_worker';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

let isBotInitialized = false;

export function initTelegramBot() {
  if (isBotInitialized) return;
  isBotInitialized = true;

  bot.onText(/\/start( (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = match?.[2];

    if (token) {
      // Handle account linking
      const userId = consumeLinkToken(token);
      
      if (userId) {
        try {
          let profilePhotoUrl: string | null = null;
          try {
            const photos = await bot.getUserProfilePhotos(msg.from!.id);
            if (photos.total_count > 0) {
              const fileId = photos.photos[0][photos.photos[0].length - 1].file_id;
              profilePhotoUrl = `/media/${fileId}`;
            }
          } catch (photoErr) {
            console.warn('Failed to fetch profile photos:', photoErr);
          }

          await linkTelegramToUser(userId, msg.from!.id.toString(), profilePhotoUrl);
          console.log(`[TelegramBot] Linked user ${userId} to Telegram ${msg.from!.id}. Photo: ${profilePhotoUrl}`);
          bot.sendMessage(chatId, "✅ Your Musicly account has been successfully linked! You can now send audio files here to add them to your library.");
        } catch (error) {
          bot.sendMessage(chatId, "❌ Failed to link account. Please try generating a new token in the app.");
        }
      } else {
        bot.sendMessage(chatId, "❌ Invalid or expired token. Please generate a new one in the Profile section of the Musicly app.");
      }
    } else {
      // Standard welcome for new users
      bot.sendMessage(chatId, "Welcome to Musicly! 🎵\n\nTo link your existing account, please go to the Profile section in the Musicly app and select 'Connect Telegram'.");
    }
  });

  const processAudioMessage = async (msg: any, fileId: string, coverFileId: string | null, title: string, audioPayload: any) => {
    if (!msg.from) return;
    try {
      const [user] = await db.select().from(users).where(eq(users.telegramId, msg.from.id.toString())).limit(1);
      
      if (user) {
        await enqueueMusic(user.id, fileId, coverFileId, title || 'Untitled', audioPayload);
        bot.sendMessage(msg.chat.id, `📥 Added "${title || 'Untitled'}" to your sync queue. It will appear in your library shortly!`);
        notifyWorker();
      } else {
        bot.sendMessage(msg.chat.id, "❌ Your Telegram account is not linked to Musicly. Please link it in the app first.");
      }
    } catch (error) {
      console.error('Error adding music to queue:', error);
      bot.sendMessage(msg.chat.id, '❌ Something went wrong adding your track. Please try again.');
    }
  };

  bot.on('audio', async (msg) => {
    if (!msg.audio) return;
    const audioFileId = msg.audio.file_id;
    const coverFileId = (msg.audio as any).thumbnail?.file_id ?? (msg.audio as any).thumb?.file_id ?? null;
    const title = msg.audio.title || (msg.audio as any).file_name?.replace(/\.[^/.]+$/, "") || 'Untitled';
    await processAudioMessage(msg, audioFileId, coverFileId, title, msg.audio);
  });

  bot.on('document', async (msg) => {
    if (!msg.document) return;
    const mime = (msg.document.mime_type || '').toLowerCase();
    const fileName = (msg.document.file_name || '').toLowerCase();
    const isAudioDoc = mime.startsWith('audio/') || /\.(mp3|m4a|flac|wav|aac|ogg|opus)$/i.test(fileName);
    
    if (!isAudioDoc) return;

    const fileId = msg.document.file_id;
    const coverFileId = (msg.document as any).thumbnail?.file_id ?? (msg.document as any).thumb?.file_id ?? null;
    const title = msg.document.file_name?.replace(/\.[^/.]+$/, "") || 'Untitled';
    await processAudioMessage(msg, fileId, coverFileId, title, {
      ...msg.document,
      title,
      duration: 0,
      mime_type: msg.document.mime_type || 'audio/mpeg'
    });
  });
}

