// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {FHE, euint32, ebool, inEuint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IMarketplace {
    function onDisputeResolved(uint256 _escrowId, bool releasedToSeller) external;
}

/**
 * @title Escrow
 * @notice Trustless payment escrow for marketplace transactions
 * @dev Handles fund locking, release to seller, refunds to buyer, and dispute resolution
 */
contract Escrow is ZamaEthereumConfig {
    // ============ Errors ============
    error Escrow__NotAuthorized();
    error Escrow__EscrowNotFound();
    error Escrow__AlreadyReleased();
    error Escrow__AlreadyRefunded();
    error Escrow__DisputeAlreadyRaised();
    error Escrow__NoDispute();
    error Escrow__DisputeWindowClosed();
    error Escrow__InvalidState();
    error Escrow__TransferFailed();
    error Escrow__ZeroAddress();
    error Escrow__InvalidAmount();

    // ============ Types ============
    enum EscrowStatus {
        PENDING,
        RELEASED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    struct EscrowData {
        uint256 id;
        uint256 orderId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 productId;
        EscrowStatus status;
        uint256 createdAt;
        uint256 disputeRaisedAt;
        address resolver;
    }

    // ============ State Variables ============
    uint256 public escrowCounter;
    address public owner;
    address public marketplace;
    uint256 public constant DISPUTE_WINDOW = 7 days;

    mapping(uint256 => EscrowData) public escrows;
    mapping(address => uint256[]) public buyerEscrows;
    mapping(address => uint256[]) public sellerEscrows;

    // ============ Events ============
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 productId
    );
    event PaymentReleased(
        uint256 indexed escrowId,
        address indexed seller,
        uint256 amount
    );
    event RefundIssued(
        uint256 indexed escrowId,
        address indexed buyer,
        uint256 amount
    );
    event DisputeRaised(
        uint256 indexed escrowId,
        address indexed raisedBy,
        uint256 raisedAt
    );
    event DisputeResolved(
        uint256 indexed escrowId,
        EscrowStatus resolution,
        address indexed resolver
    );
    event MarketplaceSet(address indexed marketplace);
    event ownershipTransfered(address indexed owner);
    event emergencyWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert Escrow__NotAuthorized();
        _;
    }

    modifier onlyMarketplace() {
        if (msg.sender != marketplace) revert Escrow__NotAuthorized();
        _;
    }

    modifier escrowExists(uint256 _escrowId) {
        if (escrows[_escrowId].id == 0) revert Escrow__EscrowNotFound();
        _;
    }

    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new escrow (called by Marketplace contract)
     * @param _buyer Address of the buyer
     * @param _seller Address of the seller
     * @param _productId Product being purchased
     * @return escrowId The ID of the created escrow
     */
    function createEscrow(
        address _buyer,
        address _seller,
        uint256 _productId,
        uint256 _orderId
    ) external payable onlyMarketplace returns (uint256) {
        if (_buyer == address(0) || _seller == address(0))
            revert Escrow__ZeroAddress();
        if (msg.value == 0) revert Escrow__InvalidAmount();

        escrowCounter++;
        uint256 escrowId = escrowCounter;

        escrows[escrowId] = EscrowData({
            id: escrowId,
            orderId: _orderId,
            buyer: _buyer,
            seller: _seller,
            amount: msg.value,
            productId: _productId,
            status: EscrowStatus.PENDING,
            createdAt: block.timestamp,
            disputeRaisedAt: 0,
            resolver: address(0)
        });

        buyerEscrows[_buyer].push(escrowId);
        sellerEscrows[_seller].push(escrowId);

        emit EscrowCreated(escrowId, _buyer, _seller, msg.value, _productId);

        return escrowId;
    }

    /**
     * @notice Release payment to seller (called by buyer confirming receipt)
     * @param _escrowId Escrow ID to release
     */
    function releasePayment(
        uint256 _escrowId
    ) external escrowExists(_escrowId) {
        EscrowData storage escrow = escrows[_escrowId];

        // Can be called by buyer or marketplace
        if (msg.sender != escrow.buyer && msg.sender != marketplace)
            revert Escrow__NotAuthorized();
        if (escrow.status != EscrowStatus.PENDING)
            revert Escrow__InvalidState();

        escrow.status = EscrowStatus.RELEASED;

        // Transfer funds to seller
        (bool success, ) = payable(escrow.seller).call{value: escrow.amount}(
            ""
        );
        if (!success) revert Escrow__TransferFailed();

        emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
    }

    /**
     * @notice Refund buyer (called by seller cancellation or dispute resolution)
     * @param _escrowId Escrow ID to refund
     */
    function refund(
        uint256 _escrowId
    ) external escrowExists(_escrowId) {
        EscrowData storage escrow = escrows[_escrowId];

        // Can be called by seller, marketplace, or owner (dispute resolver)
        if (
            msg.sender != escrow.seller &&
            msg.sender != marketplace &&
            msg.sender != owner
        ) revert Escrow__NotAuthorized();
        if (escrow.status != EscrowStatus.PENDING)
            revert Escrow__InvalidState();

        escrow.status = EscrowStatus.REFUNDED;

        // Transfer funds back to buyer
        (bool success, ) = payable(escrow.buyer).call{value: escrow.amount}(
            ""
        );
        if (!success) revert Escrow__TransferFailed();

        emit RefundIssued(_escrowId, escrow.buyer, escrow.amount);
    }

    /**
     * @notice Raise a dispute (buyer or seller can raise within dispute window)
     * @param _escrowId Escrow ID to dispute
     */
    function raiseDispute(
        uint256 _escrowId
    ) external escrowExists(_escrowId) {
        EscrowData storage escrow = escrows[_escrowId];

        // Only buyer or seller can raise dispute
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller)
            revert Escrow__NotAuthorized();
        if (escrow.status != EscrowStatus.PENDING)
            revert Escrow__InvalidState();
        if (block.timestamp > escrow.createdAt + DISPUTE_WINDOW)
            revert Escrow__DisputeWindowClosed();
        if (escrow.disputeRaisedAt != 0) revert Escrow__DisputeAlreadyRaised();

        escrow.status = EscrowStatus.DISPUTED;
        escrow.disputeRaisedAt = block.timestamp;

        emit DisputeRaised(_escrowId, msg.sender, block.timestamp);
    }

    /**
     * @notice Resolve a dispute (only owner/arbitrator)
     * @param _escrowId Escrow ID to resolve
     * @param _releaseToSeller If true, release to seller; if false, refund buyer
     */
    function resolveDispute(
        uint256 _escrowId,
        bool _releaseToSeller
    ) external onlyOwner escrowExists(_escrowId) {
        EscrowData storage escrow = escrows[_escrowId];

        if (escrow.status != EscrowStatus.DISPUTED)
            revert Escrow__NoDispute();

        escrow.status = EscrowStatus.RESOLVED;
        escrow.resolver = msg.sender;

        if (_releaseToSeller) {
            // Transfer to seller
            (bool success, ) = payable(escrow.seller).call{value: escrow.amount}(
                ""
            );
            if (!success) revert Escrow__TransferFailed();
        } else {
            // Refund to buyer
            (bool success, ) = payable(escrow.buyer).call{value: escrow.amount}(
                ""
            );
            if (!success) revert Escrow__TransferFailed();
        }

        IMarketplace(marketplace).onDisputeResolved(_escrowId, _releaseToSeller);

        emit DisputeResolved(
            _escrowId,
            _releaseToSeller ? EscrowStatus.RELEASED : EscrowStatus.REFUNDED,
            msg.sender
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get escrow details
     * @param _escrowId Escrow ID
     */
    function getEscrow(
        uint256 _escrowId
    ) external view returns (EscrowData memory) {
        return escrows[_escrowId];
    }

    /**
     * @notice Get all escrows for a buyer
     * @param _buyer Buyer address
     */
    function getBuyerEscrows(
        address _buyer
    ) external view returns (uint256[] memory) {
        return buyerEscrows[_buyer];
    }

    /**
     * @notice Get all escrows for a seller
     * @param _seller Seller address
     */
    function getSellerEscrows(
        address _seller
    ) external view returns (uint256[] memory) {
        return sellerEscrows[_seller];
    }

    /**
     * @notice Check if dispute window is still open
     * @param _escrowId Escrow ID
     */
    function isDisputeWindowOpen(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (bool) {
        EscrowData storage escrow = escrows[_escrowId];
        return block.timestamp <= escrow.createdAt + DISPUTE_WINDOW;
    }

    /**
     * @notice Get time remaining in dispute window
     * @param _escrowId Escrow ID
     */
    function getDisputeTimeRemaining(
        uint256 _escrowId
    ) external view escrowExists(_escrowId) returns (uint256) {
        EscrowData storage escrow = escrows[_escrowId];
        uint256 deadline = escrow.createdAt + DISPUTE_WINDOW;

        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the marketplace contract address
     * @param _marketplace Address of the marketplace contract
     */
    function setMarketplace(address _marketplace) external onlyOwner {
        if (_marketplace == address(0)) revert Escrow__ZeroAddress();
        marketplace = _marketplace;
        emit MarketplaceSet(_marketplace);
    }

    /**
     * @notice Transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert Escrow__ZeroAddress();
        owner = _newOwner;

        emit ownershipTransfered(_newOwner);
    }

    /**
     * @notice Emergency withdrawal (only owner, for stuck funds)
     * @param _to Address to send funds to
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(
        address payable _to,
        uint256 _amount
    ) external onlyOwner {
        (bool success, ) = _to.call{value: _amount}("");
        if (!success) revert Escrow__TransferFailed();

        emit emergencyWithdrawn(_to, _amount);
    }

    // ============ Receive ============
    receive() external payable {
        revert("Direct deposits not allowed");
    }
}
