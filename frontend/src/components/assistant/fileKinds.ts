export const ATTACHMENT_ACCEPT = '.pdf,.xlsx,.csv,.docx,.txt,.png,.jpg,.jpeg';

const KINDS: Record<string, { label: string; group: 'sheet' | 'document' | 'pdf' | 'other' }> = {
  xlsx: { label: 'Excel', group: 'sheet' },
  csv: { label: 'CSV', group: 'sheet' },
  docx: { label: 'Word', group: 'document' },
  pdf: { label: 'PDF', group: 'pdf' },
  txt: { label: 'Text', group: 'document' },
  png: { label: 'Image', group: 'other' },
  jpg: { label: 'Image', group: 'other' },
  jpeg: { label: 'Image', group: 'other' },
};

export const kindOf = (name: string) => KINDS[name.split('.').pop()?.toLowerCase() ?? ''] ?? { label: 'File', group: 'other' as const };

export const formatBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1_048_576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`);
