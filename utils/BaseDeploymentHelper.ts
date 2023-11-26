import { formatEther } from "ethers/lib/utils";
import { ICollateral, ICoreContracts } from "./interfaces";
import BaseHelper from "./BaseHelper";
import bluebird from "bluebird";

export default abstract class BaseDeploymentHelper extends BaseHelper {
  public async deploy(verify = false) {
    const wallet = await this.getEthersSigner();
    const balBefore = formatEther(await wallet.getBalance());
    console.log(`Deployer ETH balance before: ${balBefore}`);

    const core = await this.deployCore();

    // const result = await bluebird.mapSeries(
    //   this.config.COLLATERALS,
    //   async (token) => {
    //     console.log();

    //     const collateral = await this.deployCollateral(token);

    //     console.log(
    //       `------ Done deploying contracts for ${token.symbol} collateral ------`
    //     );

    //     // if (verify) await this.verifyContracts(token.symbol);
    //     console.log();

    //     return { core: collateral, token };
    //   }
    // );

    // await this.addONEZFacilitator(core);

    const balAfter = formatEther(await wallet.getBalance());
    console.log(`Deployer ETH balance after: ${balAfter}`);
  }

  private async deployCore(): Promise<any> {
    console.log(`------ Deploying core contracts ------`);

    const gasCompenstaion = 0;

    // first check if there is a lending pool
    // const lendingPool = await this.deployMockLendingPool(token);

    const prismaCore = await this.deployContract("PrismaCore");
    const factory = await this.deployContract("Factory", undefined, [
      prismaCore.address,
    ]);
    const borrowerOperations = await this.deployContract(
      "BorrowerOperations",
      undefined,
      [prismaCore.address, gasCompenstaion]
    );
    const debtTokenOnezProxy = await this.deployContract("DebtTokenOnezProxy");
    const onez = await this.deployContract("ONEZ");
    const gasPool = await this.deployContract("GasPool");
    const liquidationManager = await this.deployContract(
      "LiquidationManager",
      undefined,
      [gasCompenstaion]
    );

    // const activePool = await this.deployContract("ActivePool", symbol);
    // const borrowerOperations = await this.deployContract(
    //   "BorrowerOperations",
    //   symbol
    // );
    // const collSurplusPool = await this.deployContract(
    //   "CollSurplusPool",
    //   symbol
    // );
    // const defaultPool = await this.deployContract("DefaultPool", symbol);
    // const gasPool = await this.deployContract("GasPool", symbol);
    // const governance = await this.deployContract("Governance", symbol);
    // const hintHelpers = await this.deployContract("HintHelpers", symbol);
    // const multiTroveGetter = await this.deployContract(
    //   "MultiTroveGetter",
    //   symbol
    // );
    // const onez = await this.deployContract(`ONEZ`);
    // const priceFeed = await this.deployContract("PriceFeed", symbol);
    // const sortedTroves = await this.deployContract("SortedTroves", symbol);
    // const stabilityPool = await this.deployContract("StabilityPool", symbol);
    // const troveManager = await this.deployContract("TroveManager", symbol);

    // console.log(`- Done deploying ONEZ contracts`);

    // return {
    //   onez,
    //   governance,
    //   // lendingPool,
    //   sortedTroves,
    //   troveManager,
    //   activePool,
    //   stabilityPool,
    //   gasPool,
    //   defaultPool,
    //   collSurplusPool,
    //   borrowerOperations,
    //   hintHelpers,
    //   multiTroveGetter,
    //   priceFeed,
    // };
  }

  private async deployCollateral(token: ICollateral): Promise<any> {
    const symbol = token.symbol;
    console.log(`------ Deploying contracts for ${symbol} collateral ------`);

    // first check if there is a lending pool
    // const lendingPool = await this.deployMockLendingPool(token);

    const prismaCore = await this.deployContract("PrimsaCore");

    // const activePool = await this.deployContract("ActivePool", symbol);
    // const borrowerOperations = await this.deployContract(
    //   "BorrowerOperations",
    //   symbol
    // );
    // const collSurplusPool = await this.deployContract(
    //   "CollSurplusPool",
    //   symbol
    // );
    // const defaultPool = await this.deployContract("DefaultPool", symbol);
    // const gasPool = await this.deployContract("GasPool", symbol);
    // const governance = await this.deployContract("Governance", symbol);
    // const hintHelpers = await this.deployContract("HintHelpers", symbol);
    // const multiTroveGetter = await this.deployContract(
    //   "MultiTroveGetter",
    //   symbol
    // );
    // const onez = await this.deployContract(`ONEZ`);
    // const priceFeed = await this.deployContract("PriceFeed", symbol);
    // const sortedTroves = await this.deployContract("SortedTroves", symbol);
    // const stabilityPool = await this.deployContract("StabilityPool", symbol);
    // const troveManager = await this.deployContract("TroveManager", symbol);

    // console.log(`- Done deploying ONEZ contracts`);

    // return {
    //   onez,
    //   governance,
    //   // lendingPool,
    //   sortedTroves,
    //   troveManager,
    //   activePool,
    //   stabilityPool,
    //   gasPool,
    //   defaultPool,
    //   collSurplusPool,
    //   borrowerOperations,
    //   hintHelpers,
    //   multiTroveGetter,
    //   priceFeed,
    // };
  }

  // private async deployMockLendingPool(
  //   token: ICollateral
  // ): Promise<ILendingPool> {
  //   if (this.config.LENDING_POOL_ADDRESS !== "") {
  //     const factory = await this.getFactory("ILendingPool");
  //     const lendingPool = await this.loadContract<ILendingPool>(
  //       this.config.LENDING_POOL_ADDRESS,
  //       factory.abi
  //     );
  //     return lendingPool;
  //   }
  //   console.log(`- Deploying mock lending pool`);

  //   // if we don't have a lending pool, then make a mock one
  //   const pool = await this.deployContract(`MockLendingPool`);

  //   console.log(`- Initializing reserve for ${token.symbol}`);
  //   await this.sendAndWaitForTransaction(pool.initReserve(token.address));
  //   console.log(`- Done initializing reserves for ${token.symbol}`);
  //   return pool;
  // }

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

  // public async verifyContracts(symbol: string) {
  //   if (!this.config.ETHERSCAN_BASE_URL)
  //     return console.log("- No Etherscan URL defined, skipping verification");

  //   await this.verifyContract("NULLZ");
  //   await this.verifyContract(`${symbol}ActivePool`);
  //   await this.verifyContract(`${symbol}BorrowerOperations`);
  //   await this.verifyContract(`${symbol}CollSurplusPool`);
  //   await this.verifyContract(`${symbol}CommunityIssuance`);
  //   await this.verifyContract(`${symbol}DefaultPool`);
  //   await this.verifyContract(`${symbol}GasPool`);
  //   await this.verifyContract(`${symbol}Governance`);
  //   await this.verifyContract(`${symbol}HintHelpers`);
  //   await this.verifyContract(`${symbol}MultiTroveGetter`);
  //   await this.verifyContract(`${symbol}PriceFeed`);
  //   await this.verifyContract(`${symbol}SortedTroves`);
  //   await this.verifyContract(`${symbol}StabilityPool`);
  //   await this.verifyContract(`${symbol}TroveManager`);
  //   await this.verifyContract(`ONEZ`);
  // }
}
