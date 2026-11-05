import type { Request, Response } from 'express';

// Strict 4-Color ANSI Palette
const C_GREEN = '\x1b[32m';
const C_BLUE = '\x1b[34m';
const C_YELLOW = '\x1b[33m';
const C_RED = '\x1b[31m';
const C_RESET = '\x1b[0m';

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  return `${h}:${m}:${s}.${ms}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function printLine(color: string, tag: string, message: string): void {
  const line = `[${getTimestamp()}] [${tag}] ${message}`;
  console.log(`${color}${line}${C_RESET}`);
}

export const logger = {
  // Whole-line Green
  success(tag: string, message: string): void {
    printLine(C_GREEN, tag, message);
  },

  // Whole-line Blue
  info(tag: string, message: string): void {
    printLine(C_BLUE, tag, message);
  },

  // Whole-line Yellow
  warn(tag: string, message: string): void {
    printLine(C_YELLOW, tag, message);
  },

  // Whole-line Red
  error(tag: string, message: string, error?: any): void {
    let errStr = '';
    if (error) {
      errStr = error?.message ? ` | ${error.message}` : ` | ${String(error)}`;
    }
    printLine(C_RED, tag, `${message}${errStr}`);
  },

  // HTTP Request Logger with whole-line color selection based on status code
  http(req: Request, res: Response, durationMs: number): void {
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Detect device
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    let device = 'Client';
    if (ua.includes('iphone')) device = 'iPhone';
    else if (ua.includes('ipad')) device = 'iPad';
    else if (ua.includes('macintosh')) device = 'Mac';
    else if (ua.includes('android')) device = 'Android';

    // Client IP
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp);

    // Response length
    const contentLength = res.getHeader('content-length');
    const sizeStr = contentLength ? `${formatBytes(Number(contentLength))} ` : '';

    const summary = `${method} ${url} ${status} ${durationMs}ms ${sizeStr}${device} ${ip}`;

    if (status >= 400) {
      // Entire line Red for client and server errors
      printLine(C_RED, 'HTTP', summary);
    } else if (status >= 300) {
      // Entire line Yellow for redirects
      printLine(C_YELLOW, 'HTTP', summary);
    } else {
      // Entire line Green for successful responses
      printLine(C_GREEN, 'HTTP', summary);
    }
  },
};
