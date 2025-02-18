import { formatEther } from "ethers/lib/utils";

import BaseHelper, { ZERO_ADDRESS } from "./BaseHelper";
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
  PrismaVault,
  TroveManagerGetters,
  ILendingPool,
  IPyth,
  MockLendingPool,
  MockPyth,
  MintableERC20,
  WrappedLendingCollateral,
} from "../../typechain";
import {
  ICollateral,
  ICoreContracts,
  IGovContracts,
  IExternalContracts,
} from "./interfaces";
import Bluebird from "bluebird";
import { BigNumber } from "ethers";

const e18 = BigNumber.from(10).pow(18);

export default abstract class BaseDeploymentHelper extends BaseHelper {
  public async deploy() {
    const wallet = await this.getEthersSigner();
    const balBefore = formatEther(await wallet.getBalance());

    this.log(`Deployer is: ${await wallet.getAddress()}`);
    this.log(`Deployer ETH balance before: ${balBefore}`);

    this.config.ADMIN_ADDRESS = await wallet.getAddress();
    this.config.DEPLOYER_ADDRESS = await wallet.getAddress();

    const external = await this.deployOrLoadExternalContracts();

    // deploy core and gove
    const core = await this.deployCore(external);
    const gov = await this.deployGov(core);

    // connect contracts
    await this.connectContracts(core, gov);

    const collaterals = await Bluebird.mapSeries(
      this.config.COLLATERALS,
      async (token) => {
        const wCollateral = await this.addCollateral(
          core,
          gov,
          external,
          token
        );
        const erc20 = await this.loadOrDeployMockERC20(token);
        return { wCollateral, erc20, token };
      }
    );

    return {
      core,
      gov,
      external,
      collaterals,
    };
  }

  public async deployCore(
    external: IExternalContracts
  ): Promise<ICoreContracts> {
    this.log(`------ Deploying core contracts ------`);
    const gasCompenstaion = e18.mul(this.config.GAS_COMPENSATION);

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
    const onez = await this.loadOrDeployONEZ();
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
      [prismaCore.address, external.pyth.address]
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
    this.log(`------ Deploying DAO contracts ------`);

    const feeReceiver = await this.deployContract<FeeReceiver>("FeeReceiver", [
      core.prismaCore.address,
    ]);

    const nullz = await this.deployContract<PrismaToken>("PrismaToken", [
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
      nullz,
      tokenLocker,
      incentiveVoting,
      prismaVault,
    };
  }

  private async connectContracts(core: ICoreContracts, gov: IGovContracts) {
    this.log(`------ Connecting contracts ------`);

    const gasCompenstaion = e18.mul(this.config.GAS_COMPENSATION);

    await this.waitForTx(
      core.debtTokenOnezProxy.initialize(
        core.onez.address, // IONEZ _onez,
        core.stabilityPool.address, // address _stabilityPoolAddress,
        core.borrowerOperations.address, // address _borrowerOperationsAddress,
        core.prismaCore.address, // IPrismaCore prismaCore_,
        core.factory.address, // address _factory,
        core.gasPool.address, // address _gasPool,
        gasCompenstaion // uint256 _gasCompensation
      )
    );

    await this.waitForTx(
      core.borrowerOperations.initialize(
        core.debtTokenOnezProxy.address,
        core.factory.address,
        e18.mul(this.config.MIN_NET_DEBT)
      )
    );

    await this.waitForTx(
      core.prismaCore.initialize(
        this.config.DEPLOYER_ADDRESS, // address _owner,
        this.config.DEPLOYER_ADDRESS, // address _guardian,
        core.priceFeedPyth.address, // address _priceFeed,
        gov.feeReceiver.address // address _feeReceiver
      )
    );

    await this.waitForTx(
      core.stabilityPool.initialize(
        core.debtTokenOnezProxy.address, // IDebtTokenOnezProxy _debtTokenAddress,
        gov.prismaVault.address, // IPrismaVault _vault,
        core.factory.address, // address _factory,
        core.liquidationManager.address // address _liquidationManager
      )
    );

    await this.waitForTx(
      core.factory.initialize(
        core.debtTokenOnezProxy.address, // IDebtTokenOnezProxy _debtToken,
        core.stabilityPool.address, // IStabilityPool _stabilityPool,
        core.borrowerOperations.address, // IBorrowerOperations _borrowerOperations,
        core.sortedTroves.address, // address _sortedTroves,
        core.troveManager.address, // address _troveManager,
        core.liquidationManager.address // ILiquidationManager _liquidationManager
      )
    );

    await this.waitForTx(
      core.gasPool.initialize(core.debtTokenOnezProxy.address)
    );

    await this.waitForTx(
      core.liquidationManager.initialize(
        core.stabilityPool.address, // IStabilityPool _stabilityPoolAddress,
        core.borrowerOperations.address, // IBorrowerOperations _borrowerOperations,
        core.factory.address // address _factory
      )
    );

    await this.waitForTx(
      gov.nullz.initialize(
        gov.prismaVault.address, // address _vault,
        gov.tokenLocker.address // address _locker
      )
    );

    await this.waitForTx(
      gov.tokenLocker.initialize(
        gov.nullz.address, // IPrismaToken _token,
        gov.incentiveVoting.address, // IIncentiveVoting _voter,
        this.config.DEPLOYER_ADDRESS, // address _manager,
        1 // uint256 _lockToTokenRatio // TODO: find the value of this
      )
    );
    await this.waitForTx(
      gov.incentiveVoting.initialize(
        gov.tokenLocker.address, // ITokenLocker _tokenLocker,
        gov.prismaVault.address // address _vault
      )
    );
    await this.waitForTx(
      gov.prismaVault.initialize(
        gov.nullz.address, // IPrismaToken _token,
        gov.tokenLocker.address, // ITokenLocker _locker,
        gov.incentiveVoting.address, // IIncentiveVoting _voter,
        core.stabilityPool.address, // address _stabilityPool,
        this.config.DEPLOYER_ADDRESS // address _manager
      )
    );

    await this.waitForTx(
      core.onez.addFacilitator(
        core.debtTokenOnezProxy.address,
        "Primsa-BO",
        BigNumber.from(10).pow(24)
      )
    );

    this.log(`------ Contracts Connected ------`);
  }

  private async addCollateral(
    core: ICoreContracts,
    gov: IGovContracts,
    external: IExternalContracts,
    token: ICollateral
  ) {
    this.log(`------ Adding collateral ${token.symbol} ------`);

    const wCollateral = await this.deployContract<WrappedLendingCollateral>(
      "WrappedLendingCollateral",
      [
        token.symbol,
        token.symbol,
        external.lendingPool.address,
        token.address,
        core.borrowerOperations.address,
      ]
    );

    await this.waitForTx(
      core.priceFeedPyth.setOracle(wCollateral.address, token.pythId)
    );

    await this.waitForTx(
      core.priceFeedPyth.setOracle(token.address, token.pythId)
    );

    await this.waitForTx(
      core.factory.deployNewInstance({
        gasCompensation: e18.mul(this.config.GAS_COMPENSATION),
        gasPoolAddress: core.gasPool.address, // address gasPoolAddress;
        debtTokenAddress: core.debtTokenOnezProxy.address, // address debtTokenAddress;
        borrowerOperationsAddress: core.borrowerOperations.address, // address borrowerOperationsAddress;
        vault: gov.prismaVault.address, // address vault;
        liquidationManager: core.liquidationManager.address, // address liquidationManager;
        collateral: wCollateral.address, // address collateral;
        priceFeed: core.priceFeedPyth.address, // address priceFeed;
        minuteDecayFactor: "999037758833783000", // uint256 minuteDecayFactor; // 999037758833783000  (half life of 12 hours)
        redemptionFeeFloor: "5000000000000000", // uint256 redemptionFeeFloor; // 1e18 / 1000 * 5  (0.5%)
        maxRedemptionFee: "1000000000000000000", // uint256 maxRedemptionFee; // 1e18  (100%)
        borrowingFeeFloor: "5000000000000000", // uint256 borrowingFeeFloor; // 1e18 / 1000 * 5  (0.5%)
        maxBorrowingFee: "50000000000000000", // uint256 maxBorrowingFee; // 1e18 / 100 * 5  (5%)
        interestRateInBps: token.interestRateInBps, // "100", // uint256 interestRateInBps; // 100 (1%)
        maxDebt: e18.mul(1000000), // uint256 maxDebt;
        MCR: "1200000000000000000", // uint256 MCR; // 12 * 1e17  (120%)
      })
    );

    this.log(`------ Collateral Added ------`);
    return wCollateral;
  }

  private async deployOrLoadExternalContracts(): Promise<IExternalContracts> {
    await this.loadMockCollaterals();

    const pyth = await this.loadOrDeployMockPyth();
    const lendingPool = await this.loadOrDeployMockLendingPool();
    return {
      pyth,
      lendingPool,
    };
  }

  private async loadOrDeployMockLendingPool() {
    if (this.config.LENDING_POOL_ADDRESS != ZERO_ADDRESS)
      return await this.getContract<ILendingPool>(
        "MockLendingPool",
        this.config.LENDING_POOL_ADDRESS
      );

    const pool = await this.deployContract<MockLendingPool>(`MockLendingPool`);

    for (let index = 0; index < this.config.COLLATERALS.length; index++) {
      await this.waitForTx(
        pool.initReserve(this.config.COLLATERALS[index].address)
      );
    }

    return pool as ILendingPool;
  }

  private async loadMockCollaterals() {
    for (let index = 0; index < this.config.COLLATERALS.length; index++) {
      const token = this.config.COLLATERALS[index];
      if (token.address !== ZERO_ADDRESS) continue;

      const instance = await this.loadOrDeployMockERC20(token);
      this.config.COLLATERALS[index].address = instance.address;
    }
  }

  private async loadOrDeployMockERC20(token: ICollateral) {
    if (token.address != ZERO_ADDRESS)
      return await this.getContract<MintableERC20>(
        "MintableERC20",
        token.address
      );

    this.log(`- Deploying mock token for ${token.symbol}`);
    return await this.deployContract<MintableERC20>(`MintableERC20`, [
      token.symbol,
      token.symbol,
    ]);
  }

  private async loadOrDeployONEZ() {
    if (this.config.ONEZ != ZERO_ADDRESS)
      return await this.getContract<ONEZ>("ONEZ", this.config.ONEZ);

    this.log(`- Deploying mock onez token`);
    return await this.deployContract<ONEZ>(`ONEZ`);
  }

  private async loadOrDeployMockPyth() {
    if (this.config.PYTH_ADDRESS != ZERO_ADDRESS)
      return await this.getContract<MockPyth>(
        "MockPyth",
        this.config.PYTH_ADDRESS
      );

    const pyth = await this.deployContract<MockPyth>(`MockPyth`);

    for (let index = 0; index < this.config.COLLATERALS.length; index++) {
      await this.waitForTx(
        pyth.setPrice(this.config.COLLATERALS[index].pythId, 1800 * 1e8, -8)
      );
    }
    return pyth;
  }
}
