import { ACCESS_STATE_LABELS, type AccessState } from '@matjari/shared';
import { cn } from '@/lib/utils';

const styles: Record<AccessState, string> = {
  trial: 'bg-status-new-bg text-status-new-fg',
  active: 'bg-status-delivered-bg text-status-delivered-fg',
  grace: 'bg-status-preparing-bg text-status-preparing-fg',
  expired: 'bg-status-incomplete-bg text-status-incomplete-fg ring-1 ring-n-300',
  suspended: 'bg-status-cancelled-bg text-status-cancelled-fg',
};

export function AccessBadge({ state, className }: { state: AccessState; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap', styles[state], className)}>
      {ACCESS_STATE_LABELS[state]}
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium' });
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : '—';
}
