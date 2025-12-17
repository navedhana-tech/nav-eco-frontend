import React, { useContext, useEffect } from 'react';
import myContext from '../../context/data/myContext';
import Layout from '../../components/layout/Layout';
import { ArrowLeft, FileText, Shield, Clock, Truck, AlertTriangle, CheckCircle, Info, Scale, Heart, Users, Award, Target, Leaf, Star, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useUserTracking } from '../../hooks/useUserTracking';

export default function Terms() {
  const { trackPage } = useUserTracking();
  const context = useContext(myContext);
  const { mode } = context;
  const navigate = useNavigate();

  // Track page visit
  useEffect(() => {
    trackPage('other');
  }, [trackPage]);

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-green-700 text-center">Terms & Conditions</h1>
      <div className="text-gray-700 text-base space-y-5">
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
        We do not accept returns or refunds for any reason. All sales are final.</p>
        <p><b>6. User Responsibilities:</b><br/>
        You agree to provide accurate information and not misuse the platform. You are responsible for receiving the order at the provided address.</p>
        <p><b>7. Privacy:</b><br/>
        Your personal information is used only for order processing and delivery. We do not share your data with third parties except as required for service fulfillment.</p>
        <p><b>8. Changes to Terms:</b><br/>
        NaveDhana reserves the right to update these terms at any time. Continued use of the service constitutes acceptance of the new terms.</p>
      </div>
    </div>
  );
} 