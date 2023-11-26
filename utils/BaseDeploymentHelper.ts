import { Contract } from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Provider } from "zksync-web3";
import * as ethers from "ethers";
import fs from "fs";
import { IParams, IState } from "./interfaces";

export default class BaseDeploymentHelper {
  hre: HardhatRuntimeEnvironment;
  deployer: Deployer;

  public state: IState;
  public config: IParams;
  public skipSave: boolean;

  constructor(
    configParams: IParams,
    deployer: Deployer,
    hre: HardhatRuntimeEnvironment,
    skipSave: boolean = false
  ) {
    this.state = {};
    this.hre = hre;
    this.config = configParams;
    this.deployer = deployer;
    this.skipSave = skipSave;
  }

  loadPreviousDeployment() {
    if (fs.existsSync(this.config.OUTPUT_FILE)) {
      console.log();
      console.log(`------  Loading previous deployment ------ `);
      this.state = require("../" + this.config.OUTPUT_FILE);
      console.log(`------  Done loading previous deployment ------ `);
      console.log();
    }
  }

  saveDeployment(_state: IState) {
    const state = JSON.stringify(_state, null, 2);
    fs.writeFileSync(this.config.OUTPUT_FILE, state);
  }

  // --- Deployer methods ---

  getFactory = async (name: string) => await this.deployer.loadArtifact(name);

  async sendAndWaitForTransaction(txPromise) {
    const tx = await txPromise;
    if (this.config.TX_CONFIRMATIONS === 0) return tx.hash;
    const minedTx = await this.deployer.ethWallet.provider.waitForTransaction(
      tx.hash,
      this.config.TX_CONFIRMATIONS
    );
    return minedTx;
  }

  getEthersSigner = (privateKey?: string) =>
    new ethers.Wallet(
      privateKey || this.deployer.ethWallet.privateKey,
      this.getEthersProvider()
    );

  getEthersProvider = () => new Provider(this.config.RPC_URL);

  async getSavedContract<T extends Contract>(
    factoryN: string,
    prefix: string,
    wallet?: ethers.ethers.Wallet
  ) {
    const id = `${prefix}${factoryN}`;
    return await this.getContract<T>(this.state[id].address, factoryN, wallet);
  }

  async getContract<T extends Contract>(
    factoryN: string,
    address: string,
    wallet?: ethers.ethers.Wallet
  ) {
    const factory = await this.getFactory(factoryN);
    return await this.loadContract<T>(address, factory.abi, wallet);
  }

  // --- Verify on Ethrescan ---

  protected async verifyContract(
    name: string,
    constructorArguments: any[] = []
  ) {
    if (!this.state[name] || !this.state[name].address) {
      console.error(`- No deployment state for contract ${name}!!`);
      return;
    }

    if (this.state[name].verification) {
      console.log(`- Contract ${name} already verified`);
      return;
    }

    try {
      console.log(`- Contract ${name} is being verified`);
      await this.hre.run("verify:verify", {
        address: this.state[name].address,
        constructorArguments,
      });
    } catch (error) {
      console.log(error);
      if (error.name != "NomicLabsHardhatPluginError") {
        console.error(`- Error verifying: ${error.name}`);
        console.error(error);
        return;
      }
    }

    this.state[
      name
    ].verification = `${this.config.ETHERSCAN_BASE_URL}/address/${this.state[name].address}#code`;
    this.saveDeployment(this.state);
  }

  // --- Helpers ---

  protected async loadContract<T extends Contract>(
    address: string,
    abi: any[],
    wallet?: ethers.ethers.Wallet
  ) {
    return new ethers.Contract(
      address,
      abi,
      wallet || this.getEthersSigner()
    ) as T;
  }

  protected async _deploy<T extends Contract>(
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

  protected async _init(name: string, contract: Contract, params: any[]) {
    const gasPrice = this.config.GAS_PRICE;

    console.log(`- Set addresses in ${name}`);
    const can = await contract.canInitialize();
    if (can)
      await this.sendAndWaitForTransaction(
        contract.setAddresses(...params, { gasPrice })
      );
    else console.log(`- Already initialized ${name}`);
  }
}
