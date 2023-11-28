import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BorrowerOperations, StabilityPool, TroveManager } from "../typechain";
import { BigNumber } from "ethers";
import { ZERO_ADDRESS } from "../utils/base/BaseHelper";
import { ICoreContracts } from "../utils/base/interfaces";

export const e18 = BigNumber.from(10).pow(18);

export const openTroves = async (
  bo: BorrowerOperations,
  tm: TroveManager,
  users: SignerWithAddress[],
  colls: BigNumber[],
  debts: number[]
) => {
  for (let index = 0; index < users.length; index++) {
    const user = users[index];

    await bo
      .connect(user)
      .openTrove(
        tm.address,
        user.address,
        e18,
        colls[index],
        e18.mul(debts[index]),
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        { value: colls[index] }
      );
  }
};

export const provideToSP = async (
  core: ICoreContracts,
  user: SignerWithAddress,
  amount: number
) => {
  await core.onez
    .connect(user)
    .approve(core.debtTokenOnezProxy.address, e18.mul(amount));

  await core.stabilityPool.connect(user).provideToSP(e18.mul(amount));
};

export const withdrawFromSP = async (
  core: ICoreContracts,
  user: SignerWithAddress,
  amount: BigNumber
) => {
  await core.stabilityPool.connect(user).withdrawFromSP(e18.mul(amount));
};
