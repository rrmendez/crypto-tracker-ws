export enum CountryEnum {
  BR = 'BR',
  AR = 'AR',
  UY = 'UY',
  PY = 'PY',
  CL = 'CL',
  PE = 'PE',
  BO = 'BO',
  CO = 'CO',
  MX = 'MX',
  US = 'US',
  ES = 'ES',
  CU = 'CU',
}

export const CountryNames: Record<CountryEnum, string> = {
  [CountryEnum.BR]: 'Brazil',
  [CountryEnum.AR]: 'Argentina',
  [CountryEnum.UY]: 'Uruguay',
  [CountryEnum.PY]: 'Paraguay',
  [CountryEnum.CL]: 'Chile',
  [CountryEnum.PE]: 'Peru',
  [CountryEnum.BO]: 'Bolivia',
  [CountryEnum.CO]: 'Colombia',
  [CountryEnum.MX]: 'Mexico',
  [CountryEnum.US]: 'United States',
  [CountryEnum.ES]: 'Spain',
  [CountryEnum.CU]: 'Cuba',
};
