import { expect } from "chai";
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
import { BigNumber } from "ethers";
import { ZERO_ADDRESS } from "../utils/base/BaseHelper";

describe("Basic Functionalities", function () {
  let core: ICoreContracts;
  let gov: IGovContracts;
  let external: IExternalContracts;
  let collaterals: ITokenContracts[];
  let deployer: SignerWithAddress;

  const e18 = BigNumber.from(10).pow(18);

  beforeEach(async () => {
    [deployer] = await ethers.getSigners();
    const helper = new HardhatDeploymentHelper(deployer, params, hre);
    helper.log = () => {
      /* nothing */
    };

    const result = await helper.deploy();
    core = result.core;
    gov = result.gov;
    external = result.external;
    collaterals = result.collaterals;
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
});
