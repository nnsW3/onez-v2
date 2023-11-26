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

describe("Basic Functionalities", function () {
  let core: ICoreContracts;
  let gov: IGovContracts;
  let external: IExternalContracts;
  let collaterals: ITokenContracts[];
  let deployer: SignerWithAddress;

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

  it("Should open a trove with WETH collateral", async function () {
    const bo = core.borrowerOperations;
    expect(await bo.PRISMA_CORE()).to.equal(core.prismaCore.address);
    expect(await bo.owner()).to.equal(params.DEPLOYER_ADDRESS);
  });

  it("Should open a trove with ETH collateral", async function () {
    const bo = core.borrowerOperations;
    expect(await bo.PRISMA_CORE()).to.equal(core.prismaCore.address);
    expect(await bo.owner()).to.equal(params.DEPLOYER_ADDRESS);
  });
});
