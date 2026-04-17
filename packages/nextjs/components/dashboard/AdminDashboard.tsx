'use client';

import { useState } from 'react';
import { useEscrow } from '~~/hooks/useEscrow';
import { useMarketplace as useMarketplaceHook } from '~~/hooks/useMarketplace';
import { EscrowStatus } from '~~/types';

interface AdminDashboardProps {
  activeTab: string;
}

export function AdminDashboard({ activeTab }: AdminDashboardProps) {
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
  
  // State for escrow operations
  const [escrowId, setEscrowId] = useState('');
  const [disputeEscrowId, setDisputeEscrowId] = useState('');
  
  // Hooks for specific escrow data (used when escrowId is provided)
  const escrow = useEscrowRaw(escrowId ? BigInt(escrowId) : BigInt(0));
  const isDisputeWindowOpen = useIsDisputeWindowOpen(escrowId ? BigInt(escrowId) : BigInt(0));
  const getDisputeTimeRemaining = useDisputeTimeRemaining(escrowId ? BigInt(escrowId) : BigInt(0));
  
  // Global statistics
  const escrowCounter = useEscrowCounter();
  const disputeWindow = useDisputeWindow();
  const escrowMarketplace = useMarketplace();
  const escrowOwner = useEscrowOwner();
  const orderCounter = useOrderCount();
  const productCounter = useProductCount();
  const marketplaceEscrowContract = useEscrowContract();
  const marketplaceOwner = useMarketplaceOwner();
  const [newMarketplaceAddress, setNewMarketplaceAddress] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newEscrowAddress, setNewEscrowAddress] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Emergency withdraw state
  const [emergencyWithdrawTo, setEmergencyWithdrawTo] = useState('');
  const [emergencyWithdrawAmount, setEmergencyWithdrawAmount] = useState('');
  
  const handleGetEscrow = async () => {
    if (!escrowId) return;
    setLoading(true);
    try {
      // Escrow data is now available directly from the useEscrowData hook
      console.log('Escrow data:', escrow);
    } catch (error) {
      console.error('Error fetching escrow:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResolveDispute = async () => {
    if (!disputeEscrowId) return;
    setLoading(true);
    try {
      // create an option to choose true or false
      await resolveDispute(BigInt(disputeEscrowId), true);
    } catch (error) {
      console.error('Error resolving dispute:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmergencyWithdraw = async () => {
    if (!emergencyWithdrawTo || !emergencyWithdrawAmount) return;
    setLoading(true);
    try {
      await emergencyWithdraw(emergencyWithdrawTo as `0x${string}`, BigInt(emergencyWithdrawAmount));
      setEmergencyWithdrawTo('');
      setEmergencyWithdrawAmount('');
    } catch (error) {
      console.error('Error emergency withdraw:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateEscrow = async () => {
    // This would need buyer, seller, productId, amount parameters
    // For now, just a placeholder
    console.log('Create escrow function called');
  };
  
  const handleSetEscrowMarketplace = async () => {
    if (!newEscrowAddress) return;
    setLoading(true);
    try {
      await setMarketplace(newEscrowAddress as `0x${string}`);
    } catch (error) {
      console.error('Error setting escrow marketplace:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTransferEscrowOwnership = async () => {
    if (!newOwnerAddress) return;
    setLoading(true);
    try {
      await transferEscrowOwnership(newOwnerAddress as `0x${string}`);
    } catch (error) {
      console.error('Error transferring escrow ownership:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSetEscrowContract = async () => {
    if (!newEscrowAddress) return;
    setLoading(true);
    try {
      await setEscrowContract(newEscrowAddress as `0x${string}`);
    } catch (error) {
      console.error('Error setting escrow contract:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const renderEscrowsTab = () => (
    <div className="space-y-6">
      {/* Escrow Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escrow Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Escrows</p>
            <p className="text-2xl font-bold text-blue-900">{escrowCounter?.toString() || '0'}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Dispute Window</p>
            <p className="text-2xl font-bold text-green-900">{disputeWindow?.toString() || '0'}s</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Marketplace Contract</p>
            <p className="text-sm font-bold text-purple-900 truncate">{escrowMarketplace?.toString() || 'Not set'}</p>
          </div>
        </div>
      </div>
      
      {/* Browse Escrows */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse Escrows</h3>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Enter Escrow ID"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGetEscrow}
            disabled={loading || !escrowId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Get Escrow'}
          </button>
        </div>
        {escrow && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Escrow Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>ID:</strong> {escrow.id?.toString() || 'N/A'}</div>
              <div><strong>Buyer:</strong> {escrow.buyer || 'N/A'}</div>
              <div><strong>Seller:</strong> {escrow.seller || 'N/A'}</div>
              <div><strong>Amount:</strong> {escrow.amount?.toString() || 'N/A'}</div>
              <div><strong>Status:</strong> {escrow.status !== undefined ? EscrowStatus[escrow.status] : 'N/A'}</div>
              <div><strong>Dispute Raised:</strong> {escrow.disputeRaised ? 'Yes' : 'No'}</div>
              <div><strong>Created:</strong> {escrow.createdAt ? new Date(Number(escrow.createdAt) * 1000).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderDisputesTab = () => (
    <div className="space-y-6">
      {/* Resolve Disputes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Disputes</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Escrow ID to Resolve"
              value={disputeEscrowId}
              onChange={(e) => setDisputeEscrowId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleResolveDispute}
              disabled={loading || !disputeEscrowId}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resolving...' : 'Resolve Dispute'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Dispute Window Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispute Window Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-600">Dispute Window Status</p>
            <p className="text-lg font-bold text-yellow-900">
              {isDisputeWindowOpen ? 'Open' : 'Closed'}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Time Remaining</p>
            <p className="text-lg font-bold text-purple-900">
              {getDisputeTimeRemaining ? `${getDisputeTimeRemaining} seconds` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

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
  
  const renderSettingsTab = () => (
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

      {/* Marketplace Contract Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketplace Contract Settings</h3>
        <div className="space-y-6">
          {/* Set Marketplace */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Set Marketplace Contract</label>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="New Marketplace Address"
                value={newMarketplaceAddress}
                onChange={(e) => setNewMarketplaceAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSetEscrowContract}
                disabled={loading || !newMarketplaceAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting...' : 'Set Marketplace'}
              </button>
            </div>
          </div>
          
          {/* Transfer Marketplace Ownership */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Marketplace Ownership</label>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="New Owner Address"
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTransferEscrowOwnership}
                disabled={loading || !newOwnerAddress}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
          
          {/* Marketplace Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-600">Total Orders</p>
              <p className="text-2xl font-bold text-orange-900">{orderCounter?.toString() || '0'}</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <p className="text-sm font-medium text-pink-600">Total Products</p>
              <p className="text-2xl font-bold text-pink-900">{productCounter?.toString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Escrow Contract Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Escrow Contract Settings</h3>
        <div className="space-y-6">
          {/* Set Escrow Contract Marketplace */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Set Escrow Marketplace</label>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="New Marketplace Address"
                value={newEscrowAddress}
                onChange={(e) => setNewEscrowAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSetEscrowMarketplace}
                disabled={loading || !newEscrowAddress}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting...' : 'Set Escrow Marketplace'}
              </button>
            </div>
          </div>
          
          {/* Transfer Escrow Ownership */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Escrow Ownership</label>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="New Owner Address"
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTransferEscrowOwnership}
                disabled={loading || !newOwnerAddress}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
          
          {/* Contract Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Current Marketplace</p>
              <p className="text-sm font-bold text-gray-900 truncate">{marketplaceEscrowContract?.toString() || 'Not set'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Current Owner</p>
              <p className="text-sm font-bold text-gray-900 truncate">{marketplaceOwner?.toString() || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderSellersTab = () => {
    // Mock seller data - in real app, this would come from contract
    const mockSellers = [
      { address: '0x1234...5678', storeName: 'Tech Store', isActive: true, createdAt: Date.now() / 1000 },
      { address: '0x8765...4321', storeName: 'Fashion Hub', isActive: true, createdAt: Date.now() / 1000 },
      { address: '0x9876...1234', storeName: 'Electronics Plus', isActive: false, createdAt: Date.now() / 1000 },
    ];

    return (
      <div className="space-y-6">
        {/* Seller Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Overview (Dummy Data)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600">Total Sellers</p>
              <p className="text-2xl font-bold text-blue-900">{mockSellers.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">Active Sellers</p>
              <p className="text-2xl font-bold text-green-900">{mockSellers.filter(s => s.isActive).length}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-600">Inactive Sellers</p>
              <p className="text-2xl font-bold text-red-900">{mockSellers.filter(s => !s.isActive).length}</p>
            </div>
          </div>
        </div>

        {/* Seller List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Sellers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockSellers.map((seller, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seller.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seller.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {seller.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(Number(seller.createdAt) * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                      <button className="text-red-600 hover:text-red-900">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOrdersTab = () => {
    // Mock order data - in real app, this would come from contract
    const mockOrders = [
      { id: '1', buyer: '0x1111...2222', seller: '0x3333...4444', productId: '101', totalAmount: '1000000000000000000', status: 1, createdAt: Date.now() / 1000 },
      { id: '2', buyer: '0x5555...6666', seller: '0x7777...8888', productId: '102', totalAmount: '2000000000000000000', status: 2, createdAt: Date.now() / 1000 },
      { id: '3', buyer: '0x9999...0000', seller: '0xaaaa...bbbb', productId: '103', totalAmount: '1500000000000000000', status: 0, createdAt: Date.now() / 1000 },
    ];

    return (
      <div className="space-y-6">
        {/* Order Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Overview (Dummy Data)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{mockOrders.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{mockOrders.filter(o => o.status === 0).length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{mockOrders.filter(o => o.status === 3).length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-600">Total Volume</p>
              <p className="text-2xl font-bold text-purple-900">
                {mockOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / 1e18} ETH
              </p>
            </div>
          </div>
        </div>

        {/* Order List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.buyer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.seller}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.productId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(Number(order.totalAmount) / 1e18).toFixed(4)} ETH
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(Number(order.createdAt) * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderEmergencyTab = () => (
    <div className="space-y-6">
      {/* Emergency Withdraw */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Functions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Withdraw</label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Recipient Address (0x...)"
                value={emergencyWithdrawTo}
                onChange={(e) => setEmergencyWithdrawTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Amount (in wei)"
                value={emergencyWithdrawAmount}
                onChange={(e) => setEmergencyWithdrawAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleEmergencyWithdraw}
                disabled={loading || !emergencyWithdrawTo || !emergencyWithdrawAmount}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Withdrawing...' : 'Emergency Withdraw'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">⚠️ Use only in emergency situations to withdraw specified amount to recipient</p>
          </div>
          
          {/* Create Escrow */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Create Escrow</label>
            <button
              onClick={handleCreateEscrow}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Escrow (Admin)'}
            </button>
            <p className="text-xs text-gray-500 mt-2">Create new escrow as admin (requires buyer, seller, productId, amount)</p>
          </div>
        </div>
      </div>
    </div>
  );

  
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'escrows':
        return renderEscrowsTab();
      case 'disputes':
        return renderDisputesTab();
      case 'sellers':
        return renderSellersTab();
      case 'orders':
        return renderOrdersTab();
      case 'settings':
        return renderSettingsTab();
      case 'emergency':
        return renderEmergencyTab();
      default:
        return renderEscrowsTab();
    }
  };
  
  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
}
