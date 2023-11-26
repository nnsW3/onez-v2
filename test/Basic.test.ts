import { expect } from "chai";
import {
  ICoreContracts,
  IExternalContracts,
  IGovContracts,
} from "../utils/base/interfaces";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import HardhatDeploymentHelper from "../utils/HardhatDeploymentHelper";
import hre from "hardhat";
import params from "../deploy/params/hardhat-test";

describe("Basic Functionalities", function () {
  let core: ICoreContracts;
  let gov: IGovContracts;
  let external: IExternalContracts;

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
  });

  it("Should properly deploy core and governance modules", async function () {
    expect(await core.borrowerOperations.PRISMA_CORE()).to.equal(
      core.prismaCore.address
    );
  });
});
