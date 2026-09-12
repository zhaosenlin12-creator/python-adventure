import { WorldSyncService, type WorldSyncMode } from '@/lib/services/worldSync';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: ((event?: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: 'manual-close' } as CloseEvent);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  fail(code = 1011, reason = 'unstable') {
    this.readyState = MockWebSocket.CLOSED;
    this.onerror?.({} as Event);
    this.onclose?.({ code, reason } as CloseEvent);
  }

  closeFromServer(code = 1011, reason = 'unstable') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

describe('WorldSyncService', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    MockWebSocket.instances = [];
    (global as any).WebSocket = MockWebSocket;
    (global as any).window = {
      location: {
        hostname: 'game.codebn.cn',
        protocol: 'https:',
      },
    };
    (global as any).localStorage = {
      getItem: jest.fn(() => JSON.stringify({ state: { token: 'token-123' } })),
    };
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ players: [] }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('reconnects after a previously successful websocket closes', async () => {
    const modeChanges: WorldSyncMode[] = [];
    const disconnected = jest.fn();
    const service = new WorldSyncService(7, '开放世界');
    service.setCallbacks({
      onDisconnected: disconnected,
      onModeChange: (mode) => modeChanges.push(mode),
    });

    const connectPromise = service.connect();
    expect(MockWebSocket.instances).toHaveLength(1);

    const firstSocket = MockWebSocket.instances[0];
    firstSocket.open();
    await connectPromise;

    firstSocket.closeFromServer();
    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(modeChanges.at(-1)).toBe('reconnecting');

    jest.advanceTimersByTime(3000);
    expect(MockWebSocket.instances).toHaveLength(2);

    const secondSocket = MockWebSocket.instances[1];
    secondSocket.open();
    await Promise.resolve();

    expect(modeChanges.at(-1)).toBe('websocket');
  });

  test('falls back to polling after repeated reconnect failures', async () => {
    const modeChanges: WorldSyncMode[] = [];
    const service = new WorldSyncService(9, '开放世界');
    service.setCallbacks({
      onModeChange: (mode) => modeChanges.push(mode),
    });

    const connectPromise = service.connect();
    const firstSocket = MockWebSocket.instances[0];
    firstSocket.open();
    await connectPromise;

    firstSocket.closeFromServer();

    const reconnectDelays = [3000, 4500, 6750, 10125, 15000];
    for (const [index, delay] of reconnectDelays.entries()) {
      jest.advanceTimersByTime(delay);
      const reconnectSocket = MockWebSocket.instances[index + 1];
      expect(reconnectSocket).toBeDefined();
      reconnectSocket.fail();
      await Promise.resolve();
      await Promise.resolve();
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(modeChanges).toContain('polling');
    expect(service.isConnected()).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  test('accepts heartbeat pong messages without treating them as unknown', async () => {
    const service = new WorldSyncService(11, '开放世界');
    const connectPromise = service.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();
    await connectPromise;

    socket.onmessage?.({ data: JSON.stringify({ type: 'pong', data: {} }) } as MessageEvent);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('falls back quietly when the initial websocket connection fails', async () => {
    const service = new WorldSyncService(12, '开放世界');
    const connectPromise = service.connect();
    const socket = MockWebSocket.instances[0];
    socket.fail();

    await connectPromise;

    expect(warnSpy).not.toHaveBeenCalled();
    expect(service.isConnected()).toBe(true);
  });
});
