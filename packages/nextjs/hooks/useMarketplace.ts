"use client";
import { useState, useCallback } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseEther, type Address } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { debounceAsync } from "~~/utils/helper/debounce";


import { parseAbi } from "viem";
import { notification } from "~~/utils/helper/notification";

// ─── Hook ────────────────────────────────────────────────────────────────────
 
/**
 * useMarketplace
 *
 * A complete wagmi hook for the Marketplace contract.
 *
 * @example
 * const {
 *   reads: { useProductCount, useProducts, useIsSeller },
 *   writes: { registerSeller, createProduct, createOrder },
 * } = useMarketplace("0xYourContractAddress");
 */

const contract = deployedContracts[11155111].Marketplace;

export function useMarketplace() {
  const { writeContractAsync } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
 
  const { isLoading: isTxPending, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({ hash: pendingTxHash });
 
  // Helper: write + track tx
  const send = useCallback(
    async (functionName: string, args: unknown[], value?: bigint) => {
      const hash = await writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: functionName as never,
        args: args as never,
        ...(value !== undefined ? { value } : {}),
      });
      setPendingTxHash(hash);
      return hash;
    },
    [writeContractAsync]
  );
 
  // ── Read hooks ─────────────────────────────────────────────────────────────
 
  /** Total number of products ever created */
  const useProductCount = () =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getProductCount",
    });
 
  /** Total number of orders ever created */
  const useOrderCount = () =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getOrderCount",
    });
 
  /** Fetch multiple products by their IDs */
  const useProducts = (productIds: bigint[]) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getProducts",
      args: [productIds],
      query: { enabled: Number(productIds) > 0 },
    });
 
  /** Single product from the products mapping */
  const useProduct = (productId: bigint) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "products",
      args: [productId],
    });
 
  /** Single order from the orders mapping */
  const useOrder = (orderId: bigint) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "orders",
      args: [orderId],
    });
 
  /** All order IDs for a buyer */
  const useBuyerOrders = (buyer: Address) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getBuyerOrders",
      args: [buyer],
      query: { enabled: Boolean(buyer) },
    });
 
  /** All order IDs for a seller */
  const useSellerOrders = (seller: Address) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getSellerOrders",
      args: [seller],
      query: { enabled: Boolean(seller) },
    });
 
  /** All product IDs listed by a seller */
  const useSellerProducts = (seller: Address) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getSellerProducts",
      args: [seller],
      query: { enabled: Boolean(seller) },
    });
 
  /** Check if an address is a registered seller */
  const useIsSeller = (address: Address) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "isSeller",
      args: [address],
      query: { enabled: Boolean(address) },
    });
 
  /** Seller profile data */
  const useSeller = (seller: Address) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "sellers",
      args: [seller],
      query: { enabled: Boolean(seller) },
    });
 
  /** Encrypted price for a product (euint32 / bytes32) */
  const useEncryptedPrice = (productId: bigint) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "getEncryptedPrice",
      args: [productId],
    });
 
  /** Escrow contract address */
  const useEscrowContract = () =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "escrowContract",
    });
 
  /** Contract owner address */
  const useOwner = () =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "owner",
    });
 
  /** Resolve escrowId → orderId */
  const useEscrowToOrder = (escrowId: bigint) =>
    useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: "escrowToOrder",
      args: [escrowId],
    });
 
  // ── Write functions ────────────────────────────────────────────────────────
 
  /**
   * Register the caller as a seller.
   * @param storeName - store display name
   * @param description - store description
   */
  const registerSeller = useCallback(
    debounceAsync(
      (storeName: string, description: string) =>
        send("registerSeller", [storeName, description]),
      1000 // 1 second debounce
    ),
    [send]
  );
 
  /**
   * Create a new product listing.
   * Returns the new productId via transaction receipt logs.
   */
  const createProduct = useCallback(
    (params: {
      name: string;
      description: string;
      price: bigint;
      stock: bigint;
      ipfsHash: string;
    }) =>
      send("createProduct", [
        params.name,
        params.description,
        params.price,
        params.stock,
        params.ipfsHash,
      ]),
    [send]
  );
 
  /**
   * Update price, stock, and active status of an existing product.
   */
  const updateProduct = useCallback(
    (params: {
      productId: bigint;
      price: bigint;
      stock: bigint;
      isActive: boolean;
    }) =>
      send("updateProduct", [
        params.productId,
        params.price,
        params.stock,
        params.isActive,
      ]),
    [send]
  );
 
  /**
   * Remove a product listing permanently.
   */
  const removeProduct = useCallback(
    (productId: bigint) => send("removeProduct", [productId]),
    [send]
  );
 
  /**
   * Place an order for a product.
   * @param value - ETH to send (totalAmount = price × quantity)
   */
  const createOrder = useCallback(
    (params: {
      productId: bigint;
      quantity: bigint;
      shippingAddress: string;
      value: bigint; // price * quantity in wei
    }) =>
      send(
        "createOrder",
        [params.productId, params.quantity, params.shippingAddress],
        params.value
      ),
    [send]
  );
 
  /**
   * Seller marks an order as fulfilled / shipped.
   */
  const fulfillOrder = useCallback(
    (orderId: bigint) => send("fulfillOrder", [orderId]),
    [send]
  );
 
  /**
   * Buyer confirms receipt; releases escrow funds to seller.
   */
  const confirmOrder = useCallback(
    (orderId: bigint) => send("confirmOrder", [orderId]),
    [send]
  );
 
  /**
   * Cancel a pending order (buyer or seller).
   */
  const cancelOrder = useCallback(
    (orderId: bigint) => send("cancelOrder", [orderId]),
    [send]
  );
 
  /**
   * Raise a dispute on a fulfilled order.
   */
  const raiseDispute = useCallback(
    (orderId: bigint) => send("raiseDispute", [orderId]),
    [send]
  );
 
  /**
   * Called by escrow contract after dispute resolution.
   * (owner / escrow contract only)
   */
  const onDisputeResolved = useCallback(
    (escrowId: bigint, releasedToSeller: boolean) =>
      send("onDisputeResolved", [escrowId, releasedToSeller]),
    [send]
  );
 
  /**
   * Update the escrow contract address (owner only).
   */
  const setEscrowContract = useCallback(
    (escrow: Address) => send("setEscrowContract", [escrow]),
    [send]
  );
 
  /**
   * Transfer contract ownership (owner only).
   */
  const transferOwnership = useCallback(
    (newOwner: Address) => send("transferOwnership", [newOwner]),
    [send]
  );
 
  // ── Return ─────────────────────────────────────────────────────────────────
 
  return {
    /** Read hooks — call these inside your component */
    reads: {
      useProductCount,
      useOrderCount,
      useProducts,
      useProduct,
      useOrder,
      useBuyerOrders,
      useSellerOrders,
      useSellerProducts,
      useIsSeller,
      useSeller,
      useEncryptedPrice,
      useEscrowContract,
      useOwner,
      useEscrowToOrder,
    },
 
    /** Write functions — async, return tx hash */
    writes: {
      registerSeller,
      createProduct,
      updateProduct,
      removeProduct,
      createOrder,
      fulfillOrder,
      confirmOrder,
      cancelOrder,
      raiseDispute,
      onDisputeResolved,
      setEscrowContract,
      transferOwnership,
    },
 
    /** Transaction state for the most recently sent write */
    tx: {
      hash: pendingTxHash,
      isPending: isTxPending,
      isSuccess: isTxSuccess,
    },
  };
}
 

