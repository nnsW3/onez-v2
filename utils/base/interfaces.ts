import {
  BorrowerOperations,
  DebtTokenOnezProxy,
  Factory,
  FeeReceiver,
  GasPool,
  ILendingPool,
  IncentiveVoting,
  LiquidationManager,
  MintableERC20,
  MockPyth,
  MultiCollateralHintHelpers,
  MultiTroveGetter,
  ONEZ,
  PriceFeedPyth,
  PrismaCore,
  PrismaToken,
  PrismaVault,
  SortedTroves,
  StabilityPool,
  TokenLocker,
  TroveManager,
  TroveManagerGetters,
  WrappedLendingCollateral,
} from "../../typechain";

export interface IExternalContracts {
  lendingPool: ILendingPool;
  pyth: MockPyth;
}

export interface ITokenContracts {
  wCollateral: WrappedLendingCollateral;
  erc20: MintableERC20;
  token: ICollateral;
}

export type ICollateral = {
  pythId: string;
  symbol: string;
  decimals: number;
  address: string;
  capacityE18: string;
  interestRateInBps: string;
};

export interface IParams {
  RPC_URL: string;
  ONEZ: string;
  PYTH_ADDRESS: string;
  COLLATERALS: ICollateral[];
  ADMIN_ADDRESS: string;
  DEPLOYER_ADDRESS: string;
  OUTPUT_FILE: string;
  GAS_PRICE: number;
  TX_CONFIRMATIONS: number;
  LAYERZERO_ENDPOINT: string;
  LENDING_POOL_ADDRESS: string;
  ETHERSCAN_BASE_URL?: string;
  NETWORK_NAME: string;

  MIN_NET_DEBT: number;
  GAS_COMPENSATION: number;
}

export type IState = {
  [key: string]: {
    abi: string;
    address: string;
    txHash: string;
    verification?: string;
  };
};

export interface ICoreContracts {
  prismaCore: PrismaCore;
  factory: Factory;
  troveManager: TroveManager;
  borrowerOperations: BorrowerOperations;
  debtTokenOnezProxy: DebtTokenOnezProxy;
  onez: ONEZ;
  gasPool: GasPool;
  liquidationManager: LiquidationManager;
  sortedTroves: SortedTroves;
  stabilityPool: StabilityPool;
  priceFeedPyth: PriceFeedPyth;
  multiCollateralHintHelpers: MultiCollateralHintHelpers;
  multiTroveGetter: MultiTroveGetter;
  troveManagerGetters: TroveManagerGetters;
}

export interface IGovContracts {
  feeReceiver: FeeReceiver;
  nullz: PrismaToken;
  tokenLocker: TokenLocker;
  incentiveVoting: IncentiveVoting;
  prismaVault: PrismaVault;
}
