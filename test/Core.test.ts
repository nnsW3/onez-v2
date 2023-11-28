import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ICoreContracts,
  IExternalContracts,
  IGovContracts,
  ITokenContracts,
} from "../utils/base/interfaces";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import HardhatDeploymentHelper from "../utils/HardhatDeploymentHelper";
import hre from "hardhat";
import params from "../deploy/params/hardhat-test";
import { ZERO_ADDRESS } from "../utils/base/BaseHelper";
import { e18, openTroves, provideToSP, withdrawFromSP } from "./helpers";
import { BorrowerOperations, StabilityPool, TroveManager } from "../typechain";

describe("Core Functionalities", function () {
  let core: ICoreContracts;
  let gov: IGovContracts;
  let external: IExternalContracts;
  let restWallets: SignerWithAddress[];
  let collaterals: ITokenContracts[];
  let deployer: SignerWithAddress;
  let ant: SignerWithAddress;
  let bo: BorrowerOperations;
  let sp: StabilityPool;

  beforeEach(async () => {
    [deployer, ant, ...restWallets] = await ethers.getSigners();

    const helper = new HardhatDeploymentHelper(deployer, params, hre);
    helper.log = () => {
      /* nothing */
    };

    const result = await helper.deploy();
    core = result.core;
    gov = result.gov;
    external = result.external;
    collaterals = result.collaterals;

    bo = core.borrowerOperations;
    sp = core.stabilityPool;
  });

  it("Should deploy borrowerOperations properly", async function () {
    const bo = core.borrowerOperations;
    expect(await bo.PRISMA_CORE()).to.equal(core.prismaCore.address);
    expect(await bo.owner()).to.equal(params.DEPLOYER_ADDRESS);
  });

  it("Should report price for WETH properly", async function () {
    const p = core.priceFeedPyth;
    expect(await p.fetchPrice(collaterals[0].wCollateral.address)).to.equal(
      "1800000000000000000000"
    );
    expect(await p.fetchPrice(collaterals[0].token.address)).to.equal(
      "1800000000000000000000"
    );
  });

  it("Should deposit/withdraw WETH into the lending pool properly", async function () {
    const weth = collaterals[0].erc20.connect(deployer);

    // deposit
    await weth.deposit({ value: e18 });
    expect(await weth.balanceOf(deployer.address)).to.equal(e18.mul(1001));

    // supply
    await weth.approve(external.lendingPool.address, e18);
    await external.lendingPool.supply(weth.address, e18, deployer.address, 0);
    expect(await weth.balanceOf(deployer.address)).to.equal(e18.mul(1000));

    // withdraw
    await external.lendingPool.withdraw(weth.address, e18, deployer.address);
    expect(await weth.balanceOf(deployer.address)).to.equal(e18.mul(1001));
  });

  it("Should open a trove with ETH collateral as WETH", async function () {
    const bo = core.borrowerOperations;

    await collaterals[0].erc20
      .connect(deployer)
      .approve(collaterals[0].wCollateral.address, e18.mul(1000));

    await bo
      .connect(deployer)
      .openTrove(
        core.factory.troveManagers(0),
        deployer.address,
        e18,
        e18,
        e18.mul(200),
        ZERO_ADDRESS,
        ZERO_ADDRESS
      );

    expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(200));
  });

  it("Should open a trove with ETH collateral as msg.value", async function () {
    const bo = core.borrowerOperations;

    await bo
      .connect(deployer)
      .openTrove(
        core.factory.troveManagers(0),
        deployer.address,
        e18,
        e18,
        e18.mul(200),
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        { value: e18 }
      );

    expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(200));
  });

  it("Should close a trove with ETH collateral as WETH", async function () {
    const bo = core.borrowerOperations;

    await bo
      .connect(deployer)
      .openTrove(
        core.factory.troveManagers(0),
        deployer.address,
        e18,
        e18,
        e18.mul(200),
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        { value: e18 }
      );

    expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(200));

    // claim trove open fees
    await gov.feeReceiver
      .connect(deployer)
      .transferToken(
        core.onez.address,
        deployer.address,
        await core.onez.balanceOf(gov.feeReceiver.address)
      );

    await core.onez
      .connect(deployer)
      .approve(core.debtTokenOnezProxy.address, e18.mul(300));

    await bo
      .connect(deployer)
      .closeTrove(core.factory.troveManagers(0), deployer.address);
  });

  describe("trove modifications", () => {
    it("Should increase collateral in a trove", async function () {
      // todo
    });

    it("Should decrease collateral in a trove", async function () {
      // todo
    });

    it("Should increase debt in a trove", async function () {
      // todo
    });

    it("Should decrease debt in a trove", async function () {
      // todo
    });
  });

  describe("redemptions", () => {
    it("Should redeem against trove with ETH collateral after bootstrap period has passed", async function () {
      const bo = core.borrowerOperations;
      const collateral = collaterals[0];

      await bo
        .connect(deployer)
        .openTrove(
          core.factory.troveManagers(0),
          deployer.address,
          e18,
          e18,
          e18.mul(600),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          { value: e18 }
        );

      await core.onez.transfer(ant.address, e18.mul(100));
      expect(await core.onez.balanceOf(ant.address)).to.equal(e18.mul(100));

      // redeem the 100 ONEZ
      const tmAddr = await core.factory.troveManagers(0);
      const tm = core.troveManager.attach(tmAddr);

      // go forward 15 days
      await time.increase(86400 * 15);

      // perform redemption
      await core.onez
        .connect(ant)
        .approve(core.debtTokenOnezProxy.address, e18.mul(100));

      await tm.connect(ant).redeemCollateral(
        e18.mul(100),
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        "184102230885856616", // redeemptionHint
        0,
        await tm.maxRedemptionFee()
      );

      const erc20 = await collateral.erc20.connect(ant);

      expect(await erc20.balanceOf(ant.address)).eq("50746329526916802");
      expect(await core.onez.balanceOf(ant.address)).to.equal(e18.mul(0));
    });
  });

  describe("liquidations", () => {
    let goodWallets: SignerWithAddress[];
    let tm: TroveManager;

    let defaulter: SignerWithAddress;

    beforeEach(async function () {
      [defaulter, ...goodWallets] = restWallets.slice(0, 5);
      tm = await core.troveManager.attach(await core.factory.troveManagers(0));

      await openTroves(
        bo,
        tm,
        [...goodWallets, defaulter],
        [e18.mul(2), e18.mul(2), e18.mul(2), e18.mul(2), e18.div(2)], // colls
        [1000, 1000, 1000, 1000, 700] // debts
      );

      // ensure the defaulter has a safe position CR: 126%
      expect(
        await tm.getCurrentICR(defaulter.address, tm.callStatic.fetchPrice())
      ).eq("1261387526278906797");

      // change the price and check the TCR
      expect(await bo.callStatic.getTCR()).eq("3205195349324395097");
      await external.pyth.setPrice(collaterals[0].token.pythId, 1500 * 1e8, -8);
      expect(await bo.callStatic.getTCR()).eq("2670996124436995914");

      // and ensure that the defaulter is about to get liquidated; CR: 105%
      expect(
        await tm.getCurrentICR(defaulter.address, tm.callStatic.fetchPrice())
      ).eq("1051156271899088997");
    });

    it("Should liquidate a bad trove using funds from the stability pool", async function () {
      // get everyone to deposit into the sp
      await provideToSP(core, goodWallets[0], 900);
      await provideToSP(core, goodWallets[1], 900);
      await provideToSP(core, goodWallets[2], 900);

      const goodGuy = goodWallets[0];
      const coll = collaterals[0].erc20.connect(goodGuy); //  collaterals[0].token.address

      // check sp variables
      expect(await sp.getTotalDebtTokenDeposits()).eq("2700000000000000000000");
      const gains = await sp.getDepositorCollateralGain(goodGuy.address);
      expect(gains[0]).eq("0");

      await core.liquidationManager.liquidate(tm.address, defaulter.address);

      // check sp variables and rewards
      expect(await sp.getTotalDebtTokenDeposits()).eq("1986500000000000000000");
      const gAfter = await sp.getDepositorCollateralGain(goodGuy.address);
      expect(gAfter[0]).eq("165833333333333100");

      // get goodWallet to claim these rewards
      expect(await coll.balanceOf(goodGuy.address)).eq(0);
      await sp.connect(goodGuy).claimCollateralGains(goodGuy.address, [0]);
      expect(await coll.balanceOf(goodGuy.address)).eq("165833333333333100");
    });

    it("Should liquidate a bad trove using partial funds from the stability pool", async function () {
      // todo
    });

    it("Should liquidate a bad trove using funds from user", async function () {
      // todo
    });

    it("Should liquidate a bad trove by reorganising debt via default pool", async function () {
      // todo
    });
  });

  describe("stability pool", () => {
    it("Should deposit/withdraw into StabilityPool", async function () {
      const bo = core.borrowerOperations;

      await bo
        .connect(deployer)
        .openTrove(
          core.factory.troveManagers(0),
          deployer.address,
          e18,
          e18,
          e18.mul(600),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          { value: e18 }
        );

      expect(await core.onez.balanceOf(deployer.address)).to.equal(
        e18.mul(600)
      );
      await provideToSP(core, deployer, 600);
      expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(0));

      expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(0));
      await withdrawFromSP(core, deployer, 300);
      expect(await core.onez.balanceOf(deployer.address)).to.equal(
        e18.mul(300)
      );
    });

    it("Should claim liquidation rewards from StabilityPool", async function () {
      // todo
    });

    it("Should not give rewards from StabilityPool until NULLZ is issued", async function () {
      const bo = core.borrowerOperations;

      await bo
        .connect(deployer)
        .openTrove(
          core.factory.troveManagers(0),
          deployer.address,
          e18,
          e18,
          e18.mul(600),
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          { value: e18 }
        );

      expect(await core.onez.balanceOf(deployer.address)).to.equal(
        e18.mul(600)
      );
      await provideToSP(core, deployer, 600);
      expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(0));

      await time.increase(86400 * 15);

      expect(await core.onez.balanceOf(deployer.address)).to.equal(e18.mul(0));
      await withdrawFromSP(core, deployer, 300);
      expect(await gov.nullz.balanceOf(deployer.address)).to.equal(e18.mul(0));
    });

    it("Should give rewards from StabilityPool if NULLZ is issued", async function () {
      // TODO:
    });
  });

  describe("Recovery mode tests", async () => {
    // todo
  });
});
