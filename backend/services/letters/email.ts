import { escapeHtml } from '../../utils/escapeHtml.js';
import type { FieldType } from './fields.js';
import { formatValue } from './format.js';

const TOKEN = /\{\{\s*([a-z]+\.[A-Za-z0-9_]+)\s*\}\}/g;

const tokenValue = (key: string, values: Record<string, string>, types: Record<string, FieldType>): string => {
  const raw = values[key]?.trim();
  const type = types[key];
  if (!raw || !type) return '';
  try {
    return formatValue(raw, type).parts.map((p) => p.text).join('');
  } catch {
    return raw;
  }
};

/** Plain text with `{{key}}` tokens replaced; unknown or empty tokens become ''. */
export const fillTokens = (text: string, values: Record<string, string>, types: Record<string, FieldType>, { singleLine = false } = {}): string => {
  const filled = text.replace(TOKEN, (_, key: string) => tokenValue(key, values, types));
  return singleLine ? filled.replace(/\s+/g, ' ').trim() : filled;
};

/** HTML-safe version for email bodies: everything escaped, newlines as <br>. */
export const renderEmailText = (text: string, values: Record<string, string>, types: Record<string, FieldType>): string =>
  escapeHtml(fillTokens(text, values, types)).replace(/\r?\n/g, '<br>');

/** Letter emails go to candidates too, so they carry no HRMS branding. */
export const letterEmailHtml = (bodyHtml: string): string => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px; background: #ffffff;">
  <div style="max-width: 600px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">${bodyHtml}</div>
</body>
</html>`;
