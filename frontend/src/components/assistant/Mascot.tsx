import mascot from '@/assets/hr-buddy-mascot.webp';
import { cn } from '@/lib/utils';

export function Mascot({ className }: { className?: string }) {
  return <img src={mascot} alt="" aria-hidden className={cn('size-6 shrink-0 rounded-full object-cover ring-1 ring-border', className)} />;
}
