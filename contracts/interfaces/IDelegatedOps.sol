// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDelegatedOps {
    event DelegateApprovalSet(
        address indexed caller,
        address indexed delegate,
        bool isApproved
    );

    function isApprovedDelegate(
        address _delegate,
        address caller
    ) external returns (bool isApproved);

    function setDelegateApproval(address _delegate, bool _isApproved) external;
}
