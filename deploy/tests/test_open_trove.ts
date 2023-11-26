import { ERC20 } from "../../output/typechain/index.ts";
import { getDeployer } from "../helpers.ts";
import { getWallet } from "../../test/utils/wallets.ts";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TestHelper } from "../../test/utils/testHelpers.ts";
import paramsGoerli from "../params/zksync-goerli.ts";
import paramsGoerliFork from "../params/zksync-goerli-fork.ts";
import ZksDeploymentHelper from "../../utils/ZksDeploymentHelper.ts";

const { toBN, dec } = TestHelper;

export default async function (hre: HardhatRuntimeEnvironment) {
  const deployer = getDeployer(hre);

  const params =
    hre.network.name === "inMemoryNode" ? paramsGoerliFork : paramsGoerli;

  const mdh = new ZksDeploymentHelper(params, deployer, hre, false);
  await mdh.loadPreviousDeployment();

  const results = await mdh.deploy(true);
  const result = results[0];

  const wallet = mdh.getEthersSigner();
  const erc20 = await mdh.getContract<ERC20>(
    "IERC20",
    result.token.address,
    wallet
  );
  // await mdh.verifyContracts(result.token.symbol);

  const approve = await erc20.approve(
    result.core.borrowerOperations.address,
    dec(10000000, 18)
  );
  console.log("approve", approve.hash);

  console.log("priceFeed", await result.core.priceFeed.fetchPrice());
  console.log("canInitialize", await result.core.troveManager.canInitialize());

  const account = getWallet(deployer.ethWallet.privateKey);
  const tx = await TestHelper.openTrove(
    account,
    mdh.getEthersProvider(),
    result.core as any,
    {
      extraONEZAmount: toBN(dec(400, 18)),
      ICR: toBN(dec(2, 18)),
    }
  );

  console.log(tx.tx.hash);
}
