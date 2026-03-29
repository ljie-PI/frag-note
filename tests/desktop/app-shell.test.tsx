import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../apps/desktop/src/app/App.tsx';
import type { ExtendedDesktopApiClient } from '../../apps/desktop/src/lib/api-client.ts';

function createDesktopApiClientStub(): ExtendedDesktopApiClient {
  return {
    async ingestFragment(payload) {
      return {
        fragmentId: payload.fragmentId,
        status: 'processing',
      };
    },
    async getFragmentDetail() {
      return null;
    },
    async listCandidates() {
      return [];
    },
    async reviewCandidate() {
      throw new Error('not implemented in render test');
    },
    async search() {
      throw new Error('not implemented in render test');
    },
    async saveAnswerAsFragment() {
      throw new Error('not implemented in render test');
    },
  };
}

describe('desktop app shell', () => {
  it('renders capture, recent fragments, organization, and search surfaces', () => {
    const markup = renderToStaticMarkup(
      <App apiClient={createDesktopApiClientStub()} />,
    );

    expect(markup).toContain('Save Fragment');
    expect(markup).toContain('Recent Fragments');
    expect(markup).toContain('Organization');
    expect(markup).toContain('Search');
  });
});
