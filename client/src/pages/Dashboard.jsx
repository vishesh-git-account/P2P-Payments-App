import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client'; 
import WalletAnalytics from '../components/WalletAnalytics';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Reusable function to grab fresh data from the server
  const fetchDashboardData = async (pageNum = 1) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const userRes = await axios.get('/api/auth/me', config);
      setUser(userRes.data);

      // Pass the page number to the backend
      const historyRes = await axios.get(`/api/payments/history?page=${pageNum}&limit=10`, config);
      
      if (pageNum === 1) {
        setTransactions(historyRes.data.transactions); // Initial load
      } else {
        // Append new transactions to the bottom of the list
        setTransactions(prev => [...prev, ...historyRes.data.transactions]); 
      }
      
      setHasMore(historyRes.data.hasMore);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard fetch error", error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  // Main Effect: Fetch data & Connect Sockets
  useEffect(() => {
    // 1. Load initial data (Always loads page 1 on mount)
    fetchDashboardData(1);

    // 2. Setup Real-Time WebSockets
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    
    if (!token || !userString) return;
    
    const storedUser = JSON.parse(userString);
    const socket = io('http://localhost:5000'); 

    const userId = storedUser.id || storedUser._id;
    if (userId) {
      socket.emit('register', userId);
    }

    // 3. Listen for the magic Webhook event (Receiver)
    socket.on('paymentReceived', () => {
      // Auto-refresh the dashboard so the user's balance updates instantly
      fetchDashboardData(1); // Force back to page 1 to see newest
      setPage(1); 
    });

    // 4. Listen for the Webhook event (Sender)
    socket.on('paymentSent', () => {
      fetchDashboardData(1); // Force back to page 1 to see newest
      setPage(1);
    });

    // Cleanup: Disconnect when they leave the dashboard page
    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) return <div className="text-center p-10 text-xl font-semibold">Loading your vault...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.name}</h1>
          <p className="text-gray-500">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition">
          Logout
        </button>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-r from-brand to-brand-dark rounded-2xl p-8 text-white shadow-xl mb-8 flex justify-between items-center">
        <div>
          <p className="text-brand-light text-sm uppercase tracking-wider mb-1">Current Balance</p>
          <h2 className="text-5xl font-extrabold">${user?.balance?.toFixed(2)}</h2>
        </div>
        <Link to="/send" className="bg-white text-brand px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition">
          Send Money
        </Link>
      </div>

      {/* Quick Overview Banner */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-brand font-bold bg-green-200 px-2 py-1 rounded">📈 Overview</span>
          <span className="text-gray-600 text-sm font-medium">Your financial summary</span>
        </div>
        <div className="text-sm font-bold text-gray-700">
          Showing: <span className="text-brand">{transactions.length}</span> transactions
        </div>
      </div>

      {/* Analytics Component */}
      {user && (
        <WalletAnalytics 
          transactions={transactions} 
          currentUserId={user.id || user._id} 
        />
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No transactions yet. Send some money to get started!</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const isSender = tx.sender._id === user._id;
              
              return (
                <div key={tx._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isSender ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isSender ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {isSender ? `Sent to ${tx.receiver?.name || 'Unknown'}` : `Received from ${tx.sender?.name || 'Unknown'}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isSender ? 'text-red-600' : 'text-green-600'}`}>
                      {isSender ? '-' : '+'}${tx.amount.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-700' : tx.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 🚀 THE PAGINATION 'LOAD MORE' BUTTON */}
        {hasMore && (
          <div className="flex justify-center mt-6 border-t pt-6">
            <button 
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchDashboardData(nextPage);
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-full hover:bg-gray-200 transition shadow-sm border border-gray-200"
            >
              Load More Activity ↓
            </button>
          </div>
        )}

      </div>
    </div>
  );
}