import React, { useContext, useState, useEffect } from 'react';
import { CheckCircle, TrendingUp, Leaf, Package, BarChart3, Filter, Eye, Printer, Download, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { fireDB } from '../../../../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import myContext from '../../../../context/data/myContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Orders = () => {
    const context = useContext(myContext);
    const { order, trackUserActivity } = context;
    const [orderStatusMap, setOrderStatusMap] = useState({});
    const [cancelOrderId, setCancelOrderId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // ['all', 'vegetables', 'leafy', 'analytics']
    const [dateFilter, setDateFilter] = useState('today'); // ['all', 'today', 'week', 'month']
    const [viewInvoiceId, setViewInvoiceId] = useState(null);
    const [deliveryCharges] = useState(30); // Default delivery charges

    // Debug logs
    useEffect(() => {
        console.log('Raw orders from context:', order);
    }, [order]);

    // Helper functions for invoice
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
        return cartItems?.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0) || 0;
    };

    const getInvoiceOrder = () => {
        return order.find(o => o.id === viewInvoiceId);
    };

    const getDeliveryDateTime = (orderItem) => {
        const baseTime = new Date(orderItem.timestamp?.toDate ? orderItem.timestamp.toDate() : orderItem.timestamp || orderItem.date);
        if (isNaN(baseTime.getTime())) return 'N/A';
        
        const delivery = new Date(baseTime);
        const cutoffHour = 22;
        const cutoffMinute = 30;
        
        if (baseTime.getHours() > cutoffHour || (baseTime.getHours() === cutoffHour && baseTime.getMinutes() > cutoffMinute)) {
            delivery.setDate(delivery.getDate() + 2);
        } else {
            delivery.setDate(delivery.getDate() + 1);
        }
        
        delivery.setHours(12, 0, 0, 0);
        return formatDateTime(delivery.toISOString());
    };

    const handlePrintInvoice = (orderItem) => {
        const invoiceElement = document.getElementById(`admin-invoice-${orderItem.orderId || orderItem.id}`);
        if (!invoiceElement) {
            toast.error('Invoice not found for printing');
            return;
        }
        
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Please allow popups to print the invoice');
                return;
            }
            
            printWindow.document.write('<html><head><title>Invoice</title><style>body{font-family:Arial,sans-serif;}</style></head><body>');
            printWindow.document.write(invoiceElement.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { 
                printWindow.print(); 
                printWindow.close(); 
            }, 500);
        } catch (error) {
            console.error('Error printing invoice:', error);
            toast.error('Failed to print invoice');
        }
    };

    const downloadInvoiceAsPDF = async (orderItem) => {
        const invoiceElement = document.getElementById(`admin-invoice-${orderItem.orderId || orderItem.id}`);
        if (!invoiceElement) {
            toast.error('Invoice element not found');
            return;
        }
        
        try {
            const canvas = await html2canvas(invoiceElement, { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save(`invoice-${orderItem.orderId || orderItem.id}.pdf`);
            toast.success('Invoice downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to download invoice. Please try again.');
        }
    };

    const orderStatusOptions = [
        { value: 'placed', label: 'Placed', color: 'bg-blue-100 text-blue-700' },
        { value: 'harvested', label: 'Harvested', color: 'bg-lime-100 text-lime-700' },
        { value: 'out for delivery', label: 'Out for Delivery', color: 'bg-yellow-100 text-yellow-700' },
        { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
    ];

    useEffect(() => {
        const map = {};
        order.forEach(o => {
            map[o.id] = (o.status || '').toLowerCase();
        });
        setOrderStatusMap(map);
    }, [order]);

    const handleOrderStatusChange = async (orderId, newStatus) => {
        try {
            const docRef = doc(fireDB, 'orders', orderId);
            await updateDoc(docRef, { status: newStatus });
            setOrderStatusMap(prev => ({ ...prev, [orderId]: newStatus }));
            toast.success('Order status updated!');
        } catch (err) {
            toast.error('Failed to update order status');
        }
    };

    // Filter orders by date range
    const filterOrdersByDate = (orders) => {
        console.log('Filtering orders by date:', { dateFilter, ordersCount: orders.length });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        const filtered = orders.filter(item => {
            // Try to parse the date from either timestamp or date field
            let orderDate;
            if (item.timestamp) {
                // Handle both ISO string and Firestore timestamp
                orderDate = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            } else if (item.date) {
                // Parse date string in format "MMM DD, YYYY"
                orderDate = new Date(item.date);
            } else {
                console.log('No valid date found for order:', item);
                return false;
            }

            // Reset time to start of day for accurate date comparison
            const orderDateOnly = new Date(orderDate);
            orderDateOnly.setHours(0, 0, 0, 0);

            console.log('Order date:', { raw: item.date, timestamp: item.timestamp, parsed: orderDate, dateOnly: orderDateOnly });
            
            switch(dateFilter) {
                case 'today':
                    // Show only orders from today (between today 00:00:00 and tomorrow 00:00:00)
                    return orderDateOnly >= today && orderDateOnly < tomorrow;
                case 'week':
                    return orderDateOnly >= weekAgo;
                case 'month':
                    return orderDateOnly >= monthAgo;
                default:
                    return true;
            }
        });
        console.log('Orders after date filtering:', filtered.length);
        return filtered;
    };

    // Calculate order statistics
    const calculateStats = (filteredOrders) => {
        const stats = {
            vegetables: { count: 0, revenue: 0, items: 0 },
            leafy: { count: 0, revenue: 0, items: 0 },
            topVegetables: {},
            topLeafy: {},
            dailyTrends: {},
            categoryWiseRevenue: {}
        };

        filteredOrders
            .filter(order => order.status !== 'cancelled')
            .forEach(order => {
                const orderDate = (order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || order.date)).toLocaleDateString();
                if (!stats.dailyTrends[orderDate]) {
                    stats.dailyTrends[orderDate] = { vegetables: 0, leafy: 0 };
                }

                order.cartItems?.forEach(item => {
                    const isLeafy = item.category?.toLowerCase().includes('leafy');
                    const category = isLeafy ? 'leafy' : 'vegetables';
                    const itemTotal = (item.price || 0) * (item.quantity || 1);

                    // Update category stats
                    stats[category].count++;
                    stats[category].revenue += itemTotal;
                    stats[category].items += (item.quantity || 1);

                    // Update top items
                    const targetTop = isLeafy ? stats.topLeafy : stats.topVegetables;
                    if (!targetTop[item.title]) {
                        targetTop[item.title] = { quantity: 0, revenue: 0 };
                    }
                    targetTop[item.title].quantity += (item.quantity || 1);
                    targetTop[item.title].revenue += itemTotal;

                    // Update daily trends
                    stats.dailyTrends[orderDate][category]++;

                    // Update category-wise revenue
                    if (!stats.categoryWiseRevenue[item.category]) {
                        stats.categoryWiseRevenue[item.category] = 0;
                    }
                    stats.categoryWiseRevenue[item.category] += itemTotal;
                });
            });

        return stats;
    };

    // Group orders by date and user
    const filteredOrders = filterOrdersByDate(order);
    console.log('Orders after date filtering:', filteredOrders);
    
    const grouped = {};
    filteredOrders.forEach(item => {
        let orderDate;
        if (item.timestamp) {
            orderDate = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
        } else if (item.date) {
            orderDate = new Date(item.date);
        } else {
            console.log('No valid date found for order:', item);
            return;
        }

        // Format date as YYYY-MM-DD
        const date = orderDate.toISOString().split('T')[0];
        if (!grouped[date]) grouped[date] = {};
        
        // Group by user
        const userId = item.addressInfo?.name || 'Unknown User';
        if (!grouped[date][userId]) {
            grouped[date][userId] = {
                orders: [],
                totalAmount: 0,
                totalItems: 0
            };
        }
        grouped[date][userId].orders.push(item);
        grouped[date][userId].totalAmount += parseFloat(item.grandTotal || 0);
        grouped[date][userId].totalItems += (item.cartItems?.length || 0);
    });
    
    console.log('Final grouped orders:', grouped);
    
    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    console.log('Sorted dates:', sortedDates);

    // Calculate statistics
    const stats = calculateStats(filteredOrders);

    const renderAnalytics = () => (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Vegetables</h3>
                        <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Orders</span>
                            <span className="font-bold text-gray-900">{stats.vegetables.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Items Sold</span>
                            <span className="font-bold text-gray-900">{stats.vegetables.items}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Revenue</span>
                            <span className="font-bold text-green-600">₹{stats.vegetables.revenue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Leafy Vegetables</h3>
                        <Leaf className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Orders</span>
                            <span className="font-bold text-gray-900">{stats.leafy.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Items Sold</span>
                            <span className="font-bold text-gray-900">{stats.leafy.items}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Revenue</span>
                            <span className="font-bold text-green-600">₹{stats.leafy.revenue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Top Vegetables</h3>
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        {Object.entries(stats.topVegetables)
                            .sort((a, b) => b[1].quantity - a[1].quantity)
                            .slice(0, 3)
                            .map(([name, data], idx) => (
                                <div key={name} className="flex justify-between items-center">
                                    <span className="text-gray-600 truncate">{name}</span>
                                    <span className="font-bold text-gray-900">{data.quantity}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Top Leafy</h3>
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        {Object.entries(stats.topLeafy)
                            .sort((a, b) => b[1].quantity - a[1].quantity)
                            .slice(0, 3)
                            .map(([name, data], idx) => (
                                <div key={name} className="flex justify-between items-center">
                                    <span className="text-gray-600 truncate">{name}</span>
                                    <span className="font-bold text-gray-900">{data.quantity}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Category-wise Revenue Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Category-wise Revenue</h3>
                <div className="space-y-4">
                    {Object.entries(stats.categoryWiseRevenue).map(([category, revenue]) => (
                        <div key={category} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">{category}</span>
                                <span className="font-bold text-green-600">₹{revenue.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{
                                        width: `${(revenue / Object.values(stats.categoryWiseRevenue).reduce((a, b) => a + b, 0)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Daily Trends Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Order Trends</h3>
                <div className="space-y-6">
                    {Object.entries(stats.dailyTrends)
                        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                        .slice(0, 7)
                        .map(([date, data]) => (
                            <div key={date} className="space-y-2">
                                <div className="text-sm text-gray-600">{new Date(date).toLocaleDateString('en-IN', { 
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}</div>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Vegetables</span>
                                            <span>{data.vegetables} orders</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${(data.vegetables / (data.vegetables + data.leafy || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span>Leafy Vegetables</span>
                                            <span>{data.leafy} orders</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-lime-600 h-2 rounded-full"
                                                style={{ width: `${(data.leafy / (data.vegetables + data.leafy || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-green-50 min-h-screen">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Orders</h2>
                
                <div className="flex flex-wrap gap-4">
                    {/* Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>

                    {/* Tab Buttons */}
                    <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 text-sm font-medium ${
                                activeTab === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            All Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('vegetables')}
                            className={`px-4 py-2 text-sm font-medium ${
                                activeTab === 'vegetables'
                                    ? 'bg-green-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Vegetables
                        </button>
                        <button
                            onClick={() => setActiveTab('leafy')}
                            className={`px-4 py-2 text-sm font-medium ${
                                activeTab === 'leafy'
                                    ? 'bg-lime-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Leafy Vegetables
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-4 py-2 text-sm font-medium ${
                                activeTab === 'analytics'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Analytics
                        </button>
                    </div>
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'analytics' ? (
                renderAnalytics()
            ) : (
                <>
                    {sortedDates.length === 0 && <div className="text-gray-500 text-lg">No orders found.</div>}
                    <div className="space-y-12">
                        {sortedDates.map(date => (
                            <div key={date} className="space-y-6">
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="text-xl font-bold text-blue-700 bg-blue-100 px-4 py-1 rounded-full shadow-sm">
                                        {new Date(date).toLocaleDateString('en-IN', { 
                                            day: '2-digit', 
                                            month: 'short', 
                                            year: 'numeric', 
                                            weekday: 'short' 
                                        })}
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                        {Object.keys(grouped[date]).length} customer{Object.keys(grouped[date]).length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-6">
                                    {Object.entries(grouped[date]).map(([userId, userData]) => (
                                        <div key={`${date}-${userId}`} className="mb-6">
                                            <div className="flex items-center gap-2 mb-3 bg-blue-50 p-3 rounded-lg">
                                                <h3 className="text-lg font-semibold text-blue-800">{userId}</h3>
                                                <span className="text-sm text-blue-600">
                                                    {userData.orders.length} order{userData.orders.length > 1 ? 's' : ''} |
                                                    Total: ₹{userData.totalAmount.toFixed(2)} |
                                                    {userData.totalItems} items
                                                </span>
                                            </div>
                                            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-x-auto">
                                                <table className="min-w-full divide-y divide-blue-100">
                                                    <thead className="bg-blue-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Order Time</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Order ID</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Products</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Total</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-blue-50">
                                                        {userData.orders
                                                            .sort((a, b) => {
                                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || a.date);
                                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || b.date);
                                return dateB - dateA;
                            })
                                                            .filter(item => {
                                                                if (activeTab === 'all') return true;
                                                                return item.cartItems?.some(cartItem => {
                                                                    const isLeafy = cartItem.category?.toLowerCase().includes('leafy');
                                                                    return activeTab === 'leafy' ? isLeafy : !isLeafy;
                                                                });
                                                            })
                                                            .map((item) => {
                                                                const orderTime = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp || item.date);
                                                                const statusSteps = [
                                                                    { value: 'placed', label: 'Placed' },
                                                                    { value: 'harvested', label: 'Harvested' },
                                                                    { value: 'out for delivery', label: 'Out for Delivery' },
                                                                    { value: 'delivered', label: 'Delivered' },
                                                                ];
                                                                const currentStep = statusSteps.findIndex(s => 
                                                                    s.value === (orderStatusMap[item.id] || (item.status || '').toLowerCase())
                                                                );
                                                                return (
                                                                    <tr key={item.id} className="hover:bg-blue-50 transition">
                                                                        <td className="px-4 py-4 text-gray-700">
                                                                            {orderTime.toLocaleTimeString('en-IN', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                hour12: true
                                                                            })}
                                                                        </td>
                                                                        <td className="px-4 py-4 font-semibold text-gray-900">
                                                                            {item.orderId ? `#${item.orderId}` : item.id ? `#${item.id.slice(-8)}` : 'N/A'}
                                                                        </td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="text-gray-900">
                                                                                {item.cartItems?.length} item{item.cartItems?.length > 1 ? 's' : ''}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                {item.cartItems?.map(cartItem => (
                                                                                    <div key={`${item.id}-${cartItem.id || cartItem.title}`}>
                                                                                        {cartItem.title} x {cartItem.quantity}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 font-bold text-green-700">
                                                                            {(() => {
                                                                                let subtotal = typeof item.subtotal === 'number' ? item.subtotal : 
                                                                                    (item.cartItems ? item.cartItems.reduce((t, i) => t + (i.price * (i.quantity || 1)), 0) : 0);
                                                                                let delivery = typeof item.deliveryCharges === 'number' ? item.deliveryCharges : 
                                                                                    (typeof item.grandTotal === 'number' && typeof item.subtotal === 'number' ? 
                                                                                        (item.grandTotal - item.subtotal) : 0);
                                                                                let total = typeof item.grandTotal === 'number' ? item.grandTotal : (subtotal + delivery);
                                                                                return `₹${total.toFixed(2)}`;
                                                                            })()}
                                                                        </td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="flex gap-2 items-center">
                                                                                {statusSteps.map((step, i) => (
                                                                                    <button
                                                                                        key={`${item.id}-${step.value}`}
                                                                                        onClick={() => handleOrderStatusChange(item.id, step.value)}
                                                                                        className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold transition-all duration-200
                                                                                            ${i < currentStep ? 'bg-green-100 text-green-700 border-green-300' :
                                                                                            i === currentStep ? 'bg-green-600 text-white border-green-600' :
                                                                                            'bg-gray-100 text-gray-400 border-gray-200'}
                                                                                            ${i === currentStep ? 'shadow-lg' : ''}
                                                                                        `}
                                                                                        title={step.label}
                                                                                    >
                                                                                        {i <= currentStep ? <CheckCircle className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
                                                                                        {step.label}
                                                                                    </button>
                                                                                ))}
                                                                                {item.status !== 'delivered' && item.status !== 'cancelled' && (
                                                                                    <button
                                                                                        className="ml-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                                                                                        onClick={() => { setCancelOrderId(item.id); setCancelReason(''); }}
                                                                                    >
                                                                                        Cancel Order
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4">
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={() => setViewInvoiceId(item.id)}
                                                                                    className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
                                                                                    title="View Invoice"
                                                                                >
                                                                                    <Eye className="w-3 h-3" />
                                                                                    View
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handlePrintInvoice(item)}
                                                                                    className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
                                                                                    title="Print Invoice"
                                                                                >
                                                                                    <Printer className="w-3 h-3" />
                                                                                    Print
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => downloadInvoiceAsPDF(item)}
                                                                                    className="flex items-center gap-1 px-3 py-1 rounded bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition"
                                                                                    title="Download PDF"
                                                                                >
                                                                                    <Download className="w-3 h-3" />
                                                                                    PDF
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {/* Hidden Invoice Elements for Printing */}
                                            {userData.orders.map((item) => (
                                                <div key={`invoice-${item.id}`} id={`admin-invoice-${item.orderId || item.id}`} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
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
                                                                    <div style={{ color: '#666', fontSize: 14 }}>Date: {formatDateTime(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp || item.date)}</div>
                                                                </div>
                                                            </div>

                                                            {/* Order Details */}
                                                            <div style={{ background: '#f0f9f0', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                                    <div>
                                                                        <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 4 }}>Order Details</div>
                                                                        <div style={{ fontSize: 14, color: '#444' }}>
                                                                            <div>Order ID: #{item.orderId || item.id}</div>
                                                                            <div>Status: {item.status}</div>
                                                                            <div>Delivery Date: {getDeliveryDateTime(item)}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 4 }}>Delivery Address</div>
                                                                        <div style={{ fontSize: 14, color: '#444' }}>
                                                                            {item.addressInfo?.name}<br />
                                                                            {item.addressInfo?.houseNo}, {item.addressInfo?.blockNo}<br />
                                                                            {item.addressInfo?.landmark}<br />
                                                                            {item.addressInfo?.address}<br />
                                                                            {item.addressInfo?.pincode}
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
                                                                    {(item.cartItems || []).map((cartItem, idx) => (
                                                                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fbe7' : '#fff' }}>
                                                                            <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14 }}>{cartItem.title}</td>
                                                                            <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'center' }}>{cartItem.category}</td>
                                                                            <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'center' }}>{cartItem.quantity || 1}</td>
                                                                            <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'right' }}>₹{cartItem.price}</td>
                                                                            <td style={{ padding: 12, border: '1px solid #e0e0e0', fontSize: 14, textAlign: 'right' }}>₹{(cartItem.price * (cartItem.quantity || 1)).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>

                                                            {/* Totals */}
                                                            <div style={{ borderTop: '2px solid #217a3b', paddingTop: 16 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                    <span style={{ fontSize: 14, color: '#666' }}>Subtotal:</span>
                                                                    <span style={{ fontSize: 14, fontWeight: 600 }}>₹{calculateOrderTotal(item.cartItems || []).toFixed(2)}</span>
                                                                </div>
                                                                {item.discountAmount > 0 && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                        <span style={{ fontSize: 14, color: '#666' }}>Discount:</span>
                                                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#d32f2f' }}>-₹{item.discountAmount.toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                    <span style={{ fontSize: 14, color: '#666' }}>Delivery Charges:</span>
                                                                    <span style={{ fontSize: 14, fontWeight: 600 }}>₹{deliveryCharges.toFixed(2)}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: 8 }}>
                                                                    <span style={{ fontSize: 18, fontWeight: 700, color: '#217a3b' }}>Grand Total:</span>
                                                                    <span style={{ fontSize: 18, fontWeight: 700, color: '#217a3b' }}>₹{(calculateOrderTotal(item.cartItems || []) + deliveryCharges - (item.discountAmount || 0)).toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Footer */}
                                                            <div style={{ marginTop: 32, textAlign: 'center', color: '#666', fontSize: 12 }}>
                                                                <div>Thank you for choosing NaveDhana!</div>
                                                                <div>For any queries, contact us at support@navedhana.com</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Cancel Order Modal */}
            {cancelOrderId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full relative">
                        <button 
                            onClick={() => setCancelOrderId(null)} 
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold"
                        >
                            &times;
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-red-700">Cancel Order</h3>
                        <label className="block text-sm font-semibold mb-2">Reason for cancellation:</label>
                        <textarea
                            className="w-full border rounded-lg p-2 mb-4 text-sm"
                            rows={3}
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Enter reason..."
                        />
                        <button
                            className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition"
                            disabled={cancelLoading || !cancelReason.trim()}
                            onClick={async () => {
                                setCancelLoading(true);
                                try {
                                    // Find the order to get user details and amount
                                    const orderToCancel = order.find(o => o.id === cancelOrderId);
                                    
                                    await updateDoc(doc(fireDB, 'orders', cancelOrderId), {
                                        status: 'cancelled',
                                        cancellationReason: cancelReason,
                                        cancellationTime: new Date().toISOString(),
                                    });
                                    
                                    // Track user activity for order cancellation
                                    if (orderToCancel && trackUserActivity) {
                                        const userPhone = orderToCancel.addressInfo?.phoneNumber;
                                        const orderAmount = parseFloat(orderToCancel.totalAmount || orderToCancel.grandTotal || 0);
                                        
                                        if (userPhone) {
                                            try {
                                                await trackUserActivity(userPhone, 'order_cancelled', {
                                                    orderId: cancelOrderId,
                                                    amount: orderAmount,
                                                    reason: cancelReason
                                                });
                                            } catch (trackingError) {
                                                console.error('Failed to track order cancellation:', trackingError);
                                            }
                                        }
                                    }
                                    
                                    toast.success('Order cancelled successfully!');
                                    setCancelOrderId(null);
                                    setCancelReason('');
                                } catch (err) {
                                    toast.error('Failed to cancel order');
                                } finally {
                                    setCancelLoading(false);
                                }
                            }}
                        >
                            Confirm Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {viewInvoiceId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full relative overflow-auto" style={{ maxHeight: '90vh' }}>
                        <button onClick={() => setViewInvoiceId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                        {/* Invoice UI */}
                        {(() => {
                            const invoiceOrder = getInvoiceOrder();
                            if (!invoiceOrder) return null;
                            return (
                                <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-green-100 font-sans">
                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b pb-4 mb-4">
                                        <div>
                                            <img src="/navedhana_LOGO.png" alt="Navedhana Logo" className="w-20 mb-2" />
                                            <div className="font-extrabold text-2xl text-green-700 tracking-wide">NAVEDHANA</div>
                                            <div className="text-xs text-gray-500 font-semibold">Fresh Vegetables & Leafy Greens</div>
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
                                                    <th className="py-2 px-3 text-center font-semibold text-green-700">Category</th>
                                                    <th className="py-2 px-3 text-center font-semibold text-green-700">Qty</th>
                                                    <th className="py-2 px-3 text-right font-semibold text-green-700">Price</th>
                                                    <th className="py-2 px-3 text-right font-semibold text-green-700">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(invoiceOrder.cartItems || []).map((item, idx) => (
                                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                                                        <td className="py-2 px-3 text-gray-900">{item.title}</td>
                                                        <td className="py-2 px-3 text-center text-gray-700">{item.category}</td>
                                                        <td className="py-2 px-3 text-center">{item.quantity || 1}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            {item.actualprice > item.price && (
                                                                <span className="block text-xs text-gray-400 line-through">₹{item.actualprice}</span>
                                                            )}
                                                            <span className="font-semibold text-green-700">₹{item.price}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-bold text-green-700">₹{(item.price * (item.quantity || 1)).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-4 justify-center pt-4 border-t">
                                        <button
                                            onClick={() => handlePrintInvoice(invoiceOrder)}
                                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print Invoice
                                        </button>
                                        <button
                                            onClick={() => downloadInvoiceAsPDF(invoiceOrder)}
                                            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </button>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="mt-6 text-center text-gray-500 text-xs">
                                        <div>Thank you for choosing NaveDhana!</div>
                                        <div>For any queries, contact us at support@navedhana.com</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders; 