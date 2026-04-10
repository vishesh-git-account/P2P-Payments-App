import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Stripe.js hasn't yet loaded.
    if (!stripe || !elements) return;

    setIsProcessing(true);

    // Confirm the payment
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // This is where Stripe redirects the user after a successful payment!
        return_url: `${window.location.origin}/dashboard`,
      },
    });

    // This point will only be reached if there is an immediate error with the card.
    // Otherwise, it redirects to the dashboard.
    if (error) {
      setMessage(error.message);
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* This automatically renders the secure credit card inputs */}
      <PaymentElement />
      
      <button 
        disabled={isProcessing || !stripe || !elements} 
        className="w-full py-3 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>

      {/* Show any error messages from Stripe */}
      {message && <div className="p-3 text-sm text-red-700 bg-red-100 rounded">{message}</div>}
    </form>
  );
}