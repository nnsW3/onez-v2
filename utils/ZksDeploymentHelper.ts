import { Contract } from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Provider } from "zksync-web3";
import * as ethers from "ethers";
import BaseDeploymentHelper from "./BaseDeploymentHelper";

export default class ZksDeploymentHelper extends BaseDeploymentHelper {
  deployer: Deployer;

  async getFactory(name: string) {
    return await this.deployer.loadArtifact(name);
  }

  async sendAndWaitForTransaction(txPromise) {
    const tx = await txPromise;
    if (this.config.TX_CONFIRMATIONS === 0) return tx.hash;
    return await this.deployer.ethWallet.provider.waitForTransaction(
      tx.hash,
      this.config.TX_CONFIRMATIONS
    );
  }

  getEthersSigner = (privateKey?: string) =>
    new ethers.Wallet(
      privateKey || this.deployer.ethWallet.privateKey,
      this.getEthersProvider()
    );

  getEthersProvider = () => new Provider(this.config.RPC_URL);

  async deployContract<T extends Contract>(
    factoryName: string,
    prefix = "",
    params: any[] = []
  ): Promise<T> {
    const factory = await this.getFactory(factoryName);

    const name = `${prefix}${factoryName}`;

    if (this.state[name] && this.state[name].address) {
      console.log(
        `- Using previously deployed ${name} contract at address ${this.state[name].address}`
      );
      return this.loadContract<T>(this.state[name].address, factory.abi);
    }

    console.log(`- Deploying ${name}`);
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
