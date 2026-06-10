import { useState, useEffect } from 'react';
import axios from 'axios';

// Notice we don't need to pass the raw `transactions` array anymore!
export default function WalletAnalytics() {
  const [analytics, setAnalytics] = useState({ totalSent: 0, totalReceived: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Fetch the pre-calculated math from our new endpoint
        const res = await axios.get('/api/payments/analytics', config);
        setAnalytics(res.data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="animate-pulse h-24 bg-gray-200 rounded-xl mb-8"></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Total Received Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Income</p>
          <p className="text-3xl font-extrabold text-green-600">+${analytics.totalReceived.toFixed(2)}</p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">
          ↓
        </div>
      </div>

      {/* Total Sent Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Spent</p>
          <p className="text-3xl font-extrabold text-red-600">-${analytics.totalSent.toFixed(2)}</p>
        </div>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl">
          ↑
        </div>
      </div>
    </div>
  );
}