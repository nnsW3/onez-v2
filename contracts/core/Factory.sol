// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../dependencies/PrismaOwnable.sol";
import "../interfaces/ITroveManager.sol";
import "../interfaces/IBorrowerOperations.sol";
import "../interfaces/IDebtTokenOnezProxy.sol";
import "../interfaces/ISortedTroves.sol";
import "../interfaces/IStabilityPool.sol";
import "../interfaces/ILiquidationManager.sol";
import "../interfaces/IWrappedLendingCollateral.sol";

/**
    @title Prisma Trove Factory
    @notice Deploys cloned pairs of `TroveManager` and `SortedTroves` in order to
            add new collateral types within the system.
 */
contract Factory is Initializable, PrismaOwnable {
    using Clones for address;

    // fixed single-deployment contracts
    IDebtTokenOnezProxy public debtToken;
    IStabilityPool public stabilityPool;
    ILiquidationManager public liquidationManager;
    IBorrowerOperations public borrowerOperations;

    // implementation contracts, redeployed each time via clone proxy
    address public sortedTrovesImpl;
    address public troveManagerImpl;

    address[] public troveManagers;

    // commented values are suggested default parameters
    struct DeploymentParams {
        address gasPoolAddress;
        address debtTokenAddress;
        address borrowerOperationsAddress;
        address vault;
        address liquidationManager;
        address collateral;
        address priceFeed;
        uint256 minuteDecayFactor; // 999037758833783000  (half life of 12 hours)
        uint256 redemptionFeeFloor; // 1e18 / 1000 * 5  (0.5%)
        uint256 maxRedemptionFee; // 1e18  (100%)
        uint256 borrowingFeeFloor; // 1e18 / 1000 * 5  (0.5%)
        uint256 maxBorrowingFee; // 1e18 / 100 * 5  (5%)
        uint256 interestRateInBps; // 100 (1%)
        uint256 maxDebt;
        uint256 MCR; // 12 * 1e17  (120%)
    }

    event NewDeployment(
        address collateral,
        address priceFeed,
        address troveManager,
        address sortedTroves
    );

    constructor(address _prismaCore) PrismaOwnable(_prismaCore) {}

    function initialize(
        IDebtTokenOnezProxy _debtToken,
        IStabilityPool _stabilityPool,
        IBorrowerOperations _borrowerOperations,
        address _sortedTroves,
        address _troveManager,
        ILiquidationManager _liquidationManager
    ) external initializer {
        debtToken = _debtToken;
        stabilityPool = _stabilityPool;
        borrowerOperations = _borrowerOperations;

        sortedTrovesImpl = _sortedTroves;
        troveManagerImpl = _troveManager;
        liquidationManager = _liquidationManager;
    }

    function troveManagerCount() external view returns (uint256) {
        return troveManagers.length;
    }

    function deployNewInstance(
        address customTroveManagerImpl,
        address customSortedTrovesImpl,
        DeploymentParams memory params
    ) external onlyOwner {
        address implementation = customTroveManagerImpl == address(0)
            ? troveManagerImpl
            : customTroveManagerImpl;
        address troveManager = implementation.cloneDeterministic(
            bytes32(bytes20(params.collateral))
        );
        troveManagers.push(troveManager);

        implementation = customSortedTrovesImpl == address(0)
            ? sortedTrovesImpl
            : customSortedTrovesImpl;
        address sortedTroves = implementation.cloneDeterministic(
            bytes32(bytes20(troveManager))
        );

        ITroveManager(troveManager).setAddresses(
            params.gasPoolAddress,
            params.debtTokenAddress,
            params.borrowerOperationsAddress,
            params.vault,
            params.liquidationManager,
            params.priceFeed,
            sortedTroves,
            params.collateral
        );
        ISortedTroves(sortedTroves).setAddresses(troveManager);

        // verify that the oracle is correctly working
        ITroveManager(troveManager).fetchPrice();

        stabilityPool.enableCollateral(
            address(IWrappedLendingCollateral(params.collateral).underlying())
        );
        liquidationManager.enableTroveManager(troveManager);
        debtToken.enableTroveManager(troveManager);
        borrowerOperations.configureCollateral(
            ITroveManager(troveManager),
            IWrappedLendingCollateral(params.collateral)
        );

        ITroveManager(troveManager).setParameters(
            params.minuteDecayFactor,
            params.redemptionFeeFloor,
            params.maxRedemptionFee,
            params.borrowingFeeFloor,
            params.maxBorrowingFee,
            params.interestRateInBps,
            params.maxDebt,
            params.MCR
        );

        emit NewDeployment(
            params.collateral,
            params.priceFeed,
            troveManager,
            sortedTroves
        );
    }

    function setImplementations(
        address _troveManagerImpl,
        address _sortedTrovesImpl
    ) external onlyOwner {
        troveManagerImpl = _troveManagerImpl;
        sortedTrovesImpl = _sortedTrovesImpl;
    }
}
