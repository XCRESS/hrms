import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, FilePlus2, FileText, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STARTER_TEMPLATES, type StarterTemplate } from './starterTemplates';

interface StarterPickerProps {
  onPick: (start: { starter?: StarterTemplate; importWord?: boolean }) => void;
}

const Card = ({ icon, title, description, onClick, highlight }: { icon: ReactNode; title: string; description: string; onClick: () => void; highlight?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'flex h-full flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
      (highlight ? 'border-primary' : 'border-border')
    }
  >
    <span className="text-primary">{icon}</span>
    <span className="font-medium">{title}</span>
    <span className="text-sm text-muted-foreground">{description}</span>
  </button>
);

/** First step of a new template: start from a Word letter you already have, a ready-made letter, or blank. */
export const StarterPicker = ({ onPick }: StarterPickerProps) => (
  <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" aria-label="Back to templates">
        <Link to="/letters/templates"><ArrowLeft className="h-4 w-4" /></Link>
      </Button>
      <h1 className="text-xl font-semibold">New template — how do you want to start?</h1>
    </div>

    <section className="grid gap-3 sm:grid-cols-2" aria-label="Start from your own letter or blank">
      <Card
        highlight
        icon={<FileUp className="h-6 w-6" />}
        title="Import a Word letter you already use"
        description="Upload a letter you sent before. Pick who it was for, and their name, code, dates and other details become fields automatically."
        onClick={() => onPick({ importWord: true })}
      />
      <Card icon={<FilePlus2 className="h-6 w-6" />} title="Blank page" description="Type the letter yourself and add fields as you go." onClick={() => onPick({})} />
    </section>

    <section className="space-y-3" aria-labelledby="starter-heading">
      <h2 id="starter-heading" className="text-sm font-semibold text-muted-foreground">Or start from a ready-made letter and change the wording</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STARTER_TEMPLATES.map((starter) => (
          <Card key={starter.id} icon={<FileText className="h-6 w-6" />} title={starter.name} description={starter.description} onClick={() => onPick({ starter })} />
        ))}
      </div>
    </section>
  </div>
);
