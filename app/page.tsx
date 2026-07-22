'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    void fetch('/api/visits', { method: 'POST' })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { visits?: number } | null) => setVisits(body?.visits ?? null))
      .catch(() => setVisits(null));
  }, []);

  return (
    <main>
      <section aria-labelledby="status-title">
        <p className="eyebrow">WEEKBOX</p>
        <h1 id="status-title">Website in progress.</h1>
        <p className="subtle">A calmer place for the week ahead.</p>
        <p className="counter" aria-live="polite">
          {visits === null ? 'Loading visits…' : `${visits.toLocaleString()} ${visits === 1 ? 'visit' : 'visits'}`}
        </p>
      </section>
    </main>
  );
}
