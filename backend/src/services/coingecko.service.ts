const SATS_PER_BITCOIN = 100_000_000;
const CENTS_PER_MXN = 100;

export type MxnConversion = {
  amountSats: number;
  btcMxnRate: number;
  rateUpdatedAt: Date;
};

export type MxnPriceConverter = {
  convertMxnToSats(priceMxnCents: number): Promise<MxnConversion>;
};

type CoinGeckoServiceOptions = {
  apiKey?: string;
  cacheMilliseconds?: number;
  timeoutMilliseconds?: number;
};

type CachedRate = {
  btcMxnRate: number;
  rateUpdatedAt: Date;
  expiresAt: number;
};

export class CoinGeckoService implements MxnPriceConverter {
  private cachedRate?: CachedRate;

  constructor(private readonly options: CoinGeckoServiceOptions = {}) {}

  async convertMxnToSats(priceMxnCents: number): Promise<MxnConversion> {
    if (!Number.isSafeInteger(priceMxnCents) || priceMxnCents <= 0) {
      throw new Error('The MXN amount must be a positive number of cents.');
    }

    const rate = await this.getBtcMxnRate();
    const amountSats = Math.ceil(
      (priceMxnCents * SATS_PER_BITCOIN) / (CENTS_PER_MXN * rate.btcMxnRate),
    );

    if (!Number.isSafeInteger(amountSats) || amountSats <= 0 || amountSats > 2_147_483_647) {
      throw new Error('The converted amount is outside the supported sats range.');
    }

    return { amountSats, ...rate };
  }

  private async getBtcMxnRate() {
    if (this.cachedRate && this.cachedRate.expiresAt > Date.now()) {
      return {
        btcMxnRate: this.cachedRate.btcMxnRate,
        rateUpdatedAt: this.cachedRate.rateUpdatedAt,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMilliseconds ?? 5_000,
    );

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=mxn&include_last_updated_at=true',
        {
          headers: this.options.apiKey
            ? { 'x-cg-demo-api-key': this.options.apiKey }
            : undefined,
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`CoinGecko returned HTTP ${response.status}.`);
      }

      const body = await response.json() as {
        bitcoin?: { mxn?: unknown; last_updated_at?: unknown };
      };
      const btcMxnRate = body.bitcoin?.mxn;
      if (typeof btcMxnRate !== 'number' || !Number.isFinite(btcMxnRate) || btcMxnRate <= 0) {
        throw new Error('CoinGecko returned an invalid BTC/MXN rate.');
      }

      const reportedTimestamp = body.bitcoin?.last_updated_at;
      const rateUpdatedAt =
        typeof reportedTimestamp === 'number' && reportedTimestamp > 0
          ? new Date(reportedTimestamp * 1_000)
          : new Date();
      this.cachedRate = {
        btcMxnRate,
        rateUpdatedAt,
        expiresAt: Date.now() + (this.options.cacheMilliseconds ?? 60_000),
      };
      return { btcMxnRate, rateUpdatedAt };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CoinGecko timed out while fetching the BTC/MXN rate.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
