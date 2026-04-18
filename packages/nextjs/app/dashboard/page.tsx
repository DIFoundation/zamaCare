'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMarketplace as useMarketplaceHook } from '~~/hooks/useMarketplace';
import { useEscrow as useEscrowHook } from '~~/hooks/useEscrow';
import { AdminDashboard } from '~~/components/dashboard/AdminDashboard';
import { SellerDashboard } from '~~/components/dashboard/SellerDashboard';
import { BuyerDashboard } from '~~/components/dashboard/BuyerDashboard';
import { RainbowKitCustomConnectButton } from '~~/components/helper';
import { Address } from 'viem';

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const { reads: { useIsSeller, useSeller, useSellerProducts, useBuyerOrders, useSellerOrders, useProductCount, useProducts, useOwner: useMarketplaceOwner } } = useMarketplaceHook();
  const { reads: { useBuyerEscrows, useSellerEscrows, useOwner: useEscrowOwner } } = useEscrowHook();

  const marketplaceOwner = useMarketplaceOwner();
  const escrowOwner = useEscrowOwner();
  const isSeller = useIsSeller(address as Address);

  const userRole = marketplaceOwner.data === address && escrowOwner.data === address 
    ? 'ADMIN' : (isSeller.data === true) 
    ? 'SELLER' : 'BUYER';
  const seller = useSeller(address as Address)
  const sellerProducts = useSellerProducts(address as Address)
  const buyerOrders = useBuyerOrders(address as Address)
  const sellerOrders = useSellerOrders(address as Address)
  const productCount = useProductCount()

  const productIDs = productCount
    ? Array.from({ length: Number(productCount) }, (_, i) => BigInt(i + 1))
    : [];

  const { data: allProducts, isLoading } = useProducts(productIDs);

  const buyerEscrows = useBuyerEscrows(address as Address);
  const sellerEscrows = useSellerEscrows(address as Address);

  // Get tabs based on user role
  const getRoleTabs = () => {
    switch (userRole) {
      case 'ADMIN':
        return ['escrows', 'disputes', 'sellers', 'orders', 'settings', 'emergency'];
      case 'SELLER':
        return ['products', 'orders', 'escrows', 'store'];
      case 'BUYER':
        return ['overview', 'orders', 'escrows', 'settings'];
      default:
        return ['overview'];
    }
  };

  const roleTabs = getRoleTabs();

  const [activeTab, setActiveTab] = useState(() => {
    const defaultTabs = {
      'ADMIN': 'escrows',
      'SELLER': 'products',
      'BUYER': 'orders'
    };
    return defaultTabs[userRole] || 'overview';
  });


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔐</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access your dashboard
          </p>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <AdminDashboard
            activeTab={activeTab}
          />
        );
      case 'SELLER':
        return (
          <SellerDashboard
            activeTab={activeTab}
            isSeller={true}
          />
        );
      case 'BUYER':
        return (
          <BuyerDashboard
            activeTab={activeTab}
          />
        );
      default:
        return (
          <BuyerDashboard
            activeTab={activeTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${userRole === 'ADMIN' ? 'bg-purple-500' :
                  userRole === 'SELLER' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                <span className="text-sm font-medium text-gray-700">
                  {userRole} Dashboard
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {roleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderDashboard()}
      </div>
    </div>
  );
}
