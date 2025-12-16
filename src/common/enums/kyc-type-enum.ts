export enum KycTypeEnum {
  IDENTITY_PF = 'IDENTITY_PF',
  IDENTITY_PJ = 'IDENTITY_PJ',
}

export enum KycStatusEnum {
  REQUESTED = 'REQUESTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_REJECTED = 'PARTIALLY_REJECTED',
}

export enum KycDocumentStatusEnum {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export enum KycDocumentIdPfTypeEnum {
  RG_FRONT = 'RG_FRONT',
  RG_BACK = 'RG_BACK',
  CNH = 'CNH',
  RNE_FRONT = 'RNE_FRONT',
  RNE_BACK = 'RNE_BACK',
  PASSPORT = 'PASSPORT',
}

export enum KycDocumentIdPjTypeEnum {
  SOCIAL_CONTRACT = 'SOCIAL_CONTRACT',
}

export enum KycPhotoTypeEnum {
  SELFIE = 'SELFIE',
}

export enum KycDocumentGroupTypeEnum {
  PERSONAL_IDENTITY = 'PERSONAL_IDENTITY',
  COMPANY_IDENTITY = 'COMPANY_IDENTITY',
  PERSONAL_SELFIE = 'PERSONAL_SELFIE',
}

export const KYC_ORDERABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'status',
  'type',
] as const;

export type KycOrderableField = (typeof KYC_ORDERABLE_FIELDS)[number];
