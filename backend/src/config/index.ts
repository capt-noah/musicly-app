import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const enablePolling = Boolean(token && process.env.NODE_ENV !== 'test');

export const bot = new TelegramBot(token, { polling: enablePolling });

