import { CoinGeckoService } from '../src/services/coingecko.service';

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('converts MXN cents to sats and caches the CoinGecko rate', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ bitcoin: { mxn: 2_000_000, last_updated_at: 1_787_272_000 } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const service = new CoinGeckoService({ apiKey: 'demo-key', cacheMilliseconds: 60_000 });

  await expect(service.convertMxnToSats(10_000)).resolves.toMatchObject({
    amountSats: 5_000,
    btcMxnRate: 2_000_000,
  });
  await service.convertMxnToSats(20_000);

  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('ids=bitcoin&vs_currencies=mxn'),
    expect.objectContaining({
      headers: { 'x-cg-demo-api-key': 'demo-key' },
    }),
  );
});

test('rejects an invalid response instead of calculating an unsafe price', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ bitcoin: {} })));

  await expect(new CoinGeckoService().convertMxnToSats(5_000)).rejects.toThrow(
    'invalid BTC/MXN rate',
  );
});
