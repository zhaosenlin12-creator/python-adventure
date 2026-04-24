jest.mock('@/lib/utils/friendlyError', () => ({
  showFriendlyErrorToast: jest.fn(),
}));

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
  };
}

describe('usePvpBattleRoyaleStore', () => {
  beforeEach(() => {
    jest.resetModules();
    Object.defineProperty(global, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
      writable: true,
    });
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('surfaces a friendly message when battle royale start is blocked by room capacity', async () => {
    const { usePvpBattleRoyaleStore, translateBattleRoyaleError } =
      require('@/store/pvpBattleRoyaleStore') as typeof import('@/store/pvpBattleRoyaleStore');
    const { useAuthStore } = require('@/store/authStore') as typeof import('@/store/authStore');
    const { showFriendlyErrorToast } =
      require('@/lib/utils/friendlyError') as typeof import('@/lib/utils/friendlyError');

    useAuthStore.setState({ token: 'token-123' } as any);
    usePvpBattleRoyaleStore.setState({
      currentRoom: { id: 'ROOM123' } as any,
      error: null,
    });

    ((global as any).fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Battle Royale server is busy' }),
    });

    const expectedMessage = translateBattleRoyaleError('Battle Royale server is busy');

    await expect(usePvpBattleRoyaleStore.getState().startCurrentRoom()).rejects.toThrow(expectedMessage);
    expect(usePvpBattleRoyaleStore.getState().error).toBe(expectedMessage);
    expect(showFriendlyErrorToast).toHaveBeenCalledWith(expectedMessage, '开启生存乱斗失败，请稍后再试。');
  });
});
