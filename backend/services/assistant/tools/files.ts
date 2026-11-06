import { tool } from 'ai';
import { z } from 'zod';
import type ExcelJS from 'exceljs';
import { buildCsv, buildDocx, buildPdf, buildXlsx, type DocumentSpec, type SheetSpec } from '../files/build.js';
import { loadWorkbook } from '../files/read.js';
import { loadOwnedFile, MEDIA, saveFile, type FileSummary } from '../files/store.js';
import type { Cell, ResultView } from '../views.js';
import { latestTable } from './tables.js';
import { STAFF_ROLES, type AssistantToolDef } from './types.js';
import { objectId } from './attendance.js';

export interface FileResult extends FileSummary {
  kind: 'file';
  description: string;
  preview?: ResultView;
}

const cell = z.union([z.string().max(2000), z.number(), z.null()]);
const tableInput = z.object({ columns: z.array(z.string().max(100)).min(1).max(40), rows: z.array(z.array(cell).max(40)).max(2000) });
const EXTENSIONS = { xlsx: 'xlsx', csv: 'csv', docx: 'docx', pdf: 'pdf' } as const;
const MEDIA_FOR = { xlsx: MEDIA.xlsx, csv: MEDIA.csv, docx: MEDIA.docx, pdf: MEDIA.pdf } as const;

const safeName = (name: string, ext: string) => `${name.replace(/\.[a-z0-9]+$/i, '').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'HR Buddy'}.${ext}`;

const sheetFromView = (view: ResultView): SheetSpec => ({
  name: view.title.split('·')[0]?.trim() || 'Sheet1',
  columns: view.columns.map((c) => c.label),
  kinds: view.columns.map((c) => c.kind),
  rows: view.rows.map((r) => view.columns.map((c) => r[c.key] ?? null)),
});

const previewOf = (title: string, sheet: SheetSpec): ResultView => ({
  kind: 'result',
  title,
  columns: sheet.columns.map((label, i) => ({ key: `c${i}`, label, kind: sheet.kinds?.[i] ?? 'text' })),
  rows: sheet.rows.slice(0, 50).map((r) => Object.fromEntries(sheet.columns.map((_, i) => [`c${i}`, r[i] ?? null]))),
  defaultView: 'table',
});

const createFileTool: AssistantToolDef = {
  name: 'create_file',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Create a downloadable Excel (xlsx), CSV, Word (docx) or PDF file. Use fromTable to export the most recent table shown in this conversation (fetch it first if needed); ' +
        'or pass sheets (for xlsx/csv) or a title plus sections (for docx/pdf) that you write. To rewrite an attached Word document, pass its revised content as sections. The user downloads it from a card.',
      inputSchema: z.object({
        format: z.enum(['xlsx', 'csv', 'docx', 'pdf']),
        filename: z.string().min(1).max(100),
        fromTable: z.boolean().optional(),
        title: z.string().max(200).optional(),
        sheets: z.array(z.object({ name: z.string().max(31), ...tableInput.shape })).max(10).optional(),
        sections: z
          .array(
            z.object({
              heading: z.string().max(200).optional(),
              paragraphs: z.array(z.string().max(5000)).max(50).optional(),
              bullets: z.array(z.string().max(1000)).max(100).optional(),
              table: tableInput.optional(),
            })
          )
          .max(40)
          .optional(),
      }),
      execute: async ({ format, filename, fromTable, title, sheets, sections }): Promise<FileResult | { kind: 'error'; message: string }> => {
        const view = fromTable ? latestTable(ctx) : undefined;
        if (fromTable && !view) return { kind: 'error', message: 'There is no table in this conversation to export yet.' };

        const sheetSpecs: SheetSpec[] = view ? [sheetFromView(view)] : (sheets ?? []).map((s) => ({ name: s.name, columns: s.columns, rows: s.rows as Cell[][] }));
        const doc: DocumentSpec = {
          title: title ?? view?.title ?? filename,
          sections: view
            ? [{ ...(view.subtitle ? { paragraphs: [view.subtitle] } : {}), table: { columns: sheetSpecs[0]!.columns, rows: sheetSpecs[0]!.rows } }]
            : (sections ?? []).map((s) => ({ ...s, ...(s.table ? { table: { columns: s.table.columns, rows: s.table.rows as Cell[][] } } : {}) })),
        };

        let data: Buffer;
        if (format === 'xlsx' || format === 'csv') {
          if (!sheetSpecs.length) return { kind: 'error', message: 'A spreadsheet needs a table: pass fromTable or sheets.' };
          data = format === 'xlsx' ? await buildXlsx(sheetSpecs) : buildCsv(sheetSpecs[0]!);
        } else {
          if (!doc.sections.length) return { kind: 'error', message: 'A document needs content: pass fromTable or sections.' };
          data = format === 'docx' ? await buildDocx(doc) : await buildPdf(doc);
        }

        const saved = await saveFile(ctx.caller.userId, safeName(filename, EXTENSIONS[format]), MEDIA_FOR[format], data, 'generated');
        const rows = sheetSpecs.reduce((n, s) => n + s.rows.length, 0);
        return {
          kind: 'file',
          ...saved,
          description: sheetSpecs.length ? `${rows} row${rows === 1 ? '' : 's'}${sheetSpecs.length > 1 ? ` across ${sheetSpecs.length} sheets` : ''}` : `${doc.sections.length} section${doc.sections.length === 1 ? '' : 's'}`,
        };
      },
      toModelOutput: ({ output }) => ({
        type: 'json' as const,
        value: output.kind === 'file' ? { fileId: output.id, name: output.name, size: output.size, note: 'The user downloads it from the file card; do not paste its contents.' } : { error: output.message },
      }),
    }),
};

const sheetRef = z.string().max(31).optional().describe('Sheet name; defaults to the first sheet');
const operation = z.discriminatedUnion('op', [
  z.object({ op: z.literal('set'), sheet: sheetRef, cell: z.string().regex(/^[A-Z]{1,3}[1-9]\d{0,5}$/, 'Cell like B4'), value: cell }),
  z.object({ op: z.literal('appendRow'), sheet: sheetRef, values: z.array(cell).max(100) }),
  z.object({ op: z.literal('deleteRows'), sheet: sheetRef, row: z.number().int().min(1), count: z.number().int().min(1).max(10_000) }),
  z.object({ op: z.literal('addColumn'), sheet: sheetRef, header: z.string().max(100), values: z.array(cell).max(10_000).optional() }),
  z.object({ op: z.literal('renameSheet'), sheet: z.string().max(31), name: z.string().min(1).max(31) }),
]);
type Operation = z.infer<typeof operation>;

const cellValue = (v: Cell): ExcelJS.CellValue => (typeof v === 'string' && v.startsWith('=') ? { formula: v.slice(1) } : v);

const applyOperation = (workbook: ExcelJS.Workbook, op: Operation) => {
  const sheet = op.sheet ? workbook.getWorksheet(op.sheet) : workbook.worksheets[0];
  if (!sheet) throw new Error(`No sheet called "${op.sheet}"`);
  switch (op.op) {
    case 'set':
      sheet.getCell(op.cell).value = cellValue(op.value);
      break;
    case 'appendRow':
      sheet.addRow(op.values.map(cellValue));
      break;
    case 'deleteRows':
      sheet.spliceRows(op.row, op.count);
      break;
    case 'addColumn': {
      const col = sheet.columnCount + 1;
      sheet.getRow(1).getCell(col).value = op.header;
      (op.values ?? []).forEach((v, i) => {
        sheet.getRow(i + 2).getCell(col).value = cellValue(v);
      });
      break;
    }
    case 'renameSheet':
      sheet.name = op.name;
      break;
  }
};

const sheetPreview = (sheet: ExcelJS.Worksheet): SheetSpec => {
  const cols = Math.min(sheet.columnCount, 20);
  const header = sheet.getRow(1);
  const columns = Array.from({ length: cols }, (_, i) => header.getCell(i + 1).text || `Column ${i + 1}`);
  const rows: Cell[][] = [];
  for (let r = 2; r <= Math.min(sheet.rowCount, 51); r++) {
    const row = sheet.getRow(r);
    rows.push(Array.from({ length: cols }, (_, i) => row.getCell(i + 1).text || null));
  }
  return { name: sheet.name, columns, rows };
};

const editSpreadsheetTool: AssistantToolDef = {
  name: 'edit_spreadsheet',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Edit an attached Excel or CSV file (by its file id) and save the result as a new Excel file, keeping its formatting. Address cells by the row numbers and column letters shown when the file was attached. Values starting with = are Excel formulas (e.g. "=B2+C2"); prefer formulas for calculated cells. Operations run in order.',
      inputSchema: z.object({ file: objectId, filename: z.string().max(100).optional(), operations: z.array(operation).min(1).max(200) }),
      execute: async ({ file, filename, operations }): Promise<FileResult | { kind: 'error'; message: string }> => {
        const source = await loadOwnedFile(file, ctx.caller.userId);
        if (source.mediaType !== MEDIA.xlsx && source.mediaType !== MEDIA.csv) return { kind: 'error', message: 'Only Excel (.xlsx) and CSV files can be edited.' };
        const workbook = await loadWorkbook(source);
        try {
          for (const op of operations) applyOperation(workbook, op);
        } catch (err) {
          return { kind: 'error', message: err instanceof Error ? err.message : 'Could not apply the changes.' };
        }
        const data = Buffer.from(await workbook.xlsx.writeBuffer());
        const name = safeName(filename ?? `${source.name.replace(/\.[a-z0-9]+$/i, '')} (edited)`, 'xlsx');
        const saved = await saveFile(ctx.caller.userId, name, MEDIA.xlsx, data, 'generated');
        const first = workbook.worksheets[0];
        return {
          kind: 'file',
          ...saved,
          description: `${operations.length} change${operations.length === 1 ? '' : 's'} applied to ${source.name}`,
          ...(first ? { preview: previewOf(`Preview · ${first.name}`, sheetPreview(first)) } : {}),
        };
      },
      toModelOutput: ({ output }) => ({
        type: 'json' as const,
        value: output.kind === 'file' ? { fileId: output.id, name: output.name, description: output.description, note: 'The user downloads it from the file card.' } : { error: output.message },
      }),
    }),
};

export const fileTools = [createFileTool, editSpreadsheetTool];
