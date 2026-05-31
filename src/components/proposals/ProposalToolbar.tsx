import React, { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface ToolbarProps {
  className?: string;
  sticky?: boolean;
  children: ReactNode;
}

interface ToolbarLeftProps {
  className?: string;
  children: ReactNode;
}

interface ToolbarRightProps {
  className?: string;
  children: ReactNode;
}

export const ProposalToolbar = ({ className, sticky = true, children }: ToolbarProps) => {
  return (
    <div
      className={cn(
        sticky && 'sticky top-0 z-[100]',
        'bg-white border-b border-zinc-200 px-6 py-4 print:hidden',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {children}
      </div>
    </div>
  );
};

export const ToolbarLeft = ({ className, children }: ToolbarLeftProps) => {
  return (
    <div className={cn('flex items-center gap-3 min-w-0 flex-1', className)}>
      {children}
    </div>
  );
};

export const ToolbarRight = ({ className, children }: ToolbarRightProps) => {
  return (
    <div className={cn('flex items-center gap-2 shrink-0', className)}>
      {children}
    </div>
  );
};

export const ToolbarDivider = () => {
  return <div className="h-5 w-px bg-zinc-200 shrink-0" />;
};

export const ToolbarTitle = ({ children }: { children: ReactNode }) => {
  return (
    <p className="text-md font-medium text-zinc-500 truncate">
      {children}
    </p>
  );
};

export const ToolbarContent = ({ className, children }: { className?: string; children: ReactNode }) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      {children}
    </div>
  );
};
