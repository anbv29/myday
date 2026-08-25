import Link from 'next/link';
import type { PublicClaim } from '@/lib/public/types';

export function ClaimGrid({ claims }: { claims: PublicClaim[] }) {
  return (
    <div className="claim-grid">
      {claims.map((claim, index) => (
        <Link className="claim-card" href={`/day/${claim.isoDate}`} key={claim.claimId}>
          <div className="claim-card-index"><span>{String(index + 1).padStart(2, '0')}</span><span>↗</span></div>
          <div className="claim-card-date">
            <span>{claim.month}</span><strong>{claim.day}</strong><span>{claim.year}</span>
          </div>
          <div className="claim-card-copy">
            <strong>{claim.amount}</strong>
            <p>{claim.title}</p>
            <span>{claim.attribution ?? claim.username ?? 'Private claim'}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
