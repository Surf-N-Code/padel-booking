import { ReactNode } from 'react';

interface StepProps {
  children: ReactNode;
}

interface StepHeaderProps {
  children: ReactNode;
}

interface StepTitleProps {
  children: ReactNode;
}

interface StepDescriptionProps {
  children: ReactNode;
}

interface StepContentProps {
  children: ReactNode;
}

function StepHeader({ children }: StepHeaderProps) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function StepTitle({ children }: StepTitleProps) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

function StepDescription({ children }: StepDescriptionProps) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StepContent({ children }: StepContentProps) {
  return <div>{children}</div>;
}

function Step({ children }: StepProps) {
  return (
    <li className="mb-4 last:mb-0">
      <div className="flex flex-col gap-2">{children}</div>
    </li>
  );
}

Step.Header = StepHeader;
Step.Title = StepTitle;
Step.Description = StepDescription;
Step.Content = StepContent;

function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col">{children}</ol>;
}

export { Steps, Step };
