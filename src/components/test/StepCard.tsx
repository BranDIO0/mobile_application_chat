import type { ReactNode } from 'react';

interface StepCardProps {
  step: number;
  title: string;
  children: ReactNode;
}

/** Numbered card used for the four exercise steps. */
export function StepCard({ step, title, children }: StepCardProps) {
  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
