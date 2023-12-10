// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "../interfaces/ILendingPool.sol";
import "../interfaces/IWETH.sol";
import "../interfaces/IWrappedLendingCollateral.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract WrappedLendingCollateral is
    ReentrancyGuard,
    IWrappedLendingCollateral,
    ERC20
{
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;

    ILendingPool public pool;
    IWETH public underlying;
    IERC20 public aToken;
    bool public enableETH;
    address public borrowerOperations;

    constructor(
        string memory name,
        string memory symbol,
        ILendingPool _pool,
        IWETH _underlying,
        address _borrowerOperations
    ) ERC20(name, symbol) {
        pool = _pool;
        underlying = _underlying;
        borrowerOperations = _borrowerOperations;

        // get the atoken
        ILendingPool.ReserveData memory data = pool.getReserveData(
            address(underlying)
        );
        aToken = IERC20(data.aTokenAddress);

        // give approval to the pool
        aToken.approve(address(_pool), type(uint256).max);
        IERC20(underlying).approve(address(_pool), type(uint256).max);
    }

    function mint(uint256 amount) external payable override {
        _mintFrom(msg.sender, msg.sender, amount);
    }

    function mintPrivileged(
        address from,
        address to,
        uint256 amount
    ) external payable override {
        require(msg.sender == borrowerOperations, "only BO");
        _mintFrom(from, to, amount);
    }

    function burnTo(address to, uint256 amount) external override {
        _burnWithdraw(msg.sender, to, amount);
    }

    function _burnWithdraw(
        address from,
        address to,
        uint256 amount
    ) internal nonReentrant {
        if (amount == 0) return;

        uint256 percentageOfSupply = (amount * 1e18) / totalSupply();
        uint256 aTokensHeld = aToken.balanceOf(address(this));
        uint256 aTokensToRedeem = (aTokensHeld * percentageOfSupply) / 1e18;

        _burn(from, amount);

        pool.withdraw(address(underlying), aTokensToRedeem, to);
    }

    function _mintFrom(
        address from,
        address to,
        uint256 amount
    ) internal nonReentrant {
        _mint(to, amount);

        if (msg.value == amount) underlying.deposit{value: msg.value}();

        uint256 bal = underlying.balanceOf(address(this));
        if (amount - bal > 0)
            underlying.safeTransferFrom(from, address(this), amount - bal);

        pool.supply(address(underlying), amount, address(this), 0);
    }
}
