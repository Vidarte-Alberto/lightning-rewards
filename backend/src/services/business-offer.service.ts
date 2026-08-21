import { ClinkServiceError } from './clink.errors';
import { getOwnedBusiness } from './business.service';

type OfferInvoicePort = {
  requestInvoiceFromOffer(
    nofferString: string,
    amountSats: number,
    description?: string,
  ): Promise<string>;
};

const OFFER_TEST_AMOUNT_SATS = 10;
const OFFER_TEST_DESCRIPTION = 'Lightning Rewards offer test';

export const checkOwnedBusinessOffer = async (
  ownerId: string,
  offerPort: OfferInvoicePort,
) => {
  const business = await getOwnedBusiness(ownerId);

  try {
    await offerPort.requestInvoiceFromOffer(
      business.nofferString,
      OFFER_TEST_AMOUNT_SATS,
      OFFER_TEST_DESCRIPTION,
    );

    return {
      status: 'available' as const,
      checkedAt: new Date(),
    };
  } catch (error: unknown) {
    if (!(error instanceof ClinkServiceError)) throw error;

    const invalid = error.code === 'CLINK_INVALID_NOFFER';
    return {
      status: 'unavailable' as const,
      code: error.code,
      message: invalid
        ? 'The saved CLINK offer is invalid.'
        : 'Lightning.Pub did not respond to the test invoice request.',
      checkedAt: new Date(),
    };
  }
};
