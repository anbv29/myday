import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DateCollection } from '@/components/date-collection';
import { buildDateCollection } from '@/lib/public/date-collection';

describe('public free registration records', () => {
  it('renders the date, story, attribution and registration timestamp', () => {
    const entries = buildDateCollection([], [{
      id: 'free-record', isoDate: '2026-06-02', title: 'A meaningful day',
      story: 'The day we started.', attribution: '@example',
      registeredAt: '2026-01-01T00:00:00Z',
    }]);
    const html = renderToStaticMarkup(<DateCollection entries={entries} id="date-records" />);
    expect(html).toContain('id="date-records"');
    expect(html).toContain('Free registration');
    expect(html).toContain('A meaningful day');
    expect(html).toContain('The day we started.');
    expect(html).toContain('@example');
    expect(html).toContain('dateTime="2026-06-02"');
    expect(html).toContain('dateTime="2026-01-01T00:00:00Z"');
    expect(html).toContain('Jan 1, 2026');
    expect(html).toContain('Free registrations</button>');
  });
  it('shows a recovery action rather than fabricated records when empty', () => {
    const html = renderToStaticMarkup(<DateCollection entries={[]} />);
    expect(html).toContain('No dates in this view yet.');
    expect(html).toContain('href="/register"');
  });
});
