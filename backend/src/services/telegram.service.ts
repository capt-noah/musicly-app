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
            console.warn('[ToneBot] Failed to fetch profile photos:', photoErr);
          }

          await linkTelegramToUser(userId, msg.from!.id.toString(), profilePhotoUrl);
          console.log(`[ToneBot] Linked user ${userId} to Telegram ${msg.from!.id}. Photo: ${profilePhotoUrl}`);
          bot.sendMessage(
            chatId,
            "✅ Your Tone account has been successfully linked!\n\nYou can now send high-fidelity audio files or lossless documents here, and they will immediately sync to your private sanctuary."
          );
        } catch (error) {
          bot.sendMessage(chatId, "❌ Failed to link account. Please try generating a new link token in the Tone app.");
        }
      } else {
        bot.sendMessage(chatId, "❌ Invalid or expired token. Please generate a new one in the Profile section of the Tone app.");
      }
    } else {
      // Standard welcome for new users
      bot.sendMessage(
        chatId,
        "Welcome to Tone! 🎵\n\nYour sanctuary for high-fidelity offline audio.\n\nTo link your account, open the Tone app on iOS or macOS, navigate to Profile, and tap 'Sync via Telegram Bot'."
      );
    }
  });

  const processAudioMessage = async (msg: any, fileId: string, coverFileId: string | null, title: string, audioPayload: any) => {
    if (!msg.from) return;
    try {
      const [user] = await db.select().from(users).where(eq(users.telegramId, msg.from.id.toString())).limit(1);

      if (user) {
        await enqueueMusic(user.id, fileId, coverFileId, title || 'Untitled', audioPayload);
        bot.sendMessage(msg.chat.id, `📥 Added "${title || 'Untitled'}" to your Tone sync queue. It will appear in your sanctuary shortly!`);
        notifyWorker();
      } else {
        bot.sendMessage(msg.chat.id, "❌ Your Telegram account is not linked to Tone. Please link it in the Tone app profile first.");
      }
    } catch (error) {
      console.error('[ToneBot] Error adding music to queue:', error);
      bot.sendMessage(msg.chat.id, '❌ Something went wrong adding your track to Tone. Please try again.');
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
