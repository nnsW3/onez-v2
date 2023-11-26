import { Wallet } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

export const getDeployer = (hre: HardhatRuntimeEnvironment) => {
  if (!PRIVATE_KEY)
    throw "⛔️ Private key not detected! Add it to the .env file!";

  // Initialize the wallet.
  const wallet = new Wallet(PRIVATE_KEY);

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);
  return deployer;
};

export const getForkDeployer = (hre: HardhatRuntimeEnvironment) => {
  const wallet = new Wallet(
    "0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110"
  );
  const deployer = new Deployer(hre, wallet);
  return deployer;
};
