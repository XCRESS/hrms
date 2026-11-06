import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { Cell, ColumnKind } from '../views.js';

export interface SheetSpec { name: string; columns: string[]; kinds?: (ColumnKind | undefined)[]; rows: Cell[][] }
export interface TableSpec { columns: string[]; rows: Cell[][] }
export interface SectionSpec { heading?: string; paragraphs?: string[]; bullets?: string[]; table?: TableSpec }
export interface DocumentSpec { title: string; sections: SectionSpec[] }

const NUMBER_FORMATS: Partial<Record<ColumnKind, string>> = { currency: '₹#,##0', hours: '0.0', number: '#,##0.##' };

export const buildXlsx = async (sheets: SheetSpec[]): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1');
    sheet.addRow(spec.columns);
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const row of spec.rows) sheet.addRow(row.map((v) => (v === null ? '' : v)));
    spec.columns.forEach((header, i) => {
      const column = sheet.getColumn(i + 1);
      const longest = Math.max(header.length, ...spec.rows.slice(0, 500).map((r) => String(r[i] ?? '').length));
      column.width = Math.min(Math.max(longest + 2, 8), 60);
      const format = spec.kinds?.[i] && NUMBER_FORMATS[spec.kinds[i]!];
      if (format) column.numFmt = format;
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const csvCell = (v: Cell) => {
  const s = v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Lets Excel open the CSV as UTF-8 (₹ and names render correctly).
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

export const buildCsv = (sheet: SheetSpec): Buffer =>
  Buffer.from(`${BYTE_ORDER_MARK}${[sheet.columns, ...sheet.rows].map((r) => r.map(csvCell).join(',')).join('\n')}`, 'utf8');

const docxTable = (table: TableSpec) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: table.columns.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] })) }),
      ...table.rows.map(
        (row) => new TableRow({ children: table.columns.map((_, i) => new TableCell({ children: [new Paragraph(String(row[i] ?? ''))] })) })
      ),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });

export const buildDocx = async (spec: DocumentSpec): Promise<Buffer> => {
  const children: (Paragraph | Table)[] = [new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT })];
  for (const section of spec.sections) {
    if (section.heading) children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    for (const p of section.paragraphs ?? []) children.push(new Paragraph({ text: p, spacing: { after: 120 } }));
    for (const b of section.bullets ?? []) children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
    if (section.table) children.push(docxTable(section.table), new Paragraph(''));
  }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })));
};

// The built-in PDF fonts have no rupee glyph.
const pdfText = (s: string) => s.replace(/₹\s?/g, 'Rs. ');

export const buildPdf = (spec: DocumentSpec, { landscape = false }: { landscape?: boolean } = {}): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: landscape ? 'landscape' : 'portrait', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - 100;
    doc.font('Helvetica-Bold').fontSize(18).text(pdfText(spec.title));
    doc.moveDown(0.8);
    for (const section of spec.sections) {
      if (section.heading) doc.font('Helvetica-Bold').fontSize(13).text(pdfText(section.heading)).moveDown(0.3);
      doc.font('Helvetica').fontSize(10.5);
      for (const p of section.paragraphs ?? []) doc.text(pdfText(p), { align: 'left' }).moveDown(0.5);
      for (const b of section.bullets ?? []) doc.text(`•  ${pdfText(b)}`, { indent: 10 }).moveDown(0.2);
      if (section.table) {
        const colWidth = width / Math.max(section.table.columns.length, 1);
        const drawRow = (cells: string[], bold: boolean) => {
          if (doc.y > doc.page.height - 80) doc.addPage();
          const y = doc.y;
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
          const heights = cells.map((c) => doc.heightOfString(pdfText(c), { width: colWidth - 6 }));
          cells.forEach((c, i) => doc.text(pdfText(c), 50 + i * colWidth, y, { width: colWidth - 6 }));
          const bottom = y + Math.max(...heights) + 4;
          doc.moveTo(50, bottom).lineTo(50 + width, bottom).strokeColor('#dddddd').lineWidth(0.5).stroke();
          doc.x = 50;
          doc.y = bottom + 3;
        };
        drawRow(section.table.columns, true);
        for (const row of section.table.rows) drawRow(section.table.columns.map((_, i) => String(row[i] ?? '')), false);
        doc.moveDown(0.6);
      }
      doc.moveDown(0.4);
    }
    doc.end();
  });
