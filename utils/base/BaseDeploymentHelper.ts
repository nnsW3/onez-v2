import { formatEther } from "ethers/lib/utils";

import BaseHelper from "./BaseHelper";
import {
  BorrowerOperations,
  DebtTokenOnezProxy,
  Factory,
  FeeReceiver,
  GasPool,
  IncentiveVoting,
  LiquidationManager,
  MultiCollateralHintHelpers,
  MultiTroveGetter,
  ONEZ,
  PriceFeedPyth,
  PrismaCore,
  PrismaToken,
  SortedTroves,
  StabilityPool,
  TokenLocker,
  TroveManager,
  TroveManagerGetters,
} from "../../typechain";
import { ICoreContracts, IGovContracts } from "./interfaces";
import { PrismaVault } from "../../typechain/contracts/dao/Vault.sol";

export default abstract class BaseDeploymentHelper extends BaseHelper {
  public async deploy(verify = false) {
    const wallet = await this.getEthersSigner();
    const balBefore = formatEther(await wallet.getBalance());
    console.log(`Deployer ETH balance before: ${balBefore}`);

    const core = await this.deployCore();
    const gov = await this.deployGov(core);
    await this.connectContracts(core, gov);
  }

  private async deployCore(): Promise<ICoreContracts> {
    console.log(`------ Deploying core contracts ------`);
    const gasCompenstaion = 0;

    const prismaCore = await this.deployContract<PrismaCore>("PrismaCore");
    const factory = await this.deployContract<Factory>("Factory", [
      prismaCore.address,
    ]);
    const borrowerOperations = await this.deployContract<BorrowerOperations>(
      "BorrowerOperations",

      [prismaCore.address, gasCompenstaion]
    );
    const debtTokenOnezProxy = await this.deployContract<DebtTokenOnezProxy>(
      "DebtTokenOnezProxy"
    );
    const onez = await this.deployContract<ONEZ>("ONEZ");
    const gasPool = await this.deployContract<GasPool>("GasPool");
    const liquidationManager = await this.deployContract<LiquidationManager>(
      "LiquidationManager",
      [gasCompenstaion]
    );
    const sortedTroves = await this.deployContract<SortedTroves>(
      "SortedTroves"
    );
    const stabilityPool = await this.deployContract<StabilityPool>(
      "StabilityPool",
      [prismaCore.address]
    );
    const priceFeedPyth = await this.deployContract<PriceFeedPyth>(
      "PriceFeedPyth",
      [prismaCore.address]
    );
    const multiCollateralHintHelpers =
      await this.deployContract<MultiCollateralHintHelpers>(
        "MultiCollateralHintHelpers",
        [prismaCore.address, gasCompenstaion]
      );
    const multiTroveGetter = await this.deployContract<MultiTroveGetter>(
      "MultiTroveGetter"
    );
    const troveManagerGetters = await this.deployContract<TroveManagerGetters>(
      "TroveManagerGetters",
      [factory.address]
    );

    const troveManager = await this.deployContract<TroveManager>(
      "TroveManager",
      [prismaCore.address, gasCompenstaion]
    );

    return {
      prismaCore,
      troveManager,
      factory,
      borrowerOperations,
      debtTokenOnezProxy,
      onez,
      gasPool,
      liquidationManager,
      sortedTroves,
      stabilityPool,
      priceFeedPyth,
      multiCollateralHintHelpers,
      multiTroveGetter,
      troveManagerGetters,
    };
  }

  private async deployGov(core: ICoreContracts): Promise<IGovContracts> {
    console.log(`------ Deploying DAO contracts ------`);

    const feeReceiver = await this.deployContract<FeeReceiver>("FeeReceiver", [
      core.prismaCore.address,
    ]);

    const prismaToken = await this.deployContract<PrismaToken>("PrismaToken", [
      this.config.LAYERZERO_ENDPOINT,
    ]);

    const tokenLocker = await this.deployContract<TokenLocker>("TokenLocker", [
      core.prismaCore.address,
    ]);

    const incentiveVoting = await this.deployContract<IncentiveVoting>(
      "IncentiveVoting",
      [core.prismaCore.address]
    );

    const prismaVault = await this.deployContract<PrismaVault>("PrismaVault", [
      core.prismaCore.address,
    ]);

    return {
      feeReceiver,
      prismaToken,
      tokenLocker,
      incentiveVoting,
      prismaVault,
    };
  }

  private async connectContracts(core: ICoreContracts, gov: IGovContracts) {
    // todo
  }
}
