import {
  ActivePool,
  BorrowerOperations,
  CollSurplusPool,
  CommunityIssuance,
  DefaultPool,
  GasPool,
  Governance,
  HintHelpers,
  ILendingPool,
  MintableERC20,
  MockLendingPool,
  MockPyth,
  MultiTroveGetter,
  NULLZ,
  ONEZ,
  PriceFeed,
  SortedTroves,
  StabilityPool,
  TroveManager,
  TroveManagerTester,
} from "../output/typechain";

export type ICollateral = {
  pythId: string;
  symbol: string;
  decimals: number;
  address: string;
  capacityE18: string;
};

export interface IParams {
  RPC_URL: string;
  PYTH_ADDRESS: string;
  COLLATERALS: ICollateral[];
  ADMIN_ADDRESS: string;
  DEPLOYER_ADDRESS: string;
  OUTPUT_FILE: string;
  GAS_PRICE: number;
  TX_CONFIRMATIONS: number;
  LENDING_POOL_ADDRESS: string;
  ETHERSCAN_BASE_URL?: string;
  NETWORK_NAME: string;
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
  onez: ONEZ;
  governance: Governance;
  sortedTroves: SortedTroves;
  troveManager: TroveManager;
  activePool: ActivePool;
  stabilityPool: StabilityPool;
  gasPool: GasPool;
  defaultPool: DefaultPool;
  collSurplusPool: CollSurplusPool;
  borrowerOperations: BorrowerOperations;
  hintHelpers: HintHelpers;
  multiTroveGetter: MultiTroveGetter;
  priceFeed: PriceFeed;
  lendingPool: ILendingPool;
}

export interface ICoreContractsTestnet extends ICoreContracts {
  troveManager: TroveManagerTester;
  lendingPool: MockLendingPool;
  weth: MintableERC20;
  pyth: MockPyth;
}

export type INullzContracts = {
  nullz: NULLZ;
  communityIssuance: CommunityIssuance;
};
