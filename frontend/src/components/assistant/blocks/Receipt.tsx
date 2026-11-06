import { Link } from 'react-router';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { Receipt as ReceiptData } from '../types';

export function Receipt({ receipt, title, children }: { receipt: ReceiptData; title: string; children?: React.ReactNode }) {
  const at = new Date(receipt.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <section className="my-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3" aria-label={`${title} done`}>
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{receipt.summary}</p>
          <p className="text-xs text-muted-foreground">
            {title} · {at}
          </p>
          {children}
          {receipt.link && (
            <Link to={receipt.link} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Open in HRMS
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
