export type PlatformIdentityPort = {
  getPlatformIdentity(): Promise<{
    publicKeyHex: string;
    npub: string;
  }>;
};

const RECOMMENDED_MONTHLY_BUDGET_SATS = 20_000;

export const getCustomerClinkSetup = async (identityPort: PlatformIdentityPort) => ({
  identity: await identityPort.getPlatformIdentity(),
  recommendedBudget: {
    amountSats: RECOMMENDED_MONTHLY_BUDGET_SATS,
    frequency: 'monthly' as const,
  },
});
