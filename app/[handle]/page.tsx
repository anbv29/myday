import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClaimGrid } from '@/components/public/claim-grid';
import { DataEmptyState } from '@/components/public/data-state';
import { PublicPage } from '@/components/public/public-page';
import { usernameSchema } from '@/lib/validation/username';
import { getPublicProfile } from '@/server/public-data';

type Props = { params: Promise<{ handle: string }> };

function parseHandle(handle: string) {
  let decoded = handle;
  try {
    decoded = decodeURIComponent(handle);
  } catch {
    return null;
  }
  if (!decoded.startsWith('@')) return null;
  const parsed = usernameSchema.safeParse(decoded.slice(1));
  return parsed.success ? parsed.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const username = parseHandle(handle);
  if (!username) return { title: 'Profile not found' };
  const result = await getPublicProfile(username);
  if (!result.data) return { title: 'Profile not found' };
  const profile = result.data;
  return {
    title: profile.username,
    description: profile.bio ?? `${profile.username}'s public dates on MYDAY.LOL.`,
    openGraph: { title: `${profile.username} — MYDAY.LOL`, description: profile.bio ?? `${profile.publicClaimCount} public date claims.` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const username = parseHandle(handle);
  if (!username) notFound();
  const result = await getPublicProfile(username);
  if (!result.data) notFound();
  const profile = result.data;
  const initials = (profile.displayName ?? profile.username).replace('@', '').slice(0, 2).toUpperCase();

  return (
    <PublicPage source={result.source}>
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div>
          <p className="eyebrow">Public collector</p>
          <h1>{profile.username}</h1>
          {profile.displayName ? <strong>{profile.displayName}</strong> : null}
          <p>{profile.bio ?? 'This collector has not added a public bio.'}</p>
        </div>
        <dl>
          <div><dt>Public dates</dt><dd>{profile.publicClaimCount}</dd></div>
          <div><dt>Highest claim</dt><dd>{profile.highestClaim}</dd></div>
        </dl>
      </section>
      <section className="profile-claims">
        <div className="section-line"><p className="eyebrow">Current record</p><span>{profile.claims.length} shown</span></div>
        {profile.claims.length ? <ClaimGrid claims={profile.claims} /> : <DataEmptyState title="No public dates." message="This profile does not currently hold a public date claim." />}
      </section>
    </PublicPage>
  );
}
