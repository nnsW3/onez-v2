import { Contract } from "ethers";
import BaseDeploymentHelper from "./BaseDeploymentHelper";

export default class HardhatDeploymentHelper extends BaseDeploymentHelper {
  async deployContract<T extends Contract>(
    factoryName: string,
    prefix = "",
    params: any[] = [],
    proxy = false
  ): Promise<T> {
    const factory = await this.getFactory(factoryName);

    const name = `${prefix}${factoryName}`;

    if (this.state[name] && this.state[name].address) {
      console.log(
        `- Using previously deployed ${name} contract at address ${this.state[name].address}`
      );
      return this.loadContract<T>(this.state[name].address, factory.abi);
    }

    // console.log("- Deploying a proxy", proxy);

    console.log(`- Deploying ${name} with proxy: ${proxy}`);
    const contract = (await this.deployer.deploy(factory, params, {
      gasPrice: this.config.GAS_PRICE,
    })) as T;

    // wait for the tx
    if (this.config.TX_CONFIRMATIONS > 0) {
      const provider = this.getEthersProvider();
      await provider.waitForTransaction(
        contract.deployTransaction.hash,
        this.config.TX_CONFIRMATIONS
      );
    }

    console.log(`- Deployed ${name} at ${contract.address}`);
    this.state[name] = {
      abi: factoryName || name,
      address: contract.address,
      txHash: contract.deployTransaction.hash,
    };

    this.saveDeployment(this.state);
    return contract;
    // return proxyImplementationFactory
    //   ? this._loadContract(contract.address, proxyImplementationFactory.abi)
    //   : contract;
  }
}
