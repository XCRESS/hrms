import { DateTime } from 'luxon';
import { ValidationError } from '../../utils/errors.js';
import { IST_TIMEZONE } from '../../utils/timezone.js';
import type { FieldType } from './fields.js';

export type FieldFormat = 'long' | 'ordinal' | 'dotted' | 'inr' | 'words' | 'upper';

export interface FormattedValue {
  parts: Array<{ text: string; sup?: true }>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT = /^\d+(\.\d{1,2})?$/;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n: number): string => (n < 20 ? (ONES[n] ?? '') : (TENS[Math.floor(n / 10)] ?? '') + (n % 10 ? ` ${ONES[n % 10]}` : ''));
const belowThousand = (n: number): string =>
  n < 100 ? belowHundred(n) : `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${belowHundred(n % 100)}` : ''}`;

/** Same output as the frontend's `convertToWords` (utils/indianNumber.ts). */
export const amountInWords = (n: number): string => {
  let amount = Math.round(Math.abs(n));
  if (amount === 0) return 'Zero Rupees Only';
  const words: string[] = [];
  for (const [unit, name] of [[10_000_000, 'Crore'], [100_000, 'Lakh'], [1000, 'Thousand']] as const) {
    if (amount >= unit) {
      words.push(`${belowThousand(Math.floor(amount / unit))} ${name}`);
      amount %= unit;
    }
  }
  if (amount > 0) words.push(belowThousand(amount));
  return `${n < 0 ? 'Minus ' : ''}${words.join(' ')} Rupees Only`;
};

export const formatIndianAmount = (n: number): string => {
  const [whole = '0', fraction = '00'] = n.toFixed(2).split('.');
  const grouped = whole.length > 3 ? `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${whole.slice(-3)}` : whole;
  return fraction === '00' ? grouped : `${grouped}.${fraction}`;
};

const ordinalSuffix = (day: number): string => {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
};

const single = (text: string): FormattedValue => ({ parts: [{ text }] });

const formatDate = (raw: string, format: FieldFormat | undefined): FormattedValue => {
  const date = ISO_DATE.test(raw) ? DateTime.fromISO(raw, { zone: IST_TIMEZONE }) : null;
  if (!date?.isValid) throw new ValidationError(`"${raw}" is not a date (YYYY-MM-DD)`);
  if (format === 'dotted') return single(date.toFormat('dd.LL.yyyy'));
  if (format === 'ordinal') {
    return { parts: [{ text: String(date.day) }, { text: ordinalSuffix(date.day), sup: true }, { text: date.toFormat(' LLLL yyyy') }] };
  }
  return single(date.toFormat('d LLLL yyyy'));
};

const formatAmount = (raw: string, type: 'money' | 'number', format: FieldFormat | undefined): FormattedValue => {
  if (!AMOUNT.test(raw)) throw new ValidationError(`"${raw}" is not a number`);
  const n = Number(raw);
  if (format === 'words') return single(amountInWords(n));
  if (type === 'number') return single(raw);
  return single(`₹${formatIndianAmount(n)}`);
};

/** Raw values are stored unformatted (ISO dates, plain numbers); each chip picks its own format. */
export const formatValue = (raw: string, type: FieldType, format?: FieldFormat): FormattedValue => {
  if (type === 'date') return formatDate(raw, format);
  if (type === 'money' || type === 'number') return formatAmount(raw, type, format);
  return single(format === 'upper' ? raw.toUpperCase() : raw);
};

export const salutationFor = (gender: 'male' | 'female' | 'other'): string => (gender === 'male' ? 'Mr.' : gender === 'female' ? 'Ms.' : '');
