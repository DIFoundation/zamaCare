// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Escrow} from "./Escrow.sol";

/**
 * @title Marketplace
 * @notice Decentralized multi-vendor marketplace for listing and purchasing products
 * @dev Handles seller registration, product management, and order creation
 */
contract Marketplace {
    // ============ Errors ============
    error Marketplace__NotSeller();
    error Marketplace__AlreadySeller();
    error Marketplace__InvalidPrice();
    error Marketplace__ProductNotFound();
    error Marketplace__NotProductOwner();
    error Marketplace__ProductNotActive();
    error Marketplace__OrderNotFound();
    error Marketplace__Unauthorized();
    error Marketplace__InvalidIPFSHash();
    error Marketplace__EscrowNotSet();

    // ============ Types ============
    enum OrderStatus {
        PENDING,
        PAID,
        FULFILLED,
        COMPLETED,
        REFUNDED,
        CANCELLED
    }

    struct Seller {
        address sellerAddress;
        string storeName;
        string description;
        bool isActive;
        uint256 registeredAt;
    }

    struct Product {
        uint256 id;
        address seller;
        string name;
        string description;
        uint256 price;
        uint256 stock;
        string ipfsHash;
        bool isActive;
        uint256 createdAt;
    }

    struct Order {
        uint256 id;
        uint256 productId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalAmount;
        string shippingAddress;
        OrderStatus status;
        uint256 createdAt;
        uint256 escrowId;
    }

    // ============ State Variables ============
    uint256 public productCounter;
    uint256 public orderCounter;
    address public owner;
    Escrow public escrowContract;

    mapping(address => Seller) public sellers;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public sellerProducts;
    mapping(address => uint256[]) public buyerOrders;
    mapping(address => uint256[]) public sellerOrders;

    // ============ Events ============
    event SellerRegistered(
        address indexed seller,
        string storeName,
        uint256 registeredAt
    );
    event ProductCreated(
        uint256 indexed productId,
        address indexed seller,
        string name,
        uint256 price
    );
    event ProductUpdated(
        uint256 indexed productId,
        uint256 newPrice,
        uint256 newStock,
        bool isActive
    );
    event ProductRemoved(uint256 indexed productId, address indexed seller);
    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed productId,
        address indexed buyer,
        address seller,
        uint256 totalAmount,
        uint256 escrowId
    );
    event OrderStatusChanged(
        uint256 indexed orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus
    );

    // ============ Modifiers ============
    modifier onlySeller() {
        if (!sellers[msg.sender].isActive) revert Marketplace__NotSeller();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Marketplace__Unauthorized();
        _;
    }

    modifier productExists(uint256 _productId) {
        if (products[_productId].id == 0) revert Marketplace__ProductNotFound();
        _;
    }

    modifier orderExists(uint256 _orderId) {
        if (orders[_orderId].id == 0) revert Marketplace__OrderNotFound();
        _;
    }

    // ============ Constructor ============
    constructor(address payable _escrowContract) {
        owner = msg.sender;
        escrowContract = Escrow(_escrowContract);
    }

    // ============ External Functions ============

    /**
     * @notice Register as a seller
     * @param _storeName Name of the store
     * @param _description Description of the store
     */
    function registerSeller(
        string calldata _storeName,
        string calldata _description
    ) external {
        if (sellers[msg.sender].isActive) revert Marketplace__AlreadySeller();

        sellers[msg.sender] = Seller({
            sellerAddress: msg.sender,
            storeName: _storeName,
            description: _description,
            isActive: true,
            registeredAt: block.timestamp
        });

        emit SellerRegistered(msg.sender, _storeName, block.timestamp);
    }

    /**
     * @notice Create a new product listing
     * @param _name Product name
     * @param _description Product description
     * @param _price Price in wei
     * @param _stock Available quantity
     * @param _ipfsHash IPFS hash of product images/metadata
     */
    function createProduct(
        string calldata _name,
        string calldata _description,
        uint256 _price,
        uint256 _stock,
        string calldata _ipfsHash
    ) external onlySeller returns (uint256) {
        if (_price == 0) revert Marketplace__InvalidPrice();
        if (bytes(_ipfsHash).length == 0) revert Marketplace__InvalidIPFSHash();

        productCounter++;
        uint256 productId = productCounter;

        products[productId] = Product({
            id: productId,
            seller: msg.sender,
            name: _name,
            description: _description,
            price: _price,
            stock: _stock,
            ipfsHash: _ipfsHash,
            isActive: true,
            createdAt: block.timestamp
        });

        sellerProducts[msg.sender].push(productId);

        emit ProductCreated(productId, msg.sender, _name, _price);

        return productId;
    }

    /**
     * @notice Update an existing product
     * @param _productId Product ID to update
     * @param _price New price
     * @param _stock New stock quantity
     * @param _isActive Whether product is active
     */
    function updateProduct(
        uint256 _productId,
        uint256 _price,
        uint256 _stock,
        bool _isActive
    ) external onlySeller productExists(_productId) {
        Product storage product = products[_productId];

        if (product.seller != msg.sender)
            revert Marketplace__NotProductOwner();
        if (_price == 0) revert Marketplace__InvalidPrice();

        product.price = _price;
        product.stock = _stock;
        product.isActive = _isActive;

        emit ProductUpdated(_productId, _price, _stock, _isActive);
    }

    /**
     * @notice Remove a product listing
     * @param _productId Product ID to remove
     */
    function removeProduct(
        uint256 _productId
    ) external onlySeller productExists(_productId) {
        Product storage product = products[_productId];

        if (product.seller != msg.sender)
            revert Marketplace__NotProductOwner();

        product.isActive = false;

        emit ProductRemoved(_productId, msg.sender);
    }

    /**
     * @notice Create a new order
     * @param _productId Product to purchase
     * @param _quantity Number of items
     * @param _shippingAddress Shipping information
     */
    function createOrder(
        uint256 _productId,
        uint256 _quantity,
        string calldata _shippingAddress
    )
        external
        payable
        productExists(_productId)
        returns (uint256 orderId, uint256 escrowId)
    {
        Product storage product = products[_productId];

        if (!product.isActive) revert Marketplace__ProductNotActive();
        if (product.stock < _quantity) revert Marketplace__InvalidPrice();
        if (product.seller == msg.sender)
            revert Marketplace__Unauthorized(); // Can't buy own product

        uint256 totalAmount = product.price * _quantity;
        if (msg.value != totalAmount) revert Marketplace__InvalidPrice();

        // Create escrow
        escrowId = escrowContract.createEscrow{value: msg.value}(
            msg.sender,
            product.seller,
            _productId
        );

        // Create order
        orderCounter++;
        orderId = orderCounter;

        orders[orderId] = Order({
            id: orderId,
            productId: _productId,
            buyer: msg.sender,
            seller: product.seller,
            quantity: _quantity,
            totalAmount: totalAmount,
            shippingAddress: _shippingAddress,
            status: OrderStatus.PAID,
            createdAt: block.timestamp,
            escrowId: escrowId
        });

        // Update stock
        product.stock -= _quantity;

        // Track orders
        buyerOrders[msg.sender].push(orderId);
        sellerOrders[product.seller].push(orderId);

        emit OrderCreated(
            orderId,
            _productId,
            msg.sender,
            product.seller,
            totalAmount,
            escrowId
        );
        emit OrderStatusChanged(orderId, OrderStatus.PENDING, OrderStatus.PAID);

        return (orderId, escrowId);
    }

    /**
     * @notice Confirm order fulfillment by buyer
     * @param _orderId Order ID to confirm
     */
    function confirmOrder(
        uint256 _orderId
    ) external orderExists(_orderId) {
        Order storage order = orders[_orderId];

        if (order.buyer != msg.sender) revert Marketplace__Unauthorized();
        if (order.status != OrderStatus.PAID) revert Marketplace__Unauthorized();

        // Release escrow funds to seller
        escrowContract.releasePayment(order.escrowId);

        OrderStatus oldStatus = order.status;
        order.status = OrderStatus.COMPLETED;

        emit OrderStatusChanged(_orderId, oldStatus, OrderStatus.COMPLETED);
    }

    /**
     * @notice Cancel order and refund (only before fulfillment)
     * @param _orderId Order ID to cancel
     */
    function cancelOrder(uint256 _orderId) external orderExists(_orderId) {
        Order storage order = orders[_orderId];

        if (order.buyer != msg.sender && order.seller != msg.sender)
            revert Marketplace__Unauthorized();
        if (order.status != OrderStatus.PAID) revert Marketplace__Unauthorized();

        // Refund through escrow
        escrowContract.refund(order.escrowId);

        // Restore stock
        Product storage product = products[order.productId];
        product.stock += order.quantity;

        OrderStatus oldStatus = order.status;
        order.status = OrderStatus.CANCELLED;

        emit OrderStatusChanged(_orderId, oldStatus, OrderStatus.CANCELLED);
    }

    // ============ View Functions ============

    /**
     * @notice Get all products by a seller
     * @param _seller Seller address
     */
    function getSellerProducts(
        address _seller
    ) external view returns (uint256[] memory) {
        return sellerProducts[_seller];
    }

    /**
     * @notice Get all orders by a buyer
     * @param _buyer Buyer address
     */
    function getBuyerOrders(
        address _buyer
    ) external view returns (uint256[] memory) {
        return buyerOrders[_buyer];
    }

    /**
     * @notice Get all orders for a seller
     * @param _seller Seller address
     */
    function getSellerOrders(
        address _seller
    ) external view returns (uint256[] memory) {
        return sellerOrders[_seller];
    }

    /**
     * @notice Get multiple products at once
     * @param _productIds Array of product IDs
     */
    function getProducts(
        uint256[] calldata _productIds
    ) external view returns (Product[] memory) {
        Product[] memory result = new Product[](_productIds.length);

        for (uint256 i = 0; i < _productIds.length; i++) {
            result[i] = products[_productIds[i]];
        }

        return result;
    }

    /**
     * @notice Get total number of products
     */
    function getProductCount() external view returns (uint256) {
        return productCounter;
    }

    /**
     * @notice Get total number of orders
     */
    function getOrderCount() external view returns (uint256) {
        return orderCounter;
    }

    /**
     * @notice Check if address is registered seller
     */
    function isSeller(address _addr) external view returns (bool) {
        return sellers[_addr].isActive;
    }

    /**
     * @notice Update escrow contract address (only owner)
     */
    function setEscrowContract(address payable _escrow) external onlyOwner {
        escrowContract = Escrow(_escrow);
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
