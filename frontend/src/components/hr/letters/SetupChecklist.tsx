import { Link } from 'react-router';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step {
  done: boolean;
  title: string;
  detail: string;
  to: string;
  action: string;
}

/** Shown until the first letter exists: letterhead → template → letter, in that order. */
export const SetupChecklist = ({ hasLetterhead, hasTemplate }: { hasLetterhead: boolean; hasTemplate: boolean }) => {
  const steps: Step[] = [
    { done: hasLetterhead, title: 'Set up a letterhead', detail: 'Upload the company’s letterhead PDF and the signatory. Letters can’t be issued without it.', to: '/letters/letterheads', action: 'Set up letterhead' },
    { done: hasTemplate, title: 'Create a template', detail: 'Write the letter once, or import your Word file, and add fields for the details that change.', to: '/letters/templates/new', action: 'Create template' },
    { done: false, title: 'Issue your first letter', detail: 'Pick a template and a person, check the values, preview, then issue and send.', to: '/letters/new', action: 'New letter' },
  ];
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="rounded-lg border border-border bg-card p-4 md:p-6" aria-labelledby="setup-heading">
      <h2 id="setup-heading" className="font-semibold">Get started with letters</h2>
      <p className="mt-1 text-sm text-muted-foreground">Three steps, once per company. After that, issuing a letter takes a minute.</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className={cn('flex flex-wrap items-start gap-3 rounded-md p-3', index === next && 'bg-muted/60')}>
            {step.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Done" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label="Not done" />}
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', step.done && 'text-muted-foreground line-through')}>{index + 1}. {step.title}</p>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
            </div>
            {index === next && (
              <Button asChild size="sm">
                <Link to={step.to}>{step.action}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
