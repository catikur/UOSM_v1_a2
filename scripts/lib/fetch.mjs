import crypto from 'node:crypto';

/**
 * Yeniden denemeli, zaman asimili HTTP getirici.
 *
 * Not: Node'un yerlesik fetch'i HTTPS_PROXY'yi kendiliginden okumaz.
 * Vekil sunucu arkasinda calistiriliyorsa NODE_USE_ENV_PROXY=1 gerekir
 * (Node >= 22.21). GitHub Actions kosucularinda vekil yoktur.
 */
export async function fetchWithRetry(url, { userAgent, timeoutMs = 30_000, retries = 3, log = () => {} } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'user-agent': userAgent || 'UOSM-PET-CT-SGK-Rehberi/2.0',
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'accept-language': 'tr-TR,tr;q=0.9',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return { ok: true, status: response.status, body: await response.text() };
    } catch (error) {
      lastError = error;
      if (attempt <= retries) {
        const waitMs = 2 ** attempt * 1000;
        log(`  deneme ${attempt} basarisiz (${error.message}); ${waitMs / 1000}s sonra yeniden`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  return { ok: false, error: lastError?.message || 'bilinmeyen hata' };
}

export const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
