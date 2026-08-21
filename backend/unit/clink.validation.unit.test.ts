import {
  clinkFormatMessage,
  hasClinkPrefix,
} from '../src/auth/clink.validation';

test.each([
  ['noffer1abc', 'noffer'],
  ['ndebit1abc', 'ndebit'],
] as const)('accepts a valid %s pointer', (value, type) => {
  expect(hasClinkPrefix(value, type)).toBe(true);
});

test.each([
  ['npub1abc', 'noffer'],
  ['ndebit1abc', 'noffer'],
  ['noffer1abc', 'ndebit'],
  ['NDEBIT1abc', 'ndebit'],
] as const)('rejects %s as a %s pointer', (value, type) => {
  expect(hasClinkPrefix(value, type)).toBe(false);
});

test('returns a clear onboarding error message', () => {
  expect(clinkFormatMessage('ndebitString', 'ndebit')).toBe(
    'ndebitString must be a CLINK ndebit starting with ndebit1',
  );
});
