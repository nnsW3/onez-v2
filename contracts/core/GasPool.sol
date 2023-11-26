// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
    @title Prisma Gas Pool
    @notice Placeholder contract for tokens to be used as gas compensation
            See https://github.com/liquity/dev#gas-compensation
 */
contract GasPool {
    // // do nothing, as the core contracts have permission to send to and burn from this address
    // function setAddresses(
    //     address _onez,
    //     address _troveManagerAddress,
    //     address _borrowerOperationAddress
    // ) external initializer {
    //     NAME = "GasPool";
    //     IERC20 onez = IERC20(_onez);
    //     // allow trovemanger or stability pool to spend from the gas pool
    //     onez.approve(_troveManagerAddress, type(uint256).max);
    //     onez.approve(_borrowerOperationAddress, type(uint256).max);
    // }
}
