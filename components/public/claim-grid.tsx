import Link from 'next/link';
import { PublicAttribution } from '@/components/public/attribution';
import type { PublicClaim } from '@/lib/public/types';

export function ClaimGrid({ claims }: { claims: PublicClaim[] }) {
  return (
    <div className="claim-grid">
      {claims.map((claim, index) => (
        <article className="claim-card" key={claim.claimId}>
          <div className="claim-card-index"><span>{String(index + 1).padStart(2, '0')}</span><Link href={`/day/${claim.isoDate}`} aria-label={`View ${claim.fullDate}`}>↗</Link></div>
          <Link className="claim-card-date" href={`/day/${claim.isoDate}`}>
            <span>{claim.month}</span><strong>{claim.day}</strong><span>{claim.year}</span>
          </Link>
          <div className="claim-card-copy">
            <strong>{claim.amount}</strong>
            <p><Link href={`/day/${claim.isoDate}`}>{claim.title}</Link></p>
            {claim.attribution ? <PublicAttribution className="public-attribution" value={claim.attribution} /> : <span>{claim.username ?? 'Private claim'}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
