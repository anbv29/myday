import { AuctionCard } from '@/components/auctions/auction-card';
import type { PublicClaim } from '@/lib/public/types';

export function ClaimGrid({ claims }: { claims: PublicClaim[] }) {
  return (
    <div className="claim-grid">
      {claims.map((claim, index) => (
        <AuctionCard claim={claim} index={index} key={claim.claimId} />
      ))}
    </div>
  );
}
