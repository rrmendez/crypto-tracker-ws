export enum ChainIdEnum {
  ETHEREUM = '0x1',
  BSC = '0x38',
  BSC_TESTNET = '0x61',
  POLYGON = '0x89',
  ARBITRUM = '0xa4b1',
  OPTIMISM = '0xa',
  AVALANCHE = '0xa86a',
  // Redes de test más comunes
  GOERLI = '0x5',
  SEPOLIA = '0xaa36a7',
  MUMBAI = '0x13881',
  ARBITRUM_GOERLI = '0x66eed',
  OPTIMISM_GOERLI = '0x1a4',
  AVALANCHE_FUJI = '0xa869',
}

export enum ChainIdDecimalEnum {
  ETHEREUM = 1,
  BSC = 56,
  BSC_TESTNET = 97,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  AVALANCHE = 43114,
  // Redes de test más comunes
  GOERLI = 5,
  SEPOLIA = 11155111,
  MUMBAI = 80001,
  ARBITRUM_GOERLI = 421613,
  OPTIMISM_GOERLI = 420,
  AVALANCHE_FUJI = 43113,
}

export enum EvmNetworkEnum {
  ETHEREUM = 'ethereum',
  BSC = 'bsc',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
}

export enum SolanaNetworkEnum {
  SOLANA = 'solana',
}

export enum NearNetworkEnum {
  NEAR = 'near',
}

export enum TezosNetworkEnum {
  TEZOS = 'tezos',
}

export enum CosmosNetworkEnum {
  COSMOS = 'cosmos',
}

export enum PolkadotNetworkEnum {
  POLKADOT = 'polkadot',
}

export enum BitcoinNetworkEnum {
  BITCOIN = 'bitcoin',
}

export enum LitecoinNetworkEnum {
  LITECOIN = 'litecoin',
}

export enum DogecoinNetworkEnum {
  DOGECOIN = 'dogecoin',
}

export enum TvmNetworkEnum {
  TRON = 'tron',
}

// ---- union automática ----
export const NetworkEnum = {
  ...EvmNetworkEnum,
  ...BitcoinNetworkEnum,
  ...LitecoinNetworkEnum,
  ...DogecoinNetworkEnum,
  ...SolanaNetworkEnum,
  ...NearNetworkEnum,
  ...TezosNetworkEnum,
  ...CosmosNetworkEnum,
  ...PolkadotNetworkEnum,
  ...TvmNetworkEnum,
} as const;

// extraer el tipo si lo necesitas
// export type Network = (typeof NetworkEnum)[keyof typeof NetworkEnum];
