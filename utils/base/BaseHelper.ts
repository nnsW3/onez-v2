import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { IParams, IState } from "./interfaces";
import * as ethers from "ethers";
import fs from "fs";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

  abstract sendAndWaitForTransaction(
    txPromise: ethers.ContractTransaction
  ): Promise<void>;

  abstract getEthersSigner(privateKey?: string): Promise<ethers.Signer>;

  abstract deployContract<T extends Contract>(
    factoryName: string,
    params?: any[]
  ): Promise<T>;

  async getSavedContract<T extends Contract>(factoryN: string, prefix: string) {
    const id = `${prefix}${factoryN}`;
    return await this.getContract<T>(this.state[id].address, factoryN);
  }

  abstract getContract<T extends Contract>(
    factoryN: string,
    address: string
  ): Promise<T>;

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
    } catch (error: any) {
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

  log(...msg: string[]) {
    console.log(...msg);
  }
}
