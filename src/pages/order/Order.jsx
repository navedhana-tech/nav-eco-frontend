import React, { useContext, useEffect, useState } from 'react';
import myContext from '../../context/data/myContext';
import Layout from '../../components/layout/Layout';
import Loader from '../../components/loader/Loader';
import { Package, CheckCircle, Leaf,Clock, X, Truck, ChevronDown, ChevronUp, FileText, RefreshCw, ShoppingBag, MapPin, CreditCard, Timer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig.jsx';
import { useUserTracking } from '../../hooks/useUserTracking';

function Order() {
  const { trackPage } = useUserTracking();
  const userData = JSON.parse(localStorage.getItem('user'));
  const userid = userData?.user?.uid;
  const context = useContext(myContext);
  const { loading, order, trackUserActivity } = context;
  const [expanded, setExpanded] = useState({});
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [timingSettings, setTimingSettings] = useState({
    deliveryCutoffTime: '22:30',
    defaultDeliveryTime: '12:00',
    orderDisplayDuration: '24'
  });
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Track page visit
  useEffect(() => {
    trackPage('checkout');
  }, [trackPage]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateOrderTotal = (cartItems) => {
    return cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
  };

  const getStatusStep = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered': return 3;
      case 'out for delivery': return 2;
      case 'harvested': return 1;
      case 'placed': return 0;
      default: return 0;
    }
  };

  const statusSteps = [
    { label: 'Placed', icon: <ShoppingBag className="w-4 h-4" /> },
    { label: 'Harvested', icon: <Leaf className="w-4 h-4" /> },
    { label: 'Out for Delivery', icon: <Truck className="w-4 h-4" /> },
    { label: 'Delivered', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  // Add status badge color mapping
  const statusBadgeMap = {
    placed: 'bg-blue-100 text-blue-700',
    harvested: 'bg-lime-100 text-lime-700',
    'out for delivery': 'bg-yellow-100 text-yellow-700',
    delivered: 'bg-green-100 text-green-800',
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch delivery charges
        const chargesDoc = await getDoc(doc(fireDB, 'settings', 'deliveryCharges'));
        if (chargesDoc.exists()) {
          setDeliveryCharges(Number(chargesDoc.data().value) || 0);
        }

        // Fetch timing settings
        const timingDoc = await getDoc(doc(fireDB, 'settings', 'timing'));
        if (timingDoc.exists()) {
          setTimingSettings(timingDoc.data());
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Filter out delivered orders based on configured duration
  const filterOrders = (orders) => {
    const sortedOrders = orders.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date);
      const timeB = new Date(b.timestamp || b.date);
      return timeB - timeA;
    });
    
    return sortedOrders.filter(order => {
      const now = new Date();
      const orderTime = new Date(order.timestamp || order.date);
      const hoursDiff = (now - orderTime) / (1000 * 60 * 60);

      // Remove delivered/cancelled orders after configured duration
      if (order.status === 'delivered' || order.status === 'cancelled') {
        const statusTime = new Date(
          order.status === 'delivered' ? order.deliveryTime : order.cancellationTime
          || order.timestamp 
          || order.date
        );
        const statusHoursDiff = (now - statusTime) / (1000 * 60 * 60);
        return statusHoursDiff <= Number(timingSettings.orderDisplayDuration);
      }

      return true;
    });
  };

  // Group orders by date
  const groupOrdersByDate = (orders) => {
    const groups = orders.reduce((groups, order) => {
      const date = new Date(order.timestamp || order.date);
      const dateKey = date.toLocaleDateString('en-IN', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
      return groups;
    }, {});

    // Sort orders within each date group by timestamp (most recent first)
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.date);
        const timeB = new Date(b.timestamp || b.date);
        return timeB - timeA;
      });
    });

    return groups;
  };

  if (loading) return <Layout><Loader rows={6} height={28} style={{ maxWidth: 600 }} /></Layout>;

  const userOrders = filterOrders(order.filter(obj => obj.userid === userid));
  const groupedOrders = groupOrdersByDate(userOrders);
  console.log('Fetched userOrders:', userOrders);

  // Add a function to handle invoice download/print
  const handleDownloadInvoice = async (orderItem) => {
    const invoiceOrder = userOrders.find(o => o.orderId === orderItem.orderId) || userOrders.find(o => o.id === orderItem.id) || {};
    const invoiceId = `invoice-${invoiceOrder.orderId || invoiceOrder.id}`;
    const invoiceElement = document.getElementById(invoiceId);
    if (!invoiceElement) return;
    // Use html2canvas to render the invoice DOM to canvas
    const canvas = await html2canvas(invoiceElement, { backgroundColor: null, scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    // Add invoice content
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save(`Invoice_${invoiceOrder.orderId || invoiceOrder.id}.pdf`);
  };
  const handlePrintInvoice = (orderItem) => {
    const invoiceId = `invoice-${orderItem.orderId}`;
    const invoiceElement = document.getElementById(invoiceId);
    if (!invoiceElement) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Invoice</title></head><body>');
    printWindow.document.write(invoiceElement.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  // Update delivery date/time logic using configured times
  const getDeliveryDateTime = (orderItem) => {
    const baseTime = new Date(orderItem.timestamp || orderItem.date);
    if (isNaN(baseTime.getTime())) return 'N/A';
    
    const delivery = new Date(baseTime);
    const [cutoffHour, cutoffMinute] = timingSettings.deliveryCutoffTime.split(':').map(Number);
    const [deliveryHour, deliveryMinute] = timingSettings.defaultDeliveryTime.split(':').map(Number);
    
    if (baseTime.getHours() > cutoffHour || (baseTime.getHours() === cutoffHour && baseTime.getMinutes() > cutoffMinute)) {
      // After cutoff: delivery is at default time the day after tomorrow
      delivery.setDate(delivery.getDate() + 2);
    } else {
      // Before cutoff: delivery is at default time next day
      delivery.setDate(delivery.getDate() + 1);
    }
    delivery.setHours(deliveryHour, deliveryMinute, 0, 0);
    return formatDateTime(delivery.toISOString());
  };

  // Helper to check if order can be cancelled by user using configured times
  const canUserCancel = (orderItem) => {
    if (orderItem.status === 'delivered' || orderItem.status === 'cancelled') return false;
    
    const orderTime = orderItem.timestamp?.toDate ? orderItem.timestamp.toDate() : new Date(orderItem.timestamp || orderItem.date);
    const now = new Date();
    const [cutoffHour, cutoffMinute] = timingSettings.deliveryCutoffTime.split(':').map(Number);
    
    if (orderTime.getHours() > cutoffHour || (orderTime.getHours() === cutoffHour && orderTime.getMinutes() > cutoffMinute)) {
      // Allow cancel until end of next day
      const cancelUntil = new Date(orderTime);
      cancelUntil.setDate(orderTime.getDate() + 1);
      cancelUntil.setHours(23, 59, 59, 999);
      return now <= cancelUntil;
    } else {
      // Allow cancel until cutoff time on order date
      if (now.toDateString() !== orderTime.toDateString()) return false;
      return (now.getHours() < cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() < cutoffMinute));
    }
  };

  // Calculate remaining time for cancellation
  const getCancellationTimeLeft = (orderItem) => {
    if (orderItem.status === 'delivered' || orderItem.status === 'cancelled') return null;
    
    const orderTime = orderItem.timestamp?.toDate ? orderItem.timestamp.toDate() : new Date(orderItem.timestamp || orderItem.date);
    const now = new Date();
    const [cutoffHour, cutoffMinute] = timingSettings.deliveryCutoffTime.split(':').map(Number);
    
    let cancelUntil;
    if (orderTime.getHours() > cutoffHour || (orderTime.getHours() === cutoffHour && orderTime.getMinutes() > cutoffMinute)) {
      // Allow cancel until end of next day
      cancelUntil = new Date(orderTime);
      cancelUntil.setDate(orderTime.getDate() + 1);
      cancelUntil.setHours(23, 59, 59, 999);
    } else {
      // Allow cancel until cutoff time on order date
      if (now.toDateString() !== orderTime.toDateString()) return null;
      cancelUntil = new Date(orderTime);
      cancelUntil.setHours(cutoffHour, cutoffMinute, 0, 0);
    }
    
    const timeLeft = cancelUntil - now;
    return timeLeft > 0 ? timeLeft : null;
  };

  // Countdown Timer Component
  const CountdownTimer = ({ orderItem, onTimeExpired }) => {
    const [timeLeft, setTimeLeft] = useState(getCancellationTimeLeft(orderItem));
    
    useEffect(() => {
      const timer = setInterval(() => {
        const remaining = getCancellationTimeLeft(orderItem);
        setTimeLeft(remaining);
        
        if (remaining === null || remaining <= 0) {
          clearInterval(timer);
          if (onTimeExpired) onTimeExpired();
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }, [orderItem, onTimeExpired]);
    
    if (!timeLeft || timeLeft <= 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-600">
          <X className="w-4 h-4" />
          <span className="text-sm font-semibold">Cancellation period expired</span>
        </div>
      );
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    const isUrgent = timeLeft <= 3600000; // Less than 1 hour
    
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
        <Timer className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {hours > 0 && `${hours}h `}
          {minutes > 0 && `${minutes}m `}
          {seconds}s left to cancel
        </span>
      </div>
    );
  };

  // Fix: Use order.id as fallback for viewInvoiceId logic
  const getInvoiceOrder = () => {
    return userOrders.find(o => o.orderId === viewInvoiceId) || userOrders.find(o => o.id === viewInvoiceId) || {};
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
              <Package className="w-4 h-4" />
              My Orders
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              My <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">Orders</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Track and manage your orders
            </p>
            
            {/* Cancellation Policy Info */}
            
          </div>

          {userOrders.length > 0 ? (
            <div className="space-y-10">
              {Object.entries(groupedOrders)
                .sort((a, b) => {
                  // Parse dateKey back to Date for comparison
                  const dateA = new Date(a[0]);
                  const dateB = new Date(b[0]);
                  return dateB - dateA; // descending
                })
                .map(([dateKey, dateOrders]) => (
                  <div key={dateKey} className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-gray-900">{dateKey}</div>
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <div className="text-sm text-gray-500 font-medium">
                        {dateOrders.length} {dateOrders.length === 1 ? 'Order' : 'Orders'}
                      </div>
                    </div>
                    <div className="space-y-6">
                      {dateOrders.map((orderItem) => {
                const isOpen = expanded[orderItem.id];
                const step = getStatusStep(orderItem.status);
                // Calculate next day 12pm
                const deliveryDateObj = new Date();
                deliveryDateObj.setDate(deliveryDateObj.getDate() + 1);
                deliveryDateObj.setHours(12, 0, 0, 0);
                const deliveryDate = `Tomorrow, 12:00 PM (${deliveryDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
                return (
                <div
                  key={orderItem.id}
                  className="bg-white rounded-2xl shadow-xl border border-green-100 transition-all duration-300 hover:shadow-2xl mb-8 sm:mb-10 px-2 py-2 sm:px-0 sm:py-0"
                  style={{ maxWidth: '100%', margin: '0 auto' }}
                >
                    {/* Order Summary Row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-3 sm:px-6 pt-4 sm:pt-6 pb-2 bg-gradient-to-r from-green-50 via-blue-50 to-pink-50 rounded-t-2xl border-b border-green-100">
                    <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                      <div>
                        <span className="block text-xs text-gray-400 font-semibold mb-1">ORDER PLACED</span>
                          <span className="text-sm font-medium text-gray-700">{formatDateTime(orderItem.timestamp?.toDate ? orderItem.timestamp.toDate() : orderItem.timestamp || orderItem.date)}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400 font-semibold mb-1">DELIVERY DATE</span>
                          <span className="text-sm font-medium text-green-700">{getDeliveryDateTime(orderItem)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400 font-semibold mb-1">ORDER ID</span>
                        <span className="text-sm font-medium text-gray-700">{orderItem.orderId ? `#${orderItem.orderId}` : orderItem.id ? `#${orderItem.id.slice(-8)}` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400 font-semibold mb-1">STATUS</span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border shadow ${statusBadgeMap[(orderItem.status || '').toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                          {orderItem.status ? orderItem.status.charAt(0).toUpperCase() + orderItem.status.slice(1) : 'Unknown'}
                        </span>
                        {orderItem.status === 'cancelled' && (
                          <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex flex-col gap-1">
                            <span>Order Cancelled</span>
                            {orderItem.cancellationReason && <span>Reason: {orderItem.cancellationReason}</span>}
                            {orderItem.cancellationTime && <span>Time: {formatDateTime(orderItem.cancellationTime)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 flex flex-col items-end gap-2">
                      <span className="block text-xs text-gray-400 font-semibold mb-1">TOTAL</span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Subtotal: ₹{calculateOrderTotal(orderItem.cartItems).toFixed(2)}
                        </div>
                        {orderItem.discountAmount > 0 && (
                          <div className="text-sm text-purple-600">
                            Discount: -₹{orderItem.discountAmount.toFixed(2)}
                            {orderItem.appliedCoupon && (
                              <span className="text-xs text-purple-500 block">({orderItem.appliedCoupon.code})</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Delivery: ₹{deliveryCharges.toFixed(2)}
                        </div>
                        <span className="text-lg font-bold text-green-700">
                          ₹{(calculateOrderTotal(orderItem.cartItems) + deliveryCharges - (orderItem.discountAmount || 0)).toFixed(2)}
                        </span>
                      </div>
                      <button
                        className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-semibold mt-1"
                        onClick={() => setExpanded(prev => ({ ...prev, [orderItem.id]: !isOpen }))}
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isOpen ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>
                    {/* Advanced Status Stepper (mobile: horizontal scroll, sticky) */}
                    <div className="mb-6 px-1 sm:px-6 pt-3 sm:pt-4">
                      <div className="flex items-center justify-between w-full max-w-full sm:max-w-2xl mx-auto relative overflow-x-auto scrollbar-thin scrollbar-thumb-green-200 scrollbar-track-transparent" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {statusSteps.map((stepObj, i) => {
                          const isCompleted = i < step;
                          const isCurrent = i === step;
                          const isActive = i <= step; // All steps up to and including current
                          return (
                            <div key={stepObj.label} className="flex-1 flex flex-col items-center relative min-w-[80px] sm:min-w-0">
                              {/* Connector line */}
                              {i !== 0 && (
                                <div className={`absolute -left-1/2 top-1/2 w-full h-1 z-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} style={{ left: '-50%', width: '100%', height: 4, top: 20 }} />
                              )}
                              {/* Step icon */}
                              <div className={`z-10 flex items-center justify-center rounded-full border-4 ${isActive ? 'border-green-500 bg-green-100' : 'border-gray-300 bg-gray-100'} transition-all duration-300`} style={{ width: 40, height: 40 }}>
                                {isActive ? <CheckCircle className="w-5 h-5 text-green-600" /> : React.cloneElement(stepObj.icon, { className: `w-5 h-5 text-gray-400` })}
                              </div>
                              {/* Step label */}
                              <span className={`mt-1 text-[11px] font-semibold ${isActive ? 'text-green-700' : 'text-gray-400'} text-center`}>{stepObj.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Collapsible Details */}
                    {isOpen && (
                  <div className="px-6 pb-6 pt-2">
                        {/* Product List */}
                        <div className="mb-6">
                          <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-green-600" />Products</h4>
                          <div className="flex overflow-x-auto gap-4 pb-2">
                      {orderItem.cartItems.map((item, index) => (
                              <div key={`${item.id}-${index}`} className="min-w-[220px] bg-yellow-50 rounded-lg p-3 border border-yellow-100 flex flex-col items-center shadow-sm">
                          <img
                            src={item.imageUrl || 'https://via.placeholder.com/64x64?text=No+Image'}
                            alt={item.title}
                                  className="w-20 h-20 object-cover rounded-md border border-gray-200 bg-white mb-2"
                          />
                                <div className="text-base font-semibold text-gray-900 mb-0.5 text-center">{item.title}</div>
                                <div className="text-xs text-gray-500 mb-1 text-center">{item.description}</div>
                                
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Applied Coupon Section */}
                        {orderItem.appliedCoupon && orderItem.discountAmount > 0 && (
                          <div className="mb-6">
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                              <h5 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                                Applied Coupon
                              </h5>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="bg-purple-100 rounded-full p-2">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-purple-800 text-lg">{orderItem.appliedCoupon.code}</div>
                                    <div className="text-sm text-purple-600">{orderItem.appliedCoupon.description || 'Discount Applied'}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {orderItem.appliedCoupon.type === 'percentage' 
                                        ? `${orderItem.appliedCoupon.value}% off` 
                                        : `₹${orderItem.appliedCoupon.value} off`}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-purple-700">-₹{orderItem.discountAmount.toFixed(2)}</div>
                                  <div className="text-xs text-purple-600">You Saved</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Delivery Address & Payment */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" />Delivery Address</h5>
                            <div className="text-sm text-gray-700">
                              {orderItem.addressInfo?.name}<br />
                              {orderItem.addressInfo?.houseNo}, {orderItem.addressInfo?.blockNo}<br />
                              {orderItem.addressInfo?.landmark}<br />
                              {orderItem.addressInfo?.address}<br />
                              {orderItem.addressInfo?.pincode}
                            </div>
                          </div>
                          <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                            <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4 text-green-600" />Payment</h5>
                            <div className="text-sm text-gray-700">{orderItem.paymentMethod || 'Cash on Delivery'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Subtotal: <span className="font-semibold">₹{calculateOrderTotal(orderItem.cartItems).toFixed(2)}</span>
                            </div>
                            {orderItem.discountAmount > 0 && (
                              <div className="text-xs text-purple-600 mt-1">
                                Discount: <span className="font-semibold">-₹{orderItem.discountAmount.toFixed(2)}</span>
                                {orderItem.appliedCoupon && (
                                  <span className="block text-purple-500">({orderItem.appliedCoupon.code})</span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Delivery: <span className="font-semibold">₹{deliveryCharges.toFixed(2)}</span>
                            </div>
                            <div className="text-sm font-bold text-green-700 mt-2">
                              Total: ₹{(calculateOrderTotal(orderItem.cartItems) + deliveryCharges - (orderItem.discountAmount || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {/* Actions & Delivery Info */}
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="ml-auto text-sm text-gray-600">Est. Delivery: <span className="font-bold text-green-700">{getDeliveryDateTime(orderItem)}</span></div>
                        </div>
                        {/* Hidden Invoice DOM for PDF/Print */}
                        <div id={`invoice-${orderItem.orderId || orderItem.id}`} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                          <div style={{ position: 'relative', width: 700, margin: '0 auto', background: '#fff', padding: 32, borderRadius: 16, fontFamily: 'Inter, Arial, sans-serif', boxShadow: '0 4px 24px rgba(60,120,60,0.08)' }}>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                              {/* Invoice Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div>
                                  <img src="/navedhana_LOGO.png" alt="Logo" style={{ width: 100, marginBottom: 8 }} />
                                  <div style={{ fontWeight: 900, color: '#217a3b', fontSize: 24, letterSpacing: 1 }}>NaveDhana</div>
                                  <div style={{ color: '#666', fontSize: 12 }}>Fresh Vegetables & Leafy Greens</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <h1 style={{ fontSize: 32, color: '#217a3b', marginBottom: 4, letterSpacing: 2, fontWeight: 900 }}>INVOICE</h1>
                                  <div style={{ color: '#666', fontSize: 14 }}>Date: {formatDateTime(orderItem.timestamp?.toDate ? orderItem.timestamp.toDate() : orderItem.timestamp || orderItem.date)}</div>
                                </div>
                              </div>

                              {/* Order Details */}
                              <div style={{ background: '#f0f9f0', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                  <div>
                                    <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 4 }}>Order Details</div>
                                    <div style={{ fontSize: 14, color: '#444' }}>
                                      <div>Order ID: #{orderItem.orderId || orderItem.id}</div>
                                      <div>Status: {orderItem.status}</div>
                                      <div>Delivery Date: {getDeliveryDateTime(orderItem)}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 4 }}>Delivery Address</div>
                                    <div style={{ fontSize: 14, color: '#444' }}>
                                      {orderItem.addressInfo?.name}<br />
                                      {orderItem.addressInfo?.houseNo}, {orderItem.addressInfo?.blockNo}<br />
                                      {orderItem.addressInfo?.landmark}<br />
                                      {orderItem.addressInfo?.address}<br />
                                      {orderItem.addressInfo?.pincode}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Products Table */}
                              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                                <thead>
                                  <tr style={{ background: '#e8f5e9' }}>
                                    <th style={{ padding: 12, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 14, textAlign: 'left' }}>Product</th>
                                    <th style={{ padding: 12, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 14, textAlign: 'center' }}>Category</th>
                                    <th style={{ padding: 12, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 14, textAlign: 'center' }}>Quantity</th>
                                    <th style={{ padding: 12, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 14, textAlign: 'right' }}>Price</th>
                                    <th style={{ padding: 12, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 14, textAlign: 'right' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderItem.cartItems.map((item, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fbe7' : '#fff' }}>
                                      <td style={{ padding: 12, border: '1px solid #e0e0e0', color: '#333', fontSize: 14 }}>{item.title}</td>
                                      <td style={{ padding: 12, border: '1px solid #e0e0e0', color: '#333', fontSize: 14, textAlign: 'center' }}>{item.category}</td>
                                      <td style={{ padding: 12, border: '1px solid #e0e0e0', color: '#333', fontSize: 14, textAlign: 'center' }}>
                                        {item.category === 'Leafy Vegetables' 
                                          ? `${item.quantity || 1} piece${(item.quantity || 1) > 1 ? 's' : ''}`
                                          : `${item.quantity || 1} kg`}
                                      </td>
                                      <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'right' }}>
                                        {item.actualprice > item.price && (
                                          <div style={{ color: '#888', textDecoration: 'line-through', fontSize: 12 }}>
                                            ₹{item.actualprice}
                                          </div>
                                        )}
                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{item.price}</div>
                                      </td>
                                      <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'right' }}>
                                        {item.actualprice > item.price && (
                                          <div style={{ color: '#888', textDecoration: 'line-through', fontSize: 12 }}>
                                            ₹{(item.actualprice * (item.quantity || 1)).toFixed(2)}
                                          </div>
                                        )}
                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{(item.price * (item.quantity || 1)).toFixed(2)}</div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Summary */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                <div style={{ width: '300px', background: '#f0f9f0', padding: 16, borderRadius: 8 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ color: '#666' }}>Subtotal:</div>
                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{calculateOrderTotal(orderItem.cartItems).toFixed(2)}</div>
                                  </div>
                                  {orderItem.discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                      <div style={{ color: '#8b5cf6' }}>Discount:</div>
                                      <div style={{ color: '#8b5cf6', fontWeight: 600 }}>-₹{orderItem.discountAmount.toFixed(2)}</div>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ color: '#666' }}>Delivery Charges:</div>
                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{deliveryCharges.toFixed(2)}</div>
                                  </div>
                                  {orderItem.discountAmount > 0 && orderItem.appliedCoupon && (
                                    <div style={{ fontSize: 12, color: '#8b5cf6', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
                                      Coupon Applied: {orderItem.appliedCoupon.code}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #b2dfdb', paddingTop: 8, marginTop: 8 }}>
                                    <div style={{ color: '#217a3b', fontSize: 16, fontWeight: 700 }}>Total:</div>
                                    <div style={{ color: '#217a3b', fontSize: 16, fontWeight: 700 }}>₹{(calculateOrderTotal(orderItem.cartItems) + deliveryCharges - (orderItem.discountAmount || 0)).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: 16, textAlign: 'center' }}>
                                <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 4 }}>Thank you for shopping with NaveDhana!</div>
                                <div style={{ color: '#666', fontSize: 12 }}>
                                  For support, contact us at support@navedhana.com<br />
                                  Fresh Vegetables Harvested Today & Delivered Today!
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Download/Print Invoice Buttons */}
                        <div className="flex flex-col gap-4 mb-6">
                          <div className="flex flex-wrap gap-4">
                            <button onClick={() => handleDownloadInvoice(orderItem)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"><FileText className="w-4 h-4" />Download Invoice</button>
                            <button onClick={() => setViewInvoiceId(orderItem.orderId || orderItem.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm"><FileText className="w-4 h-4" />View Invoice</button>
                            {canUserCancel(orderItem) && (
                              <button
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => { setCancelOrderId(orderItem.id); setCancelReason(''); }}
                                disabled={getCancellationTimeLeft(orderItem) <= 0}
                              >
                                <X className="w-4 h-4" />Cancel Order
                              </button>
                            )}
                          </div>
                          {canUserCancel(orderItem) && (
                            <div>
                              <CountdownTimer 
                                orderItem={orderItem} 
                                onTimeExpired={() => setRefreshKey(prev => prev + 1)}
                              />
                            </div>
                          )}
                        </div>
                    </div>
                    )}
                  </div>
                );
              })}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Package className="mx-auto h-16 w-16 text-gray-300 mb-6" />
              <h3 className="text-2xl font-bold mb-2 text-gray-700">No orders found</h3>
              <p className="text-lg text-gray-500 mb-6">
                You haven't placed any orders yet. Start shopping now!
              </p>
              <a
                href="/allproducts"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Browse Fresh Vegetables
              </a>
            </div>
          )}
        </div>
      </div>
      {/* Invoice Modal Overlay */}
      {viewInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative overflow-auto" style={{ maxHeight: '90vh' }}>
            <button onClick={() => setViewInvoiceId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            {/* Redesigned Invoice UI */}
            {(() => {
              const invoiceOrder = getInvoiceOrder();
              if (!invoiceOrder) return null;
              return (
                <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-green-100 font-sans">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <img src="/navedhana_LOGO.png" alt="Navedhana Logo" className="w-20 mb-2" />
                      <div className="font-extrabold text-2xl text-green-700 tracking-wide">NAVEDHANA</div>
                      <div className="text-xs text-gray-500 font-semibold">Profit Amplifier</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700 mb-1">INVOICE</div>
                      <div className="text-xs text-gray-500">Order ID: <span className="font-semibold text-gray-700">#{invoiceOrder.orderId || invoiceOrder.id?.slice(-8) || 'N/A'}</span></div>
                      <div className="text-xs text-gray-500">Order Date: <span className="font-semibold text-gray-700">{formatDateTime(invoiceOrder.timestamp?.toDate ? invoiceOrder.timestamp.toDate() : invoiceOrder.timestamp || invoiceOrder.date)}</span></div>
                      <div className="text-xs text-gray-500">Delivery Date: <span className="font-semibold text-green-700">{getDeliveryDateTime(invoiceOrder)}</span></div>
                      <div className="text-xs font-semibold mt-1 inline-block px-2 py-1 rounded bg-green-100 text-green-700 border border-green-200">{invoiceOrder.status ? invoiceOrder.status.charAt(0).toUpperCase() + invoiceOrder.status.slice(1) : 'Unknown'}</div>
                    </div>
                  </div>
                  {/* Address & Payment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="font-bold text-gray-700 mb-1 flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" />Delivery Address</div>
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {invoiceOrder.addressInfo?.name}<br />
                        {invoiceOrder.addressInfo?.houseNo}, {invoiceOrder.addressInfo?.blockNo}<br />
                        {invoiceOrder.addressInfo?.landmark}<br />
                        {invoiceOrder.addressInfo?.address}<br />
                        {invoiceOrder.addressInfo?.city}, {invoiceOrder.addressInfo?.state}<br />
                        {invoiceOrder.addressInfo?.pincode}
                        {invoiceOrder.addressInfo?.phoneNumber && (
                          <div className="mt-1 text-xs text-gray-500">Phone: <span className="font-semibold text-gray-700">{invoiceOrder.addressInfo.phoneNumber}</span></div>
                        )}
                        {invoiceOrder.addressInfo?.alternatePhone && (
                          <div className="text-xs text-gray-500">Alternate: <span className="font-semibold text-gray-700">{invoiceOrder.addressInfo.alternatePhone}</span></div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-700 mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-green-600" />Payment</div>
                      <div className="text-sm text-gray-700">{invoiceOrder.paymentMethod || 'Cash on Delivery'}</div>
                      <div className="text-xs text-gray-500 mt-1">Subtotal: <span className="font-bold text-green-700">₹{calculateOrderTotal(invoiceOrder.cartItems || []).toFixed(2)}</span></div>
                      {invoiceOrder.discountAmount > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          Discount: <span className="font-bold">-₹{invoiceOrder.discountAmount.toFixed(2)}</span>
                          {invoiceOrder.appliedCoupon && (
                            <span className="block text-purple-500">({invoiceOrder.appliedCoupon.code})</span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">Delivery Charges: <span className="font-bold">₹{deliveryCharges.toFixed(2)}</span></div>
                      <div className="text-base font-bold text-green-700 mt-2">Grand Total: ₹{(calculateOrderTotal(invoiceOrder.cartItems || []) + deliveryCharges - (invoiceOrder.discountAmount || 0)).toFixed(2)}</div>
                    </div>
                  </div>
                  {/* Product Table */}
                  <div className="mb-6">
                    <div className="font-bold text-gray-700 mb-2 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-green-600" />Products</div>
                    <table className="w-full border rounded-lg overflow-hidden text-sm">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold text-green-700">Product</th>
                          <th className="py-2 px-3 text-center font-semibold text-green-700">Qty</th>
                          <th className="py-2 px-3 text-right font-semibold text-green-700">Price</th>
                          <th className="py-2 px-3 text-right font-semibold text-green-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoiceOrder.cartItems || []).map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                            <td className="py-2 px-3 text-gray-900">{item.title}</td>
                            <td className="py-2 px-3 text-center">{item.quantity || 1}</td>
                            <td className="py-2 px-3 text-right">
                              {item.actualprice > item.price && (
                                <span className="block text-xs text-gray-400 line-through">₹{item.actualprice}</span>
                              )}
                              <span className="font-semibold">₹{item.price}</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.actualprice > item.price && (
                                <span className="block text-xs text-gray-400 line-through">₹{(item.actualprice * (item.quantity || 1)).toFixed(2)}</span>
                              )}
                              <span className="font-semibold">₹{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Footer */}
                  <div className="mt-6 text-center text-xs text-gray-500 font-semibold border-t pt-4">
                    Thank you for shopping with <span className="text-green-700 font-bold">Navedhana</span>!<br />
                    For support, contact us at <a href="mailto:support@navedhana.com" className="text-blue-600 underline">support@navedhana.com</a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* Cancel Order Popup */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
            <button onClick={() => setCancelOrderId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            <h3 className="text-lg font-bold mb-4 text-red-700">Cancel Order</h3>
            {(() => {
              const orderToCancel = userOrders.find(o => o.id === cancelOrderId);
              return orderToCancel && (
                <div className="mb-4">
                  <CountdownTimer 
                    orderItem={orderToCancel} 
                    onTimeExpired={() => {
                      setCancelOrderId(null);
                      setCancelReason('');
                    }}
                  />
                </div>
              );
            })()}
            <label className="block text-sm font-semibold mb-2">Reason for cancellation:</label>
            <textarea
              className="w-full border rounded-lg p-2 mb-4 text-sm"
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Enter reason..."
            />
            <div className="flex gap-4">
              <button
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition"
                onClick={() => setCancelOrderId(null)}
                disabled={cancelLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={cancelLoading || !cancelReason.trim() || (() => {
                  const orderToCancel = userOrders.find(o => o.id === cancelOrderId);
                  return orderToCancel && getCancellationTimeLeft(orderToCancel) <= 0;
                })()}
                onClick={async () => {
                  const orderToCancel = userOrders.find(o => o.id === cancelOrderId);
                  if (orderToCancel && getCancellationTimeLeft(orderToCancel) <= 0) {
                    setCancelOrderId(null);
                    setCancelReason('');
                    return;
                  }
                  
                  setCancelLoading(true);
                  
                  // Find the order to get details for tracking
                  const cancelledOrder = userOrders.find(o => o.id === cancelOrderId);
                  
                  await updateDoc(doc(fireDB, 'orders', cancelOrderId), {
                    status: 'cancelled',
                    cancellationReason: cancelReason,
                    cancellationTime: new Date().toISOString(),
                  });
                  
                  // Track user activity for order cancellation
                  if (cancelledOrder && trackUserActivity && userData?.user?.phoneNumber) {
                    const orderAmount = parseFloat(cancelledOrder.totalAmount || cancelledOrder.grandTotal || 0);
                    
                    try {
                      await trackUserActivity(userData.user.phoneNumber, 'order_cancelled', {
                        orderId: cancelOrderId,
                        amount: orderAmount,
                        reason: cancelReason
                      });
                    } catch (trackingError) {
                      console.error('Failed to track order cancellation:', trackingError);
                    }
                  }
                  
                  setCancelOrderId(null);
                  setCancelReason('');
                  setCancelLoading(false);
                }}
              >
                {(() => {
                  const orderToCancel = userOrders.find(o => o.id === cancelOrderId);
                  return orderToCancel && getCancellationTimeLeft(orderToCancel) <= 0 ? 'Time Expired' : 'Confirm';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Order;