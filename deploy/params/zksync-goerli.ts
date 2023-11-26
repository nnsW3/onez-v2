import { IParams } from "../../utils/interfaces";

const params: IParams = {
  RPC_URL: "https://testnet.era.zksync.dev",
  PYTH_ADDRESS: "0xC38B1dd611889Abc95d4E0a472A667c3671c08DE",
  COLLATERALS: [
    {
      pythId:
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
      address: "0x81d6b98beb0a4288dcfab724fdeae52e5aa2f7b1",
      symbol: "WETH",
      decimals: 18,
      capacityE18: "10000000000000000000000000", // 100 mil mint
    },
    {
      pythId:
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722",
      address: "0x9223dc9205cf8336ca59ba0bd390647e62d487e5",
      symbol: "USDC",
      decimals: 6,
      capacityE18: "10000000000000000000000000", // 100 mil mint
    },
  ],
  ADMIN_ADDRESS: "0xb76F765A785eCa438e1d95f594490088aFAF9acc",
  DEPLOYER_ADDRESS: "0xb76F765A785eCa438e1d95f594490088aFAF9acc",
  OUTPUT_FILE: "./output/zksync-goerli.json",
  GAS_PRICE: 5 * 1000000000, // 5.1 gwei
  LENDING_POOL_ADDRESS: "0xC4b785A74b3d8EBE75C8d0b8Ff960d66527CAE63",
  TX_CONFIRMATIONS: 0,
  ETHERSCAN_BASE_URL: "https://goerli.explorer.zksync.io",
  NETWORK_NAME: "zksync-goerli",
};

export default params;
