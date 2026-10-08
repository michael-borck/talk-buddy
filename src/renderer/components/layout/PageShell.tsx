// The page shell vocabulary.
//
// Every page opens the same way — a title block, a spinner while it loads,
// a centred card when there is nothing to show. Each of those was
// re-typed per page, so a spacing or colour fix meant finding every copy.
// These are the shared shapes; the page-specific markup (filters, lists,
// buttons) stays with the page.
//
// Classes are deliberately the ones already in use, so adopting these
// changes no page's appearance.
import { ReactNode } from 'react';

// Page title, optional subtitle, and optional trailing actions.
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// Full-height centred spinner. `label` says what is arriving, so a slow load
// doesn't read as a hung app.
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{label}</p>
      </div>
    </div>
  );
}

// The centred card shown when a list has nothing in it. `message` is the
// reason it's empty; anything else (a way out of it, extra guidance) goes in
// children.
export function EmptyState({
  icon,
  message,
  children,
}: {
  icon?: ReactNode;
  message: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      {icon && <div className="flex justify-center text-gray-400 mb-4">{icon}</div>}
      <p className="text-gray-600 mb-4">{message}</p>
      {children}
    </div>
  );
}
