import { Contract } from "ethers";
import { Artifact, HardhatRuntimeEnvironment } from "hardhat/types";
import { IParams, IState } from "./interfaces";
import * as ethers from "ethers";
import fs from "fs";

export default abstract class BaseHelper {
  hre: HardhatRuntimeEnvironment;

  public state: IState;
  public config: IParams;
  public skipSave: boolean;

  constructor(
    configParams: IParams,
    hre: HardhatRuntimeEnvironment,
    skipSave: boolean = false
  ) {
    this.state = {};
    this.hre = hre;
    this.config = configParams;
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

  abstract getFactory(name: string): Promise<Artifact>; // => await this.deployer.loadArtifact(name);

  abstract sendAndWaitForTransaction(txPromise): Promise<void>;

  abstract getEthersSigner(privateKey?: string): ethers.Wallet;

  abstract getEthersProvider(): ethers.providers.BaseProvider;

  abstract deployContract<T extends Contract>(
    factoryName: string,
    prefix?: string,
    params?: any[]
  ): Promise<T>;

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
}
