import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

const BLOCKED_DOMAINS = [
  // 1. Provisioning Profile Query (PPQ) - Critical 75% OTA check
  'ppq.apple.com',
  'ppq-ext.v.aaplimg.com',
  'usw2-ppq-ext-prod.apple.com',
  'use1-ppq-ext-prod.apple.com',
  'ppq-st-ext.itunes.apple.com',

  // 2. Online Certificate Status Protocol (OCSP)
  'ocsp.apple.com',
  'ocsp2.apple.com',
  'ocsp3.apple.com',
  'ocsp4.apple.com',
  'ocsp-a.g.aaplimg.com',
  'ocsp2.g.aaplimg.com',
  'ocsp2.apple.com.edgesuite.net',

  // 3. Certificate Revocation Lists & Trust Anchors
  'valid.apple.com',
  'valid-apple.g.aaplimg.com',
  'crl.apple.com',
  'crl.g.aaplimg.com',
  'certs.apple.com',
  'certs.g.aaplimg.com',
  'appattest.apple.com',
  'vpp.itunes.apple.com',
  'mesu.apple.com',
  'gdmf.apple.com',
  'axm-app.apple.com',
  'comm-main.ess.apple.com',
  'comm-cohort.ess.apple.com',
  'guzzoni-apple-com.v.aaplimg.com',
];

function isBlocked(domain: string): boolean {
  if (!domain) return false;
  const clean = domain.toLowerCase().trim();
  return BLOCKED_DOMAINS.some(b => clean === b || clean.endsWith(`.${b}`));
}

function parseDomain(buffer: Buffer, offset = 12): { domain: string; endOffset: number } {
  const domainParts: string[] = [];
  let curr = offset;
  while (curr < buffer.length && buffer[curr] !== 0) {
    const len = buffer[curr++];
    if (len === 0) break;
    if (curr + len > buffer.length) break;
    domainParts.push(buffer.subarray(curr, curr + len).toString('utf8'));
    curr += len;
  }
  return { domain: domainParts.join('.').toLowerCase(), endOffset: curr + 1 };
}

function createBlockedResponse(queryBuf: Buffer): Buffer | null {
  if (queryBuf.length < 16) return null;
  const id = queryBuf.readUInt16BE(0);
  const { domain, endOffset } = parseDomain(queryBuf, 12);
  if (!domain || endOffset + 4 > queryBuf.length) return null;

  const qType = queryBuf.readUInt16BE(endOffset);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(0x8180, 2); // Standard response, No error, Recursion Desired & Available
  header.writeUInt16BE(1, 4);      // QDCOUNT: 1
  header.writeUInt16BE(0, 8);      // NSCOUNT: 0
  header.writeUInt16BE(0, 10);     // ARCOUNT: 0

  const question = queryBuf.subarray(12, endOffset + 4);

  if (qType === 1) {
    // Type A: IPv4 0.0.0.0
    header.writeUInt16BE(1, 6); // ANCOUNT: 1
    const answer = Buffer.alloc(16);
    answer.writeUInt16BE(0xc00c, 0); // Pointer to question name
    answer.writeUInt16BE(1, 2);      // Type A
    answer.writeUInt16BE(1, 4);      // Class IN
    answer.writeUInt32BE(300, 6);    // TTL 300s
    answer.writeUInt16BE(4, 10);     // Length 4
    answer.writeUInt32BE(0, 12);     // 0.0.0.0
    return Buffer.concat([header, question, answer]);
  } else if (qType === 28) {
    // Type AAAA: IPv6 :: (16 zero bytes)
    header.writeUInt16BE(1, 6); // ANCOUNT: 1
    const answer = Buffer.alloc(28);
    answer.writeUInt16BE(0xc00c, 0); // Pointer to question name
    answer.writeUInt16BE(28, 2);     // Type AAAA
    answer.writeUInt16BE(1, 4);      // Class IN
    answer.writeUInt32BE(300, 6);    // TTL 300s
    answer.writeUInt16BE(16, 10);    // Length 16
    answer.fill(0, 12, 28);          // 16 zero bytes
    return Buffer.concat([header, question, answer]);
  } else {
    // Other query types (HTTPS type 65, TXT, etc.): return NOERROR with ANCOUNT=0
    header.writeUInt16BE(0, 6); // ANCOUNT: 0
    return Buffer.concat([header, question]);
  }
}

async function handleDnsQuery(queryBuf: Buffer, res: Response) {
  try {
    const { domain } = parseDomain(queryBuf, 12);

    if (isBlocked(domain)) {
      console.log(`[DoH] 🛡️ Strictly BLOCKED Apple verification query for "${domain}" -> Returning 0.0.0.0/::`);
      const blockedRes = createBlockedResponse(queryBuf);
      if (blockedRes) {
        res.setHeader('Content-Type', 'application/dns-message');
        res.setHeader('Cache-Control', 'max-age=300');
        return res.send(blockedRes);
      }
    }

    // Forward non-blocked query to upstream Cloudflare public DoH
    const upstreamRes = await fetch('https://cloudflare-dns.com/dns-query', {
      method: 'POST',
      headers: {
        'Accept': 'application/dns-message',
        'Content-Type': 'application/dns-message',
      },
      body: queryBuf,
    });

    const responseBuf = await upstreamRes.buffer();
    res.setHeader('Content-Type', 'application/dns-message');
    return res.send(responseBuf);
  } catch (error) {
    console.error('[DoH] Resolution error:', error);
    res.status(500).send('DNS Resolution Error');
  }
}

// GET /dns-query?dns=<base64url>
router.get(['/dns-query', '/api/dns-query'], async (req: Request, res: Response) => {
  const dnsParam = req.query.dns as string;
  if (!dnsParam) {
    return res.status(400).send('Missing ?dns parameter');
  }

  try {
    // Decode base64url
    let base64 = dnsParam.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const queryBuf = Buffer.from(base64, 'base64');
    await handleDnsQuery(queryBuf, res);
  } catch (e: any) {
    res.status(400).send('Invalid DNS request');
  }
});

// POST /dns-query
router.post(['/dns-query', '/api/dns-query'], async (req: Request, res: Response) => {
  const body = req.body;
  if (!Buffer.isBuffer(body)) {
    return res.status(400).send('Expected binary application/dns-message body');
  }
  await handleDnsQuery(body, res);
});

export default router;
