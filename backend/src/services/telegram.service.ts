import { bot } from '../config';
import { linkTelegramToUser } from './auth.service';
import { consumeLinkToken } from './linking.service';
import { enqueueMusic } from './sync.service';
import { notifyWorker } from './sync_worker';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

let isBotInitialized = false;

export function initTelegramBot() {
  if (isBotInitialized) return;
  isBotInitialized = true;

  // Support /start <token>, /start link_<token>, /link <token>, /link link_<token>
  bot.onText(/\/(start|link)( (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const command = match?.[1]?.toLowerCase();
    const rawParam = match?.[3]?.trim();
    const token = rawParam?.replace(/^link_/i, '').trim();

    logger.warn('TG', `cmd /${command} from=${msg.from?.username || msg.chat.id} (tg_id: ${msg.from?.id})`);

    if (token) {
      // Handle account linking
      const userId = consumeLinkToken(token);

      if (userId) {
        try {
          let profilePhotoUrl: string | null = null;
          try {
            const photos = await bot.getUserProfilePhotos(msg.from!.id, { limit: 1 });
            if (photos.total_count > 0 && photos.photos.length > 0 && photos.photos[0].length > 0) {
              const photoSizes = photos.photos[0];
              // Pick highest resolution size
              const largest = photoSizes[photoSizes.length - 1];
              profilePhotoUrl = `/media/${largest.file_id}`;
            }
          } catch (photoErr) {
            logger.warn('TG', `failed to fetch profile photo for tg_id=${msg.from!.id}`);
          }

          await linkTelegramToUser(userId, msg.from!.id.toString(), profilePhotoUrl);
          logger.success('TG', `account linked: user_id=${userId} <-> tg_id=${msg.from!.id}`);
          bot.sendMessage(
            chatId,
            "✅ Your Tone account has been linked!\n\nSend music tracks here to automatically sync them to your Tone library."
          );
          return;
        } catch (error) {
          logger.error('TG', `link account error for user_id=${userId}`, error);
          bot.sendMessage(chatId, "❌ Failed to link account. Please try generating a new link code in the Tone app.");
          return;
        }
      } else {
        logger.warn('TG', `invalid or expired token attempted by tg_id=${msg.from?.id}`);
        bot.sendMessage(chatId, "❌ Invalid or expired code. Please generate a new link code in the Profile section of the Tone app.");
        return;
      }
    }

    if (command === 'link') {
      bot.sendMessage(
        chatId,
        "To link your account, send: `/link <code>` (generate your code in the Tone app Profile).",
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Standard welcome for new users
    bot.sendMessage(
      chatId,
      "Welcome to Tone! 🎵\n\nTo link your account, open the Tone app on iOS or macOS, navigate to Profile, and tap 'Connect Telegram Bot'."
    );
  });

  bot.onText(/\/help/, (msg) => {
    logger.warn('TG', `cmd /help from=${msg.from?.username || msg.chat.id}`);
    bot.sendMessage(
      msg.chat.id,
      "🎵 *Tone Sync Bot*\n\nSend music audio files (MP3, FLAC, M4A, WAV, AAC) directly to this chat.\nThey will automatically sync to your Tone library on all your devices.",
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/status/, async (msg) => {
    if (!msg.from) return;
    logger.warn('TG', `cmd /status from=${msg.from?.username || msg.chat.id}`);
    try {
      const [user] = await db.select().from(users).where(eq(users.telegramId, msg.from.id.toString())).limit(1);
      if (user) {
        logger.success('TG', `status query: linked to user="${user.username}" (id: ${user.id})`);
        bot.sendMessage(msg.chat.id, `✅ Linked to Tone account: *${user.username}*`, { parse_mode: 'Markdown' });
      } else {
        logger.warn('TG', `status query: tg_id=${msg.from.id} not linked`);
        bot.sendMessage(msg.chat.id, "❌ Not linked. Open the Tone app, navigate to Profile, and tap 'Connect Telegram Bot'.", { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      logger.error('TG', 'status query error', err);
      bot.sendMessage(msg.chat.id, "❌ Could not retrieve status. Please try again later.");
    }
  });

  const processAudioMessage = async (msg: any, fileId: string, coverFileId: string | null, title: string, audioPayload: any) => {
    if (!msg.from) return;
    try {
      const [user] = await db.select().from(users).where(eq(users.telegramId, msg.from.id.toString())).limit(1);

      if (user) {
        await enqueueMusic(user.id, fileId, coverFileId, title || 'Untitled', audioPayload);
        logger.success('TG', `track enqueued: "${title || 'Untitled'}" for user="${user.username}" (id: ${user.id})`);
        bot.sendMessage(msg.chat.id, `📥 Added "${title || 'Untitled'}" to your Tone sync queue. It will appear in your library shortly!`);
        notifyWorker();
      } else {
        logger.warn('TG', `enqueue rejected: tg_id=${msg.from.id} not linked to any user`);
        bot.sendMessage(msg.chat.id, "❌ Your Telegram account is not linked to Tone. Please link it in the Tone app profile first.");
      }
    } catch (error) {
      logger.error('TG', `error adding track "${title}" to queue`, error);
      bot.sendMessage(msg.chat.id, '❌ Something went wrong adding your track to Tone. Please try again.');
    }
  };

  bot.on('audio', async (msg) => {
    if (msg.from?.is_bot) return; // Prevent bot echo loop
    if (!msg.audio) return;
    const audioFileId = msg.audio.file_id;
    const coverFileId = (msg.audio as any).thumbnail?.file_id ?? (msg.audio as any).thumb?.file_id ?? null;
    const title = msg.audio.title || (msg.audio as any).file_name?.replace(/\.[^/.]+$/, "") || 'Untitled';
    logger.warn('TG', `audio received: "${title}" from=${msg.from?.username || msg.chat.id}`);
    await processAudioMessage(msg, audioFileId, coverFileId, title, msg.audio);
  });

  bot.on('document', async (msg) => {
    if (msg.from?.is_bot) return; // Prevent bot echo loop
    if (!msg.document) return;
    const mime = (msg.document.mime_type || '').toLowerCase();
    const fileName = (msg.document.file_name || '').toLowerCase();
    const isAudioDoc = mime.startsWith('audio/') || /\.(mp3|m4a|flac|wav|aac|ogg|opus)$/i.test(fileName);

    if (!isAudioDoc) return;

    const fileId = msg.document.file_id;
    const coverFileId = (msg.document as any).thumbnail?.file_id ?? (msg.document as any).thumb?.file_id ?? null;
    const title = msg.document.file_name?.replace(/\.[^/.]+$/, "") || 'Untitled';
    logger.warn('TG', `audio doc received: "${title}" (${fileName}) from=${msg.from?.username || msg.chat.id}`);
    await processAudioMessage(msg, fileId, coverFileId, title, {
      ...msg.document,
      title,
      duration: 0,
      mime_type: msg.document.mime_type || 'audio/mpeg'
    });
  });
}
