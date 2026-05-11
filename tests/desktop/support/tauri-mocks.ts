import { mock } from 'bun:test';

/**
 * Install comprehensive Tauri API mocks that satisfy all named exports.
 * Call this at the top of any test file that imports from @tauri-apps/api/*.
 */
export function installTauriMocks(overrides?: {
  invoke?: (...args: unknown[]) => unknown;
  listen?: (...args: unknown[]) => unknown;
  getCurrentWindow?: () => unknown;
}) {
  mock.module('@tauri-apps/api/core', () => ({
    invoke: overrides?.invoke ?? (async () => null),
    Channel: class {},
    PluginListener: class {},
    Resource: class {},
    SERIALIZE_TO_IPC_FN: Symbol('SERIALIZE_TO_IPC_FN'),
    addPluginListener: async () => ({ unregister: async () => {} }),
    checkPermissions: async () => ({}),
    convertFileSrc: (path: string) => path,
    isTauri: () => false,
    requestPermissions: async () => ({}),
    transformCallback: () => 0,
  }));

  mock.module('@tauri-apps/api/event', () => ({
    listen: overrides?.listen ?? (async () => () => {}),
    once: async () => () => {},
    emit: async () => {},
    emitTo: async () => {},
    TauriEvent: {},
  }));

  mock.module('@tauri-apps/api/window', () => ({
    getCurrentWindow: overrides?.getCurrentWindow ?? (() => ({ label: 'main' })),
    getAllWindows: () => [],
    availableMonitors: async () => [],
    currentMonitor: async () => null,
    primaryMonitor: async () => null,
    cursorPosition: async () => ({ x: 0, y: 0 }),
    monitorFromPoint: async () => null,
    Window: class {},
    CloseRequestedEvent: class {},
    LogicalPosition: class {},
    LogicalSize: class {},
    PhysicalPosition: class {},
    PhysicalSize: class {},
    Effect: {},
    EffectState: {},
    ProgressBarStatus: {},
    UserAttentionType: {},
  }));
}
