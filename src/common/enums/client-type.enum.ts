export const CLIENT_ORDERABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'email',
  'verified',
  'isBlocked',
  'withdrawBlocked',
] as const;

export type ClientOrderableField = (typeof CLIENT_ORDERABLE_FIELDS)[number];
