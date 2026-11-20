import { InternalServerError, ServiceUnavailableError } from '../../utils/errors.js';
import { sleep } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const ATTEMPT_TIMEOUT_MS = 60_000;

class RetryableError extends Error {}

const authHeader = (): Record<string, string> => {
  const user = process.env.GOTENBERG_USER;
  const password = process.env.GOTENBERG_PASSWORD;
  return user && password ? { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` } : {};
};

export interface PdfAsset {
  name: string;
  data: Buffer;
}

const attempt = async (baseUrl: string, html: string, assets: PdfAsset[]): Promise<Buffer> => {
  const form = new FormData();
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
  for (const asset of assets) form.append('files', new Blob([new Uint8Array(asset.data)]), asset.name);
  form.append('preferCssPageSize', 'true');
  form.append('printBackground', 'true');
  // Without this Chromium paints a white page, hiding the letterhead drawn underneath.
  form.append('omitBackground', 'true');

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/forms/chromium/convert/html`, {
      method: 'POST',
      body: form,
      headers: authHeader(),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch (error) {
    throw new RetryableError(error instanceof Error ? error.message : String(error));
  }

  if (RETRYABLE_STATUS.has(response.status)) throw new RetryableError(`Gotenberg responded ${response.status}`);
  if (!response.ok) {
    logger.error({ status: response.status, body: (await response.text()).slice(0, 500) }, 'Gotenberg rejected the conversion');
    throw new InternalServerError('PDF conversion failed');
  }
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Converts a complete HTML document to PDF. A sleeping Railway service refuses
 * connections until it wakes, so connection failures and 502–504 are retried
 * with backoff until `retryBudgetMs` is spent.
 */
export const htmlToPdf = async (
  { html, assets = [] }: { html: string; assets?: PdfAsset[] },
  { retryBudgetMs = 20_000 }: { retryBudgetMs?: number } = {}
): Promise<Buffer> => {
  const baseUrl = process.env.GOTENBERG_URL?.replace(/\/+$/, '');
  if (!baseUrl) throw new ServiceUnavailableError('PDF service is not configured');
  if (!/^https?:\/\/[^/\s]+/i.test(baseUrl)) {
    throw new ServiceUnavailableError('PDF service is misconfigured: GOTENBERG_URL must start with http:// or https://');
  }

  const deadline = Date.now() + retryBudgetMs;
  for (let delay = 1000; ; delay *= 2) {
    try {
      return await attempt(baseUrl, html, assets);
    } catch (error) {
      if (!(error instanceof RetryableError)) throw error;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        logger.warn({ err: error.message }, 'Gotenberg unreachable after retries');
        throw new ServiceUnavailableError('PDF service is waking up, try again in a few seconds');
      }
      await sleep(Math.min(delay, remaining));
    }
  }
};
