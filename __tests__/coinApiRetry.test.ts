import { getCoinsBalance, getCoinsHistory } from '@/lib/api/coinAPI';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('coinAPI transient retry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('retries balance read on transient 503 and then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { detail: 'busy' }))
      .mockResolvedValueOnce(jsonResponse(200, { coins: 88 }));

    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getCoinsBalance('test-token')).resolves.toBe(88);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('retries history read on transient 503 and then succeeds', async () => {
    const transactions = [{ id: 1, amount: 10, source: 'code_research' }];
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { detail: 'busy' }))
      .mockResolvedValueOnce(jsonResponse(200, { transactions }));

    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getCoinsHistory('test-token', 10)).resolves.toEqual(transactions);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('does not retry unauthorized balance read', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse(401, { detail: 'unauthorized' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getCoinsBalance('test-token')).rejects.toThrow('unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
