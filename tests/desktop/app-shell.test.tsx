import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../apps/desktop/src/app/App.tsx';

describe('desktop app shell', () => {
  it('renders capture, recent fragments, organization, and search surfaces', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Save Fragment');
    expect(markup).toContain('Recent Fragments');
    expect(markup).toContain('Organization');
    expect(markup).toContain('Search');
  });
});
