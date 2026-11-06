import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import type { FileUIPart, TextUIPart } from 'ai';
import { MEDIA } from './store.js';
import type { IAssistantFile } from '../../../models/AssistantFile.model.js';

const MAX_SHEETS = 5;
const MAX_ROWS = 200;
const MAX_COLS = 30;
const MAX_TEXT = 30_000;

const columnLetter = (n: number): string => (n <= 0 ? '' : columnLetter(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26)));
const cellText = (value: string) => value.replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 120);

export const loadWorkbook = async (file: Pick<IAssistantFile, 'mediaType' | 'data'>): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  if (file.mediaType === MEDIA.csv) await workbook.csv.read(Readable.from(file.data));
  else await workbook.xlsx.load(file.data as unknown as ArrayBuffer);
  return workbook;
};

/** Sheets as pipe tables with Excel row numbers and column letters, so the model can address cells for edits. */
export const workbookAsText = (workbook: ExcelJS.Workbook): string =>
  workbook.worksheets
    .slice(0, MAX_SHEETS)
    .map((sheet) => {
      const cols = Math.min(sheet.columnCount, MAX_COLS);
      const lines = [`Sheet "${sheet.name}" (${sheet.rowCount} rows × ${sheet.columnCount} columns)`, `Row | ${Array.from({ length: cols }, (_, i) => columnLetter(i + 1)).join(' | ')}`];
      for (let r = 1; r <= Math.min(sheet.rowCount, MAX_ROWS); r++) {
        const row = sheet.getRow(r);
        lines.push(`${r} | ${Array.from({ length: cols }, (_, i) => cellText(row.getCell(i + 1).text ?? '')).join(' | ')}`);
      }
      if (sheet.rowCount > MAX_ROWS) lines.push(`… ${sheet.rowCount - MAX_ROWS} more rows not shown`);
      return lines.join('\n');
    })
    .join('\n\n');

/** What the model reads for an attached file: PDFs and images natively, everything else as text. */
export const fileForModel = async (file: IAssistantFile, fileId: string): Promise<Array<TextUIPart | FileUIPart>> => {
  const header = `[Attached file "${file.name}", file id ${fileId}]`;
  if (file.mediaType === MEDIA.pdf || file.mediaType.startsWith('image/')) {
    return [
      { type: 'text', text: header },
      { type: 'file', mediaType: file.mediaType, filename: file.name, url: `data:${file.mediaType};base64,${file.data.toString('base64')}` },
    ];
  }
  let body: string;
  try {
    if (file.mediaType === MEDIA.xlsx || file.mediaType === MEDIA.csv) body = workbookAsText(await loadWorkbook(file));
    else if (file.mediaType === MEDIA.docx) body = (await mammoth.extractRawText({ buffer: file.data })).value;
    else body = file.data.toString('utf8');
  } catch {
    body = '(The file could not be read; it may be damaged or password-protected.)';
  }
  const text = body.length > MAX_TEXT ? `${body.slice(0, MAX_TEXT)}\n… (truncated)` : body;
  return [{ type: 'text', text: `${header}\n${text}` }];
};
