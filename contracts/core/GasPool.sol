// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "../interfaces/IDebtTokenOnezProxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
    @title Prisma Gas Pool
    @notice Placeholder contract for tokens to be used as gas compensation
            See https://github.com/liquity/dev#gas-compensation
 */
contract GasPool is Initializable {
    function initialize(IDebtTokenOnezProxy debtToken) external initializer {
        // give approval for burns
        debtToken.underlying().approve(address(debtToken), type(uint256).max);
    }
}
