export type ClinkPointerType = 'noffer' | 'ndebit';

const clinkPrefixes: Record<ClinkPointerType, `${ClinkPointerType}1`> = {
  noffer: 'noffer1',
  ndebit: 'ndebit1',
};

export const hasClinkPrefix = (value: string, type: ClinkPointerType) =>
  value.startsWith(clinkPrefixes[type]);

export const clinkFormatMessage = (field: string, type: ClinkPointerType) =>
  `${field} must be a CLINK ${type} starting with ${clinkPrefixes[type]}`;
