'use client';

import { useState } from 'react';
import { Address, formatEther, parseEther } from 'viem';
import { useAccount } from 'wagmi';
import { Product, Seller, OrderStatus, EscrowStatus } from '~~/types'
import { useEscrow } from '~~/hooks/useEscrow';
import { useMarketplace as useMarketplaceHook } from '~~/hooks/useMarketplace';

interface SellerDashboardProps {
  activeTab: string;
  isSeller: boolean;
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

export function SellerDashboard({ activeTab, isSeller }: SellerDashboardProps) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
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

  const seller = useSeller(address as Address);

  // Get seller-specific data from hooks
  const sellerOrders = useSellerOrders(address as Address);
  const sellerEscrows = useSellerEscrows(address as Address);
  const sellerProducts = useSellerProducts(address as Address);
  const productCount = useProductCount();
  
  const productIds = Array.from({ length: Number(productCount) }, (_, i) => i + 1);
  const allProducts = useProducts(productIds.map(id => BigInt(id)));

  // Transform real data from hooks to usable format
  const products = Array.isArray(sellerProducts) ? sellerProducts.map(productId => {
    const product = allProducts?.data?.find(p => p.id === productId);
    return product ? {
      id: product.id?.toString() || '0',
      seller: product.seller || '0x0000...0000',
      name: product.name || 'Unknown Product',
      description: product.description || '',
      price: product.price?.toString() || '0',
      stock: product.stock?.toString() || '0',
      ipfsHash: product.ipfsHash || '',
      isActive: product.isActive || false,
      createdAt: Number(product.createdAt) || Date.now() / 1000
    } : null;
  }).filter(Boolean) : [];

  const orders = Array.isArray(sellerOrders?.data) ? sellerOrders.data.map(order => ({
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

  const escrows = Array.isArray(sellerEscrows) ? sellerEscrows.map(escrow => ({
    id: escrow.id?.toString() || '0',
    orderId: escrow.orderId?.toString() || '0',
    buyer: escrow.buyer || '0x0000...0000',
    seller: escrow.seller || address,
    amount: escrow.amount?.toString() || '0',
    productId: escrow.productId?.toString() || '0',
    status: Number(escrow.status) || 0,
    createdAt: Number(escrow.createdAt) || Date.now() / 1000,
    disputeRaised: escrow.disputeRaised || false,
    disputeResolved: escrow.disputeResolved || false,
  })) : [];

  const handleCreateProduct = async () => {
    setLoading(true);
    try {
      await createProduct({
        name: productName,
        description: productDescription,
        price: parseEther(productPrice).toString(),
        stock: BigInt(productStock),
        ipfsHash: '',
      });
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductStock('');
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    setLoading(true);
    try {
      await fulfillOrder(BigInt(orderId));
    } catch (error) {
      console.error('Error fulfilling order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (escrowId: string) => {
    setLoading(true);
    try {
      await releasePayment(BigInt(escrowId));
    } catch (error) {
      console.error('Error releasing payment:', error);
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
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="My Products" value={products.length.toString()} icon="📦" />
        <StatCard title="Total Orders" value={orders.length.toString()} icon="🛒" />
        <StatCard title="Escrow Count" value={escrows.length.toString()} icon="🔄" />
        <StatCard title="Store Status" value={seller.data?.[3] ? 'Registered' : 'Not Registered'} icon="🏪" />
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
        <div className="space-y-3">
          {orders.slice(0, 3).map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🛒</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Order #{order.id}</div>
                  <div className="text-xs text-gray-500">Product ID: {order.productId} • Qty: {order.quantity}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{formatEther(BigInt(BigInt(order.totalAmount)))} ETH</div>
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
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">🛒</span>
              <p>No orders yet</p>
              <p className="text-sm">Orders will appear here when customers buy your products</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProductsTab = () => (
    <div className="space-y-6">
      {/* Product Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Products</p>
            <p className="text-2xl font-bold text-blue-900">{products.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Active</p>
            <p className="text-2xl font-bold text-green-900">{products.filter(p => p?.isActive).length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Total Stock</p>
            <p className="text-2xl font-bold text-purple-900">
              {products.reduce((sum, product) => sum + Number(product?.stock), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Product Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Product</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (ETH)</label>
            <input
              type="text"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
            <input
              type="text"
              value={productStock}
              onChange={(e) => setProductStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleCreateProduct}
          disabled={loading || !productName || !productDescription || !productPrice || !productStock}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Product'}
        </button>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Products</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product?.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product?.name}</div>
                        <div className="text-xs text-gray-500">ID: #{product?.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatEther(BigInt(product?.price ?? '0'))} ETH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product?.stock.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product?.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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
            <p className="text-sm font-medium text-purple-600">Total Revenue</p>
            <p className="text-2xl font-bold text-purple-900">
              {orders.reduce((sum, order) => sum + Number(formatEther(BigInt(order.totalAmount))), 0).toFixed(4)} ETH
            </p>
          </div>
        </div>
      </div>

      {/* ... rest of the code remains the same ... */}
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

      {/* ... rest of the code remains the same ... */}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Store Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Store Name</span>
              <span className="text-sm font-medium text-gray-900">{seller.data?.[1] || 'Not Registered'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Store Description</span>
              <span className="text-sm font-medium text-gray-900">{seller.data?.[2] || 'Not Registered'}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Store Address</span>
              <span className="text-sm font-medium text-gray-900">{seller.data?.[0] || 'No Address'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Registration Status</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                seller.data?.[3] ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {seller.data?.[3] ? 'Registered' : 'Not Registered'}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created At:</span>
              <span className="text-sm font-medium text-gray-900">{seller.data?.[4] || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'products':
        return renderProductsTab();
      case 'orders':
        return renderOrdersTab();
      case 'escrows':
        return renderEscrowsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
}
