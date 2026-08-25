import { publicAttributionHref } from '@/lib/public/attribution';

export function PublicAttribution({ value, className }: { value: string | null; className?: string }) {
  if (!value) return null;
  const href = publicAttributionHref(value);
  if (!href) return <span className={className}>{value}</span>;
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer nofollow ugc">{value}</a>;
}
