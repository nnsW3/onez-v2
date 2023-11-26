// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ILendingPool.sol";

interface IWrappedLendingCollateral {
    function mint(uint256 amount) external;

    function aToken() external view returns (IERC20);

    function mintPrivileged(address from, address to, uint256 amount) external;

    function underlying() external view returns (IERC20);

    function pool() external view returns (ILendingPool);

    function burn(address to, uint256 amount) external;
}
