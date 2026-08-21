import { getCustomerClinkSetup } from '../src/services/customer-clink.service';

test('returns the stable app identity and recommended monthly budget', async () => {
  const getPlatformIdentity = vi.fn().mockResolvedValue({
    publicKeyHex: 'ab'.repeat(32),
    npub: 'npub1lightningrewards',
  });

  await expect(getCustomerClinkSetup({ getPlatformIdentity })).resolves.toEqual({
    identity: {
      publicKeyHex: 'ab'.repeat(32),
      npub: 'npub1lightningrewards',
    },
    recommendedBudget: {
      amountSats: 20_000,
      frequency: 'monthly',
    },
  });
  expect(getPlatformIdentity).toHaveBeenCalledOnce();
});
