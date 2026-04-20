'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { useEscrow } from '~~/hooks/useEscrow';
import { useMarketplace as useMarketplaceHook } from '~~/hooks/useMarketplace';
import { useAccount } from 'wagmi';
import { OrderStatus, EscrowStatus } from '~~/types';

interface BuyerDashboardProps {
  activeTab: string;
}

const StatCard = ({ title, value, change, icon }: { title: string; value: string; change?: string; icon: string }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        )}
      </div>
      <div className="text-2xl text-gray-400">
        {icon}
      </div>
    </div>
  </div>
);

export function BuyerDashboard({ activeTab }: BuyerDashboardProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [shippingAddress, setShippingAddress] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

  const { 
    reads: { useDisputeWindow, useAuctionContract, useMarketplace, useOwner: useEscrowOwner, useEscrowCounter, useEscrowById, useEscrowRaw, useBuyerEscrows, useSellerEscrows, useDisputeTimeRemaining, useIsDisputeWindowOpen, useEncryptedAmount },
    writes: { createEscrow, releasePayment, refund, raiseDispute: raiseEscrowDispute, resolveDispute, emergencyWithdraw, setMarketplace, setAuctionContract, transferOwnership: transferEscrowOwnership },
    tx: { hash: escrowTxHash, isPending: isEscrowTxPending, isSuccess: isEscrowTxSuccess }
  } = useEscrow();

  const { 
    reads: { useProductCount, useOrderCount, useProducts, useProduct, useOrder, useBuyerOrders, useSellerOrders, useSellerProducts, useIsSeller, useSeller, useEncryptedPrice, useEscrowContract, useOwner: useMarketplaceOwner, useEscrowToOrder },  
    writes: { registerSeller, createProduct, updateProduct, removeProduct, createOrder, fulfillOrder, confirmOrder, cancelOrder, raiseDispute: raiseMarketplaceDispute, onDisputeResolved, setEscrowContract, transferOwnership: transferMarketplaceOwnership },
    tx: { hash: marketplaceTxHash, isPending: isMarketplaceTxPending, isSuccess: isMarketplaceTxSuccess }
  } = useMarketplaceHook();

  // Get buyer-specific data
  const buyerOrders = useBuyerOrders(address || '0x');
  const buyerEscrows = useBuyerEscrows(address || '0x');
  const productCount = useProductCount();
  
  const productIds = Array.from({ length: Number(productCount) }, (_, i) => i + 1);

  const allProducts = useProducts(productIds.map(id => BigInt(id)));
  const selectedProduct = useProduct(selectedProductId ? BigInt(selectedProductId) : BigInt(0));

  // Transform real data from hooks to usable format
  const orders = Array.isArray(buyerOrders.data) ? buyerOrders.data.map(order => ({
    id: order[0] || '0',
    productId: order[1]?.toString() || '0',
    buyer: order[2] || '0x0000...0000',
    seller: order[3] || '0x0000...0000',
    quantity: order[4]?.toString() || '0',
    totalAmount: order[5]?.toString() || '0',
    shippingAddress: order[6] || '',
    status: Number(order[7]) || 0,
    createdAt: Number(order[8]) || Date.now() / 1000,
    escrowId: order[9]?.toString() || '0'
  })) : [];

  const escrows = Array.isArray(buyerEscrows) ? buyerEscrows.map(escrow => ({
    id: escrow.id?.toString() || '0',
    orderId: escrow.orderId?.toString() || '0',
    buyer: escrow.buyer || address,
    seller: escrow.seller || '0x0000...0000',
    amount: escrow.amount?.toString() || '0',
    productId: escrow.productId?.toString() || '0',
    status: Number(escrow.status) || 0,
    createdAt: Number(escrow.createdAt) || Date.now() / 1000,
    disputeRaised: escrow.disputeRaised || false,
    disputeResolved: escrow.disputeResolved || false,
  })) : [];

  const products = Array.isArray(allProducts) ? allProducts.map(product => ({
    id: product.id?.toString() || '0',
    seller: product.seller || '0x0000...0000',
    name: product.name || 'Unknown Product',
    description: product.description || '',
    price: product.price?.toString() || '0',
    stock: product.stock?.toString() || '0',
    ipfsHash: product.ipfsHash || '',
    isActive: product.isActive || false,
    createdAt: Number(product.createdAt) || Date.now() / 1000
  })) : [];

  const handleRaiseDispute = async (escrowId: string) => {
    setLoading(true);
    try {
      await raiseEscrowDispute(BigInt(escrowId));
    } catch (error) {
      console.error('Error raising dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await confirmOrder(BigInt(orderId));
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await cancelOrder(BigInt(orderId));
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsSeller = async () => {
    setLoading(true);
    try {
      await registerSeller(storeName, storeDescription);
    } catch (error) {
      console.error('Error registering as seller:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const renderOrdersTab = () => (
    <div className="space-y-6">
      {/* Order Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Orders</p>
            <p className="text-2xl font-bold text-blue-900">{orders.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-900">{orders.filter(o => o.status === 0).length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Completed</p>
            <p className="text-2xl font-bold text-green-900">{orders.filter(o => o.status === 3).length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Total Spent</p>
            <p className="text-2xl font-bold text-purple-900">
              {orders.reduce((sum, order) => sum + Number(formatEther(BigInt(order.totalAmount))), 0).toFixed(4)} ETH
            </p>
          </div>
        </div>
      </div>

      {/* Order List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Orders</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {products.find(p => p.id === order.productId)?.name || `Product ${order.productId}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.seller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEther(BigInt(order.totalAmount))} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      order.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 1 ? 'bg-blue-100 text-blue-800' :
                      order.status === 2 ? 'bg-purple-100 text-purple-800' :
                      order.status === 3 ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 0 ? 'Pending' :
                       order.status === 1 ? 'Paid' :
                       order.status === 2 ? 'Fulfilled' :
                       order.status === 3 ? 'Completed' : 'Cancelled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 2 && (
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Confirm
                      </button>
                    )}
                    {(order.status === 0 || order.status === 1) && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  const renderEscrowsTab = () => (
    <div className="space-y-6">
      {/* Escrow Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escrow Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Escrows</p>
            <p className="text-2xl font-bold text-blue-900">{escrows.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-900">{escrows.filter(e => e.status === 1).length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Total Value</p>
            <p className="text-2xl font-bold text-purple-900">
              {escrows.reduce((sum, escrow) => sum + Number(formatEther(BigInt(escrow.amount))), 0).toFixed(4)} ETH
            </p>
          </div>
        </div>
      </div>

      {/* Escrow List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Escrow Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escrow ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {escrows.map((escrow) => (
                <tr key={escrow.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{escrow.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {escrow.seller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEther(BigInt(escrow.amount))} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      escrow.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                      escrow.status === 1 ? 'bg-blue-100 text-blue-800' :
                      escrow.status === 2 ? 'bg-red-100 text-red-800' :
                      escrow.status === 3 ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {escrow.status === 0 ? 'Pending' :
                       escrow.status === 1 ? 'Paid' :
                       escrow.status === 2 ? 'Disputed' :
                       escrow.status === 3 ? 'Resolved' : 'Refunded'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      escrow.disputeRaised ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {escrow.disputeRaised ? 'Raised' : 'None'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Number(escrow.createdAt) * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {escrow.status === 1 && !escrow.disputeRaised && (
                      <button
                        onClick={() => handleRaiseDispute(escrow.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
                      >
                        Raise Dispute
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  const renderSettingTab = () => (
    <div className="space-y-6">
      {/* Create Order */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Become Seller</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleRegisterAsSeller}
          disabled={loading || !storeName || !storeDescription}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registering...' : 'Register as Seller'}
        </button>
      </div>
    </div>
  );
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return renderOrdersTab();
      case 'escrows':
        return renderEscrowsTab();
      case 'settings':
        return renderSettingTab();
      default:
        return renderOrdersTab();
    }
  };
  
  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
}
