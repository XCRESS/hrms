import { Download, FileSpreadsheet, FileText, FileType2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDownloadAssistantFile } from '@/hooks/queries/useAssistant';
import type { FileResult } from './types';
import { ResultBlock } from './results/ResultBlock';
import { formatBytes, kindOf } from './fileKinds';

const ICONS = { sheet: FileSpreadsheet, document: FileText, pdf: FileType2, other: FileText } as const;

export function FileCard({ file }: { file: FileResult }) {
  const download = useDownloadAssistantFile();
  const kind = kindOf(file.name);
  const Icon = ICONS[kind.group];

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {kind.label} · {formatBytes(file.size)}
            {file.description ? ` · ${file.description}` : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate({ id: file.id, name: file.name })}>
          {download.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Download
        </Button>
      </div>
      {download.isError && <p className="text-xs text-destructive">This file is no longer available. Ask HR Buddy to make it again.</p>}
      {file.preview && <ResultBlock view={file.preview} />}
    </div>
  );
}
