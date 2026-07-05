import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import UserSearch from '../components/UserSearch'; // <-- Import our new Search Bar!

// Initialize Stripe OUTSIDE of the component to avoid recreating it on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function SendMoney() {
  // We removed the 'users' array and 'loading' state because the Search component handles that now!
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [clientSecret, setClientSecret] = useState(''); 
  
  const navigate = useNavigate();

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !amount || amount <= 0) {
      alert("Please select a user and enter a valid amount.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.post('/api/payments/intent', {
        receiverId: selectedUser,
        amount: Number(amount)
      }, config);

      setClientSecret(response.data.clientSecret);
      
    } catch (error) {
      console.error("Payment Intent Error:", error);
      alert("Failed to initiate payment");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 mt-10 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Send Money</h2>
      
      {!clientSecret ? (
        <form onSubmit={handleInitiatePayment} className="space-y-6">
          
          {/* 1. OUR NEW DYNAMIC SEARCH COMPONENT */}
          <UserSearch onSelectUser={setSelectedUser} />

          {/* 2. THE AMOUNT INPUT */}
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
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="0.00"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 mt-4 text-white font-bold bg-brand rounded-lg hover:bg-brand-dark transition shadow-md"
          >
            Continue to Payment
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </div>
      )}
    </div>
  );
}