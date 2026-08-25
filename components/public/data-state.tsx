import type { PublicDataSource } from '@/lib/public/types';

export function DataSourceRibbon({ source }: { source: PublicDataSource }) {
  if (source !== 'preview') return null;
  return (
    <div className="preview-ribbon" role="status">
      <span>Development preview</span>
      <span>Sample records · connect Supabase for live data</span>
    </div>
  );
}

export function DataEmptyState({
  title,
  message,
  unavailable = false,
}: {
  title: string;
  message: string;
  unavailable?: boolean;
}) {
  return (
    <div className="data-empty" role={unavailable ? 'alert' : 'status'}>
      <p className="eyebrow">{unavailable ? 'Connection state' : 'Nothing here yet'}</p>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
