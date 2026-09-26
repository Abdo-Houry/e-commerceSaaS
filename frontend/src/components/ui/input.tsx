import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-md border border-n-300 bg-n-0 px-4 text-body-lg text-n-900 transition-colors placeholder:text-n-500 hover:border-n-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-n-100 aria-invalid:border-danger aria-invalid:focus:ring-status-cancelled-bg';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, 'min-h-12', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(fieldBase, 'min-h-24 resize-y py-3', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'min-h-12 cursor-pointer appearance-none bg-no-repeat pe-10', className)} {...props}>
      {children}
    </select>
  ),
);
NativeSelect.displayName = 'NativeSelect';
