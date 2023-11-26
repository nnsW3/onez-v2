import { ZERO_ADDRESS } from "../../utils/base/BaseHelper";
import { IParams } from "../../utils/base/interfaces";

const params: IParams = {
  RPC_URL: "https://mainnet.era.zksync.io",
  PYTH_ADDRESS: "0xf087c864AEccFb6A2Bf1Af6A0382B0d0f6c5D834",
  COLLATERALS: [
    {
      pythId:
        "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
      address: "0x5aea5775959fbc2557cc8789bc1bf90a239d9a91",
      symbol: "WETH",
      decimals: 18,
      capacityE18: "10000000000000000000000000", // 100 mil mint
    },
  ],
  LAYERZERO_ENDPOINT: ZERO_ADDRESS,
  ADMIN_ADDRESS: "0x36615Cf349d7F6344891B1e7CA7C72883F5dc049",
  DEPLOYER_ADDRESS: "0x36615Cf349d7F6344891B1e7CA7C72883F5dc049",
  OUTPUT_FILE: "./output/zksync-mainnet.json",
  GAS_PRICE: 5 * 1000000000, // 5.1 gwei
  LENDING_POOL_ADDRESS: "",
  TX_CONFIRMATIONS: 3,
  ETHERSCAN_BASE_URL: "https://explorer.zksync.io/",
  NETWORK_NAME: "zksync-mainnet",
};

export default params;
