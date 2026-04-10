import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';

// Initialize Stripe OUTSIDE of the component to avoid recreating it on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function SendMoney() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  
  // We will use this state later to show the Stripe form!
  const [clientSecret, setClientSecret] = useState(''); 
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get('/api/auth/users', config);
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !amount || amount <= 0) {
      alert("Please select a user and enter a valid amount.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Hit our Payment Intent route we built in Phase 2!
      const response = await axios.post('/api/payments/intent', {
        receiverId: selectedUser,
        amount: Number(amount)
      }, config);

      // Save the secret Stripe gives us. We need this to render the credit card form.
      setClientSecret(response.data.clientSecret);
      
    } catch (error) {
      console.error("Payment Intent Error:", error);
      alert("Failed to initiate payment");
    }
  };

  if (loading) return <div className="text-center p-10">Loading contacts...</div>;

  return (
    <div className="max-w-xl mx-auto p-6 mt-10 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Send Money</h2>
      
      {/* If we don't have a clientSecret yet, show the form to pick a user & amount */}
      {!clientSecret ? (
        <form onSubmit={handleInitiatePayment} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Who are you sending to?</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Select a friend...</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-bold">$</span>
              <input 
                type="number" 
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 mt-4 text-white font-bold bg-green-600 rounded-lg hover:bg-green-700 transition shadow-md"
          >
            Continue to Payment
          </button>
        </form>
      ) : (
        <div className="mt-4">
          {/* This is where the magic happens! We pass the clientSecret to Stripe */}
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </div>
      )}
    </div>
  );
}