import { PDFDocument, PageSizes, StandardFonts, degrees, grayscale } from 'pdf-lib';
import { ValidationError } from '../../utils/errors.js';

const STAMP_SIZE = 110;
const SIZE_TOLERANCE_PT = 2;

export type PageSize = 'A4' | 'Letter';

const PAGE_SIZES: Record<PageSize, [number, number]> = { A4: PageSizes.A4, Letter: PageSizes.Letter };

/** The letterhead's page size; it must be exactly one portrait A4 or US Letter page. */
export const letterheadPageSize = async (data: Buffer): Promise<PageSize> => {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(data);
  } catch {
    throw new ValidationError('Letterhead file is not a readable PDF');
  }
  const page = pdf.getPageCount() === 1 ? pdf.getPage(0).getSize() : null;
  const size = page
    ? (Object.keys(PAGE_SIZES) as PageSize[]).find((name) => {
        const [width, height] = PAGE_SIZES[name];
        return Math.abs(page.width - width) <= SIZE_TOLERANCE_PT && Math.abs(page.height - height) <= SIZE_TOLERANCE_PT;
      })
    : undefined;
  if (!size) throw new ValidationError('Letterhead must be a single A4 or US Letter page');
  return size;
};

/**
 * Draws the letterhead's first page underneath every content page and, for
 * drafts, a diagonal "DRAFT" across each page. Content pages must have a
 * transparent background (Gotenberg `omitBackground`).
 */
export const composeLetterPdf = async (content: Buffer, { letterhead, draft }: { letterhead?: Buffer; draft?: boolean }): Promise<Buffer> => {
  if (!letterhead && !draft) return content;

  const out = await PDFDocument.create();
  const pages = await out.embedPdf(content, (await PDFDocument.load(content)).getPageIndices());
  const [background] = letterhead ? await out.embedPdf(letterhead, [0]) : [];
  const font = draft ? await out.embedFont(StandardFonts.HelveticaBold) : undefined;

  for (const embedded of pages) {
    const { width, height } = embedded;
    const page = out.addPage([width, height]);
    if (background) page.drawPage(background, { x: 0, y: 0, width, height });
    page.drawPage(embedded, { x: 0, y: 0 });
    if (font) {
      const textWidth = font.widthOfTextAtSize('DRAFT', STAMP_SIZE);
      const offset = textWidth / 2 / Math.SQRT2;
      page.drawText('DRAFT', {
        x: width / 2 - offset + STAMP_SIZE / 4,
        y: height / 2 - offset - STAMP_SIZE / 4,
        size: STAMP_SIZE,
        font,
        color: grayscale(0.5),
        opacity: 0.18,
        rotate: degrees(45),
      });
    }
  }
  return Buffer.from(await out.save());
};
