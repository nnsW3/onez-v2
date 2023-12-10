// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./IWETH.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ILendingPool.sol";

interface IWrappedLendingCollateral is IERC20 {
    function mint(uint256 amount) external payable;

    function aToken() external view returns (IERC20);

    function mintPrivileged(
        address from,
        address to,
        uint256 amount
    ) external payable;

    function underlying() external view returns (IWETH);

    function pool() external view returns (ILendingPool);

    function burnTo(address to, uint256 amount) external;
}
