import {
  ChainIdDecimalEnum,
  ChainIdEnum,
  EvmNetworkEnum,
} from '@/common/enums/crypto-network.enum';
import { CurrencyTypeEnum } from '@/common/enums/currency-type.enum';

type CurrencyConfig = {
  id: string;
  name: string;
  code: string;
  type: CurrencyTypeEnum;
  chainId: ChainIdEnum;
  chainIdDecimal: ChainIdDecimalEnum;
  decimals: number;
  network: string;
  networkCode: string;
  isActive: boolean;
  isToken?: boolean;
  smartContractAddress?: string;
  explorerUrl?: string;
  rpcUrl?: string;
  gasFee?: number;
  coingeckoId?: string;
};

export const cryptoCurrencies: CurrencyConfig[] = [
  {
    id: '4f8cda88-4061-4990-a7e5-f9933a01340d',
    name: 'Binance Smart Chain',
    code: 'BNB',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.BSC,
    chainIdDecimal: ChainIdDecimalEnum.BSC,
    decimals: 18,
    network: EvmNetworkEnum.BSC,
    networkCode: 'bep20',
    isActive: true,
    isToken: false,
    smartContractAddress: 'main',
    explorerUrl: 'https://bscscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/bsc/ac7ffa0f44a44b1784f55399660b6c7c',
    coingeckoId: 'binancecoin',
    gasFee: 0.000046,
  },
  {
    id: '1b6e0b3f-4295-48f7-9760-c0de20374d10',
    name: 'Tether USD',
    code: 'USDT',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.BSC,
    chainIdDecimal: ChainIdDecimalEnum.BSC,
    decimals: 18,
    network: EvmNetworkEnum.BSC,
    networkCode: 'bep20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0x55d398326f99059fF775485246999027B3197955',
    explorerUrl: 'https://bscscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/bsc/ac7ffa0f44a44b1784f55399660b6c7c',
    gasFee: 0.05,
  },
  {
    id: '3c85f182-c031-4eee-82d8-58584c71f3dc',
    name: 'USD Coin',
    code: 'USDC',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.BSC,
    chainIdDecimal: ChainIdDecimalEnum.BSC,
    decimals: 18,
    network: EvmNetworkEnum.BSC,
    networkCode: 'bep20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    explorerUrl: 'https://bscscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/bsc/ac7ffa0f44a44b1784f55399660b6c7c',
    gasFee: 0.05,
  },
  {
    id: '619aa3b6-15af-4ba9-a614-dc96f73855f6',
    name: 'BTCB Token',
    code: 'BTCB',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.BSC,
    chainIdDecimal: ChainIdDecimalEnum.BSC,
    decimals: 18,
    network: EvmNetworkEnum.BSC,
    networkCode: 'bep20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    explorerUrl: 'https://bscscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/bsc/ac7ffa0f44a44b1784f55399660b6c7c',
    gasFee: 0.00000044,
  },
  {
    id: '9d5e2417-8537-4942-9f01-0309275b322a',
    name: 'Leht',
    code: 'LEHT',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.BSC,
    chainIdDecimal: ChainIdDecimalEnum.BSC,
    decimals: 8,
    network: EvmNetworkEnum.BSC,
    networkCode: 'bep20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0x5EC3d946d57EcF07dF23309e5419480f6ef2138e',
    explorerUrl: 'https://bscscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/bsc/ac7ffa0f44a44b1784f55399660b6c7c',
    gasFee: 1,
  },
  {
    id: '2244b448-7bd3-4631-8c2f-5e0efacd5ea2',
    name: 'Ethereum',
    code: 'ETH',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.ETHEREUM,
    chainIdDecimal: ChainIdDecimalEnum.ETHEREUM,
    decimals: 18,
    network: EvmNetworkEnum.ETHEREUM,
    networkCode: 'erc20',
    isActive: true,
    isToken: false,
    smartContractAddress: 'main',
    explorerUrl: 'https://etherscan.io',
    rpcUrl:
      'https://site1.moralis-nodes.com/eth/8030a9a748b1436da20078a88641282f',
    coingeckoId: 'ethereum',
    gasFee: 0.000013,
  },
  {
    id: '78f5b273-2897-4748-9101-1e3667acd033',
    name: 'Tether USD',
    code: 'USDT',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.ETHEREUM,
    chainIdDecimal: ChainIdDecimalEnum.ETHEREUM,
    decimals: 6,
    network: EvmNetworkEnum.ETHEREUM,
    networkCode: 'erc20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    explorerUrl: 'https://etherscan.io',
    rpcUrl:
      'https://site1.moralis-nodes.com/eth/8030a9a748b1436da20078a88641282f',
    gasFee: 0.05,
  },
  {
    id: '11c3b228-168f-4f3f-82d2-d86b65452737',
    name: 'USD Coin',
    code: 'USDC',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.ETHEREUM,
    chainIdDecimal: ChainIdDecimalEnum.ETHEREUM,
    decimals: 6,
    network: EvmNetworkEnum.ETHEREUM,
    networkCode: 'erc20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorerUrl: 'https://etherscan.io',
    rpcUrl:
      'https://site1.moralis-nodes.com/eth/8030a9a748b1436da20078a88641282f',
    gasFee: 0.05,
  },
  // --- Polygon (MATIC) native and tokens ---
  {
    id: '5b2f0d38-3a5a-4b9b-8c8d-9f0e3f1a2b7c',
    name: 'Polygon',
    code: 'POL',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.POLYGON,
    chainIdDecimal: ChainIdDecimalEnum.POLYGON,
    decimals: 18,
    network: EvmNetworkEnum.POLYGON,
    networkCode: 'erc20',
    isActive: true,
    isToken: false,
    smartContractAddress: 'main',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/polygon/7b020135cdc3403eb37bd3b4f3e6e152',
    coingeckoId: 'matic-network',
    gasFee: 0.3,
  },
  {
    id: 'e4d0b12c-7f3e-4c9a-b9d1-9a3f5c7e8b1a',
    name: 'Tether USD',
    code: 'USDT',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.POLYGON,
    chainIdDecimal: ChainIdDecimalEnum.POLYGON,
    decimals: 6,
    network: EvmNetworkEnum.POLYGON,
    networkCode: 'erc20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0xC2132D05D31c914A87C6611C10748AEb04B58e8F',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/polygon/7b020135cdc3403eb37bd3b4f3e6e152',
    gasFee: 0.05,
  },
  {
    id: '9c8e1f2a-4b3c-4d5e-8f7a-1b2c3d4e5f60',
    name: 'USD Coin',
    code: 'USDC',
    type: CurrencyTypeEnum.CRYPTO,
    chainId: ChainIdEnum.POLYGON,
    chainIdDecimal: ChainIdDecimalEnum.POLYGON,
    decimals: 6,
    network: EvmNetworkEnum.POLYGON,
    networkCode: 'erc20',
    isActive: true,
    isToken: true,
    smartContractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl:
      'https://site1.moralis-nodes.com/polygon/7b020135cdc3403eb37bd3b4f3e6e152',
    gasFee: 0.05,
  },
];
