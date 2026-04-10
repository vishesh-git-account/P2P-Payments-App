import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/'); // Kick them out if not logged in
        return;
      }

      try {
        // Set the token in the headers for these specific requests
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Run both API calls at the same time for speed
        const [userRes, historyRes] = await Promise.all([
          axios.get('/api/auth/me', config),
          axios.get('/api/payments/history', config)
        ]);

        setUser(userRes.data);
        setTransactions(historyRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        localStorage.removeItem('token');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl mb-8 flex justify-between items-center">
        <div>
          <p className="text-blue-100 text-sm uppercase tracking-wider mb-1">Current Balance</p>
          <h2 className="text-5xl font-extrabold">${user?.balance?.toFixed(2)}</h2>
        </div>
        <Link to="/send" className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition">
          Send Money
        </Link>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No transactions yet. Send some money to get started!</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              // Determine if we sent or received this money
              const isSender = tx.sender._id === user._id;
              
              return (
                <div key={tx._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isSender ? 'bg-red-500' : 'bg-green-500'}`}>
                      {isSender ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {isSender ? `Sent to ${tx.receiver.name}` : `Received from ${tx.sender.name}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isSender ? 'text-red-600' : 'text-green-600'}`}>
                      {isSender ? '-' : '+'}${tx.amount.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}