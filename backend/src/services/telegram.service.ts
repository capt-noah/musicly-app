import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { bot } from '../config';
import { registerUser, linkTelegramToUser } from './auth.service';
import { enqueueMusic } from './sync.service';
import { notifyWorker } from './sync_worker';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export function initTelegramBot() {
  bot.onText(/\/start( (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = match?.[2];

    if (token) {
      // Handle account linking
      const { consumeLinkToken } = require('./linking.service');
      const userId = consumeLinkToken(token);
      
      if (userId) {
        try {
          await linkTelegramToUser(userId, msg.from!.id.toString());
          bot.sendMessage(chatId, "✅ Your Musicly account has been successfully linked! You can now send audio files here to add them to your library.");
        } catch (error) {
          bot.sendMessage(chatId, "❌ Failed to link account. Please try generating a new token in the app.");
        }
      } else {
        bot.sendMessage(chatId, "❌ Invalid or expired token. Please generate a new one in the Profile section of the Musicly app.");
      }
    } else {
      // Standard welcome for new users
      bot.sendMessage(chatId, "Welcome to Musicly! 🎵\n\nTo link your existing account, please go to the Profile section in the app and select 'Connect Telegram'.\n\nIf you don't have an account yet, please enter your desired Musicly password to create one:");
    }
  });


  bot.on('audio', async (msg) => {
    if (!msg.audio || !msg.from) return;

    const audioFileId = msg.audio.file_id;
    // cover art is optional — many audio files don't have a thumbnail
    const coverFileId = msg.audio.thumb?.file_id ?? null;

    try {
      const [user] = await db.select().from(users).where(eq(users.telegramId, msg.from.id.toString())).limit(1);
      
      if (user) {
        await enqueueMusic(user.id, audioFileId, coverFileId, msg.audio.title || 'Untitled', msg.audio);
        bot.sendMessage(msg.chat.id, `📥 Added "${msg.audio.title || 'Untitled'}" to your sync queue. It will appear in your library shortly!`);
        
        // Trigger the background worker
        notifyWorker();
      } else {
        bot.sendMessage(msg.chat.id, "❌ Your Telegram account is not linked to Musicly. Please link it in the app first.");
      }
    } catch (error) {
      console.error('Error adding music to queue:', error);
      bot.sendMessage(msg.chat.id, '❌ Something went wrong adding your track. Please try again.');
    }
  });
}
