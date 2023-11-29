// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IWrappedLendingCollateral.sol";
import "./ITroveManager.sol";
import "./IDelegatedOps.sol";
import "./IDebtTokenOnezProxy.sol";

interface IBorrowerOperations {
    struct TroveManagerData {
        IWrappedLendingCollateral collateralToken;
        uint16 index;
    }

    struct LocalVariables_adjustTrove {
        uint256 price;
        uint256 totalPricedCollateral;
        uint256 totalDebt;
        uint256 collChange;
        uint256 netDebtChange;
        bool isCollIncrease;
        uint256 debt;
        uint256 coll;
        uint256 newDebt;
        uint256 newColl;
        uint256 stake;
        uint256 debtChange;
        address account;
        uint256 MCR;
    }

    struct LocalVariables_openTrove {
        uint256 price;
        uint256 totalPricedCollateral;
        uint256 totalDebt;
        uint256 netDebt;
        uint256 compositeDebt;
        uint256 ICR;
        uint256 NICR;
        uint256 stake;
        uint256 arrayIndex;
    }

    enum BorrowerOperation {
        openTrove,
        closeTrove,
        adjustTrove
    }

    event BorrowingFeePaid(
        address indexed borrower,
        IWrappedLendingCollateral collateralToken,
        uint256 amount
    );
    event CollateralConfigured(
        ITroveManager troveManager,
        IWrappedLendingCollateral collateralToken
    );
    event TroveManagerRemoved(ITroveManager troveManager);

    struct Balances {
        uint256[] collaterals;
        uint256[] debts;
        uint256[] prices;
    }

    event CollateralConfigured(address troveManager, address collateralToken);
    event TroveCreated(address indexed _borrower, uint256 arrayIndex);
    event TroveManagerRemoved(address troveManager);
    event TroveUpdated(
        address indexed _borrower,
        uint256 _debt,
        uint256 _coll,
        uint256 stake,
        uint8 operation
    );

    function addColl(
        ITroveManager troveManager,
        address account,
        uint256 _collateralAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function adjustTrove(
        ITroveManager troveManager,
        address account,
        uint256 _maxFeePercentage,
        uint256 _collDeposit,
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function closeTrove(ITroveManager troveManager, address account) external;

    function configureCollateral(
        ITroveManager troveManager,
        IWrappedLendingCollateral collateralToken
    ) external;

    function fetchBalances() external returns (Balances memory balances);

    function getGlobalSystemBalances()
        external
        returns (uint256 totalPricedCollateral, uint256 totalDebt);

    function getTCR() external returns (uint256 globalTotalCollateralRatio);

    function openTrove(
        ITroveManager troveManager,
        address account,
        uint256 _maxFeePercentage,
        uint256 _collateralAmount,
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function removeTroveManager(ITroveManager troveManager) external;

    function repayDebt(
        ITroveManager troveManager,
        address account,
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external;

    function setMinNetDebt(uint256 _minNetDebt) external;

    function withdrawColl(
        ITroveManager troveManager,
        address account,
        uint256 _collWithdrawal,
        address _upperHint,
        address _lowerHint
    ) external;

    function withdrawDebt(
        ITroveManager troveManager,
        address account,
        uint256 _maxFeePercentage,
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external;

    function checkRecoveryMode(uint256 TCR) external pure returns (bool);

    function debtToken() external view returns (IDebtTokenOnezProxy);

    function factory() external view returns (address);

    function getCompositeDebt(uint256 _debt) external view returns (uint256);

    function minNetDebt() external view returns (uint256);

    function troveManagersData(
        ITroveManager
    )
        external
        view
        returns (IWrappedLendingCollateral collateralToken, uint16 index);
}
