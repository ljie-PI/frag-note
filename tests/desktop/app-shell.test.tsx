import { describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../apps/desktop/src/app/App.tsx';
import type { ExtendedDesktopApiClient } from '../../apps/desktop/src/lib/api-client.ts';

mock.module('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    minimize: async () => {},
    toggleMaximize: async () => {},
    close: async () => {},
  }),
}));

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
    async retryFragmentProcessing(fragmentId) {
      return {
        fragmentId,
        status: 'processing',
      };
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

    expect(markup).toContain('保存');
    expect(markup).toContain('碎片');
    expect(markup).toContain('整理');
    expect(markup).toContain('搜索');
  });
});
