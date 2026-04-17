'use client';

import React, { useState, useEffect } from 'react';
import { Cart, CartItem } from '~~/types';
import { useMarketplace } from '~~/hooks/useMarketplace';
import { useAccount } from 'wagmi';

export const CartContext = React.createContext<{
  cart: Cart;
  addToCart: (productId: bigint, quantity?: number) => void;
  removeFromCart: (productId: bigint) => void;
  updateQuantity: (productId: bigint, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: bigint) => boolean;
  getCartItem: (productId: bigint) => CartItem | undefined;
  formatPrice: (price: bigint) => string;
}>({
  cart: {
    items: [],
    totalItems: 0,
    totalAmount: BigInt(0),
    updatedAt: new Date(),
  },
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  isInCart: () => false,
  getCartItem: () => undefined,
  formatPrice: () => '0.0000',
});

// Custom hook to fetch product by ID
export function useProductFetcher() {
  const { allProducts, loadingAllProducts } = useMarketplace();
  
  const product = (productId: bigint) => {
    return allProducts.find(p => p.id === productId);
  };
  
  return { product, isLoading: loadingAllProducts };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { product } = useProductFetcher();
  
  const [cart, setCart] = useState<Cart>({
    items: [],
    totalItems: 0,
    totalAmount: BigInt(0),
    updatedAt: new Date(),
  });

  // Load cart from localStorage on mount and when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const savedCart = localStorage.getItem(`cart_${address}`);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart({
            ...parsedCart,
            totalAmount: BigInt(parsedCart.totalAmount),
            updatedAt: new Date(parsedCart.updatedAt),
            items: parsedCart.items.map((item: CartItem) => ({
              ...item,
              addedAt: new Date(item.addedAt),
              product: {
                ...item.product,
                price: BigInt(item.product.price),
                stock: BigInt(item.product.stock),
                id: BigInt(item.product.id),
                createdAt: BigInt(item.product.createdAt),
              },
            })),
          });
        } catch (error) {
          console.error('Failed to parse cart:', error);
          clearCart();
        }
      }
    } else {
      clearCart();
    }
  }, [isConnected, address]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isConnected && address) {
      const serializableCart = {
        ...cart,
        totalAmount: cart.totalAmount.toString(),
        items: cart.items.map(item => ({
          ...item,
          productId: item.productId.toString(),
          product: {
            ...item.product,
            id: item.product.id.toString(),
            price: item.product.price.toString(),
            stock: item.product.stock.toString(),
            createdAt: item.product.createdAt.toString(),
          },
          addedAt: item.addedAt.toISOString(),
        })),
        updatedAt: cart.updatedAt.toISOString(),
      };
      localStorage.setItem(`cart_${address}`, JSON.stringify(serializableCart));
    }
  }, [cart, isConnected, address]);

  const addToCart = (productId: bigint, quantity: number = 1) => {
    const productData = product(productId);
    if (!productData) return;

    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(
        item => item.productId === productId
      );

      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        // Update existing item
        newItems = [...prevCart.items];
        const existingItem = newItems[existingItemIndex];
        newItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          addedAt: new Date(),
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          productId,
          product: productData,
          quantity,
          addedAt: new Date(),
        };
        newItems = [...prevCart.items, newItem];
      }

      const newTotalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const newTotalAmount = newItems.reduce(
        (sum, item) => sum + (item.product.price * BigInt(item.quantity)),
        BigInt(0)
      );

      return {
        items: newItems,
        totalItems: newTotalItems,
        totalAmount: newTotalAmount,
        updatedAt: new Date(),
      };
    });
  };

  const removeFromCart = (productId: bigint) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.productId !== productId);
      const newTotalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const newTotalAmount = newItems.reduce(
        (sum, item) => sum + (item.product.price * BigInt(item.quantity)),
        BigInt(0)
      );

      return {
        items: newItems,
        totalItems: newTotalItems,
        totalAmount: newTotalAmount,
        updatedAt: new Date(),
      };
    });
  };

  const updateQuantity = (productId: bigint, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const productData = product(productId);
    if (!productData || quantity > Number(productData.stock)) return;

    setCart(prevCart => {
      const newItems = prevCart.items.map(item =>
        item.productId === productId
          ? { ...item, quantity, addedAt: new Date() }
          : item
      );

      const newTotalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const newTotalAmount = newItems.reduce(
        (sum, item) => sum + (item.product.price * BigInt(item.quantity)),
        BigInt(0)
      );

      return {
        items: newItems,
        totalItems: newTotalItems,
        totalAmount: newTotalAmount,
        updatedAt: new Date(),
      };
    });
  };

  const clearCart = () => {
    setCart({
      items: [],
      totalItems: 0,
      totalAmount: BigInt(0),
      updatedAt: new Date(),
    });
  };

  const isInCart = (productId: bigint) => {
    return cart.items.some(item => item.productId === productId);
  };

  const getCartItem = (productId: bigint) => {
    return cart.items.find(item => item.productId === productId);
  };

  const formatPrice = (price: bigint) => {
    return (Number(price) / 1e18).toFixed(4);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        getCartItem,
        formatPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}