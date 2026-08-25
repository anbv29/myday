export default function Loading() {
  return (
    <main className="loading-state shell" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Loading the record</p>
      <div className="loading-mark">MYDAY.LOL</div>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
