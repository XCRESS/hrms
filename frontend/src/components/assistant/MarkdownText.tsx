import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { CITATION_MARKERS, SUGGESTIONS_LINE } from './text';

const preprocess = (text: string) => text.replace(CITATION_MARKERS, '').replace(SUGGESTIONS_LINE, '');

const components = {
  p: ({ className, ...props }: ComponentProps<'p'>) => <p className={cn('leading-7 [&:not(:first-child)]:mt-3', className)} {...props} />,
  a: ({ className, ...props }: ComponentProps<'a'>) => (
    <a className={cn('font-medium text-primary underline underline-offset-4', className)} target="_blank" rel="noreferrer" {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<'ul'>) => <ul className={cn('my-3 ml-5 list-disc space-y-1', className)} {...props} />,
  ol: ({ className, ...props }: ComponentProps<'ol'>) => <ol className={cn('my-3 ml-5 list-decimal space-y-1', className)} {...props} />,
  h1: ({ className, ...props }: ComponentProps<'h1'>) => <h3 className={cn('mt-4 mb-2 text-base font-semibold', className)} {...props} />,
  h2: ({ className, ...props }: ComponentProps<'h2'>) => <h3 className={cn('mt-4 mb-2 text-base font-semibold', className)} {...props} />,
  h3: ({ className, ...props }: ComponentProps<'h3'>) => <h4 className={cn('mt-3 mb-1 font-semibold', className)} {...props} />,
  code: ({ className, ...props }: ComponentProps<'code'>) => <code className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]', className)} {...props} />,
  pre: ({ className, ...props }: ComponentProps<'pre'>) => <pre className={cn('my-3 overflow-x-auto rounded-lg bg-muted p-3 text-sm', className)} {...props} />,
  blockquote: ({ className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote className={cn('my-3 border-l-2 border-border pl-3 text-muted-foreground', className)} {...props} />
  ),
};

export function MarkdownText() {
  return <MarkdownTextPrimitive preprocess={preprocess} smooth className="text-[15px] text-foreground" components={components} />;
}
