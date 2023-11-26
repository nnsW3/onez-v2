import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import {
  ICollateral,
  ICoreContractsTestnet,
  INullzContracts,
  IParams,
} from "./interfaces";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";
import {
  ActivePool,
  BorrowerOperations,
  CollSurplusPool,
  CommunityIssuance,
  DefaultPool,
  GasPool,
  Governance,
  HintHelpers,
  MintableERC20,
  MockLendingPool,
  MockPyth,
  MultiTroveGetter,
  NULLZ,
  ONEZ,
  PriceFeed,
  SortedTroves,
  StabilityPool,
  TroveManagerTester,
} from "../output/typechain";
import { ITestnetWallet } from "../test/utils/wallets";
import BaseDeploymentHelper from "./BaseDeploymentHelper";

const maxBytes32 = "0x" + "f".repeat(64);

export default class HardhatDeploymentHelper extends BaseDeploymentHelper {
  constructor(configParams: IParams, who: ITestnetWallet) {
    super(
      configParams,
      new Deployer(hre, new Wallet(who.privateKey)),
      hre,
      true
    );
  }

  async deployLiquityCore(token: ICollateral): Promise<ICoreContractsTestnet> {
    const weth = await this._deploy<MintableERC20>("MintableERC20", "", [
      token.symbol,
      token.symbol,
      token.decimals,
    ]);

    token.address = weth.address;

    const lendingPool = await this.deployMockLendingPool(weth.address);
    const pyth = await this.deployMockPyth(token);

    const activePool = await this._deploy<ActivePool>("ActivePool");
    const borrowerOperations = await this._deploy<BorrowerOperations>(
      "BorrowerOperations"
    );
    const collSurplusPool = await this._deploy<CollSurplusPool>(
      "CollSurplusPool"
    );
    const defaultPool = await this._deploy<DefaultPool>("DefaultPool");
    const gasPool = await this._deploy<GasPool>("GasPool");
    const governance = await this._deploy<Governance>("Governance");
    const hintHelpers = await this._deploy<HintHelpers>("HintHelpers");
    const multiTroveGetter = await this._deploy<MultiTroveGetter>(
      "MultiTroveGetter"
    );
    const onez = await this._deploy<ONEZ>(`ONEZ`);
    const priceFeed = await this._deploy<PriceFeed>("PriceFeed");
    const sortedTroves = await this._deploy<SortedTroves>("SortedTroves");
    const stabilityPool = await this._deploy<StabilityPool>("StabilityPool");
    const troveManager = await this._deploy<TroveManagerTester>(
      "TroveManagerTester"
    );

    return {
      onez,
      pyth,
      governance,
      weth,
      lendingPool,
      sortedTroves,
      troveManager,
      activePool,
      stabilityPool,
      gasPool,
      defaultPool,
      collSurplusPool,
      borrowerOperations,
      hintHelpers,
      multiTroveGetter,
      priceFeed,
    };
  }

  async deployNULLZContracts(): Promise<INullzContracts> {
    const nullz = await this._deploy<NULLZ>("NULLZ");
    const communityIssuance = await this._deploy<CommunityIssuance>(
      `CommunityIssuance`
    );

    return {
      communityIssuance,
      nullz,
    };
  }

  async deployMockLendingPool(tokenAddress: string) {
    const pool = await this._deploy(`MockLendingPool`);
    await pool.initReserve(tokenAddress);
    return pool as MockLendingPool;
  }

  async deployMockPyth(token: ICollateral) {
    const pyth = (await this._deploy(`MockPyth`)) as MockPyth;
    await pyth.setPrice(token.pythId, 1800 * 1e8, -8);
    return pyth;
  }

  // --- Connector methods ---

  async connectCoreContracts(
    core: ICoreContractsTestnet,
    gov: INullzContracts,
    token: ICollateral
  ) {
    await this._init("", core.priceFeed, [
      core.pyth.address, // address _pyth,
      token.pythId, // bytes32 _priceId,
      token.decimals, // uint8 _assetDecimals
    ]);

    await this._init("", core.governance, [
      this.config.ADMIN_ADDRESS,
      core.troveManager.address,
      core.borrowerOperations.address,
      core.priceFeed.address,
      this.config.DEPLOYER_ADDRESS,
    ]);

    await this._init("", core.sortedTroves, [
      maxBytes32,
      core.troveManager.address,
      core.borrowerOperations.address,
    ]);

    await this._init("", core.troveManager, [
      core.borrowerOperations.address,
      core.activePool.address,
      core.defaultPool.address,
      core.stabilityPool.address,
      core.gasPool.address,
      core.collSurplusPool.address,
      core.onez.address,
      core.sortedTroves.address,
      core.governance.address,
      token.address,
    ]);

    await this._init("", core.borrowerOperations, [
      core.troveManager.address,
      core.activePool.address,
      core.defaultPool.address,
      core.stabilityPool.address,
      core.gasPool.address,
      core.collSurplusPool.address,
      core.sortedTroves.address,
      core.onez.address,
      token.address,
      core.governance.address,
    ]);

    await this._init("", core.stabilityPool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.activePool.address,
      core.onez.address,
      core.sortedTroves.address,
      token.address,
      core.governance.address,
    ]);

    await this._init("", core.activePool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.stabilityPool.address,
      core.defaultPool.address,
      core.collSurplusPool.address,
      core.lendingPool.address,
      token.address,
    ]);

    await this._init("", core.defaultPool, [
      core.troveManager.address,
      core.activePool.address,
      token.address,
    ]);

    await this._init("", core.gasPool, [
      core.onez.address,
      core.troveManager.address,
      core.borrowerOperations.address,
    ]);

    await this._init("", core.multiTroveGetter, [
      core.troveManager.address,
      core.sortedTroves.address,
    ]);

    await this._init("", core.collSurplusPool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.activePool.address,
      token.address,
    ]);

    await this._init("", core.hintHelpers, [
      core.sortedTroves.address,
      core.troveManager.address,
    ]);

    await this._init("", gov.communityIssuance, [
      gov.nullz.address,
      core.stabilityPool.address,
      86400 * 30,
    ]);

    await this.addONEZFacilitator(core, token);
  }

  private async addONEZFacilitator(
    core: ICoreContractsTestnet,
    token: ICollateral
  ) {
    await this.sendAndWaitForTransaction(
      core.onez.addFacilitator(
        core.borrowerOperations.address, // address facilitatorAddress,
        `trove-${token}`, // string calldata facilitatorLabel,
        token.capacityE18 // uint128 bucketCapacity
      )
    );
  }
}
