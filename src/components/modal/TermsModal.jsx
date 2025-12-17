import React from 'react';

export default function TermsModal({ open, onAccept, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-4 text-green-700 text-center">Terms & Conditions</h2>
        <div className="text-gray-700 text-sm space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <p><b>1. Product Quality:</b><br/>
          We deliver fresh vegetables and leafy greens sourced directly from local partner villages. All products are subject to availability and may vary in appearance and weight.</p>
          <p><b>2. Ordering & Delivery:</b><br/>
          Orders placed before the daily cut-off time will be delivered the same day, subject to availability. Delivery is available within our serviceable areas only. Please ensure your address and contact details are accurate for smooth delivery.</p>
          <p><b>3. Order Cancellation Policy:</b><br/>
          • Orders placed before 10:30 PM can be cancelled until the same day 10:30 PM<br/>
          • Orders placed after 10:30 PM can be cancelled until the next day 11:59 PM<br/>
          • Once harvesting begins, orders cannot be cancelled to ensure freshness<br/>
          • Cancellation must be requested through the order management system</p>
          <p><b>4. Payment:</b><br/>
          We accept cash on delivery. Please have the exact amount ready at the time of delivery.</p>
          <p><b>5. No Returns & Refunds:</b><br/>
          We do not accept returns or refunds for any reason. All sales are final</p>
          <p><b>6. User Responsibilities:</b><br/>
          You agree to provide accurate information and not misuse the platform. You are responsible for receiving the order at the provided address.</p>
          <p><b>7. Privacy:</b><br/>
          Your personal information is used only for order processing and delivery. We do not share your data with third parties except as required for service fulfillment.</p>
          <p><b>8. Changes to Terms:</b><br/>
          NaveDhana reserves the right to update these terms at any time. Continued use of the service constitutes acceptance of the new terms.</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 border border-gray-200"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-5 py-2 rounded-lg bg-green-600 text-white font-bold shadow hover:bg-green-700"
            onClick={onAccept}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
} 