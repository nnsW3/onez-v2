import { formatEther } from "ethers/lib/utils";
import bluebird from "bluebird";
import { ICollateral, ICoreContracts, INullzContracts } from "./interfaces";
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
  MockLendingPool,
  MultiTroveGetter,
  NULLZ,
  ONEZ,
  PriceFeed,
  SortedTroves,
  StabilityPool,
  TroveManager,
} from "../output/typechain";
import BaseDeploymentHelper from "./BaseDeploymentHelper";

const maxBytes32 = "0x" + "f".repeat(64);

export default class ZksDeploymentHelper extends BaseDeploymentHelper {
  public async deploy(verify = false) {
    const wallet = this.getEthersSigner();
    const balBefore = formatEther(await wallet.getBalance());
    console.log(`Deployer ETH balance before: ${balBefore}`);

    const result = await bluebird.mapSeries(
      this.config.COLLATERALS,
      async (token) => {
        console.log();

        const core = await this.deployLiquityCore(token);
        const nullz = await this.deployNULLZContracts(token.symbol);
        await this.connectCoreContracts(core, nullz, token);
        await this.addONEZFacilitator(core, token);

        console.log(
          `------ Done deploying contracts for ${token.symbol} collateral ------`
        );

        if (verify) await this.verifyContracts(token.symbol);
        console.log();

        return { core, nullz, token };
      }
    );

    const balAfter = formatEther(await wallet.getBalance());
    console.log(`Deployer ETH balance after: ${balAfter}`);

    return result;
  }

  private async deployLiquityCore(token: ICollateral): Promise<ICoreContracts> {
    const symbol = token.symbol;
    console.log(`------ Deploying contracts for ${symbol} collateral ------`);

    // first check if there is a lending pool
    const lendingPool = await this.deployMockLendingPool(token);

    const activePool = await this._deploy<ActivePool>("ActivePool", symbol);
    const borrowerOperations = await this._deploy<BorrowerOperations>(
      "BorrowerOperations",
      symbol
    );
    const collSurplusPool = await this._deploy<CollSurplusPool>(
      "CollSurplusPool",
      symbol
    );
    const defaultPool = await this._deploy<DefaultPool>("DefaultPool", symbol);
    const gasPool = await this._deploy<GasPool>("GasPool", symbol);
    const governance = await this._deploy<Governance>("Governance", symbol);
    const hintHelpers = await this._deploy<HintHelpers>("HintHelpers", symbol);
    const multiTroveGetter = await this._deploy<MultiTroveGetter>(
      "MultiTroveGetter",
      symbol
    );
    const onez = await this._deploy<ONEZ>(`ONEZ`);
    const priceFeed = await this._deploy<PriceFeed>("PriceFeed", symbol);
    const sortedTroves = await this._deploy<SortedTroves>(
      "SortedTroves",
      symbol
    );
    const stabilityPool = await this._deploy<StabilityPool>(
      "StabilityPool",
      symbol
    );
    const troveManager = await this._deploy<TroveManager>(
      "TroveManager",
      symbol
    );

    console.log(`- Done deploying ONEZ contracts`);

    return {
      onez,
      governance,
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

  private async deployNULLZContracts(symbol: string): Promise<INullzContracts> {
    const nullz = await this._deploy<NULLZ>("NULLZ");
    const communityIssuance = await this._deploy<CommunityIssuance>(
      `CommunityIssuance`,
      symbol
    );

    return {
      communityIssuance,
      nullz,
    };
  }

  private async deployMockLendingPool(
    token: ICollateral
  ): Promise<ILendingPool> {
    if (this.config.LENDING_POOL_ADDRESS !== "") {
      const factory = await this.getFactory("ILendingPool");
      const lendingPool = await this.loadContract<ILendingPool>(
        this.config.LENDING_POOL_ADDRESS,
        factory.abi
      );
      return lendingPool;
    }
    console.log(`- Deploying mock lending pool`);

    // if we don't have a lending pool, then make a mock one
    const pool = await this._deploy<MockLendingPool>(`MockLendingPool`);

    console.log(`- Initializing reserve for ${token.symbol}`);
    await this.sendAndWaitForTransaction(pool.initReserve(token.address));
    console.log(`- Done initializing reserves for ${token.symbol}`);
    return pool;
  }

  private async connectCoreContracts(
    core: ICoreContracts,
    gov: INullzContracts,
    token: ICollateral
  ) {
    console.log(`- Connecting ONEZ contracts for ${token.symbol}`);

    await this._init("PriceFeed", core.priceFeed, [
      this.config.PYTH_ADDRESS, // address _pyth,
      token.pythId, // bytes32 _priceId,
      token.decimals, // uint8 _assetDecimals
    ]);

    await this._init("Governance", core.governance, [
      this.config.ADMIN_ADDRESS,
      core.troveManager.address,
      core.borrowerOperations.address,
      core.priceFeed.address,
      this.config.DEPLOYER_ADDRESS,
    ]);

    await this._init("Sorted Troves", core.sortedTroves, [
      maxBytes32,
      core.troveManager.address,
      core.borrowerOperations.address,
    ]);

    await this._init("TroveManager", core.troveManager, [
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

    await this._init("BorrowerOperations", core.borrowerOperations, [
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

    await this._init("StabilityPool", core.stabilityPool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.activePool.address,
      core.onez.address,
      core.sortedTroves.address,
      token.address,
      core.governance.address,
    ]);

    await this._init("ActivePool", core.activePool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.stabilityPool.address,
      core.defaultPool.address,
      core.collSurplusPool.address,
      core.lendingPool.address,
      token.address,
    ]);

    await this._init("DefaultPool", core.defaultPool, [
      core.troveManager.address,
      core.activePool.address,
      token.address,
    ]);

    await this._init("GasPool", core.gasPool, [
      core.onez.address,
      core.troveManager.address,
      core.borrowerOperations.address,
    ]);

    await this._init("MultiTroveGetter", core.multiTroveGetter, [
      core.troveManager.address,
      core.sortedTroves.address,
    ]);

    await this._init("CollSurplusPool", core.collSurplusPool, [
      core.borrowerOperations.address,
      core.troveManager.address,
      core.activePool.address,
      token.address,
    ]);

    await this._init("HintHelpers", core.hintHelpers, [
      core.sortedTroves.address,
      core.troveManager.address,
    ]);

    await this._init("CommunityIssuance", gov.communityIssuance, [
      gov.nullz.address,
      core.stabilityPool.address,
      86400 * 30,
    ]);

    console.log(`- Done connecting ONEZ contracts`);
  }

  private async addONEZFacilitator(core: ICoreContracts, token: ICollateral) {
    console.log(`- Adding ONEZ facilitator ${token.symbol}`);

    const facilitator = await core.onez.getFacilitator(
      core.borrowerOperations.address
    );

    if (facilitator.bucketCapacity.gt(0)) {
      console.log(`- ONEZ facilitator already exists`);
      return;
    }

    await this.sendAndWaitForTransaction(
      core.onez.addFacilitator(
        core.borrowerOperations.address, // address facilitatorAddress,
        `trove-${token}`, // string calldata facilitatorLabel,
        token.capacityE18 // uint128 bucketCapacity
      )
    );

    console.log(`- Done adding ONEZ facilitator`);
  }

  public async verifyContracts(symbol: string) {
    if (!this.config.ETHERSCAN_BASE_URL)
      return console.log("- No Etherscan URL defined, skipping verification");

    await this.verifyContract("NULLZ");
    await this.verifyContract(`${symbol}ActivePool`);
    await this.verifyContract(`${symbol}BorrowerOperations`);
    await this.verifyContract(`${symbol}CollSurplusPool`);
    await this.verifyContract(`${symbol}CommunityIssuance`);
    await this.verifyContract(`${symbol}DefaultPool`);
    await this.verifyContract(`${symbol}GasPool`);
    await this.verifyContract(`${symbol}Governance`);
    await this.verifyContract(`${symbol}HintHelpers`);
    await this.verifyContract(`${symbol}MultiTroveGetter`);
    await this.verifyContract(`${symbol}PriceFeed`);
    await this.verifyContract(`${symbol}SortedTroves`);
    await this.verifyContract(`${symbol}StabilityPool`);
    await this.verifyContract(`${symbol}TroveManager`);
    await this.verifyContract(`ONEZ`);
  }
}
