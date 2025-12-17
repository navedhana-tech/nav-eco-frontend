import React, { useState, useEffect, useContext } from 'react';
import { 
    Leaf, 
    Carrot,
    Search,
    ArrowUpDown,
    LayoutList,
    ListFilter,
    Loader,
    Download,
    Printer,
    Filter,
    X,
    ChevronDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { fireDB } from '../../../../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import myContext from '../../../../context/data/myContext';

function Inventory() {
    const context = useContext(myContext);
    const { order, loading, setLoading } = context;

    // State
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [activeTab, setActiveTab] = useState('orderData');
    const [productStats, setProductStats] = useState([]);
    
    // Column sorting state for Order Data table
    const [orderTableSort, setOrderTableSort] = useState({ column: null, order: 'asc' });
    
    // Column sorting state for Product List table
    const [productTableSort, setProductTableSort] = useState({ column: null, order: 'asc' });
    
    // Excel-like filter states
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [statusFilter, setStatusFilter] = useState('all');
    const [customerFilter, setCustomerFilter] = useState('');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    
    // Product list date filter (default to today)
    const [productListDateFilter, setProductListDateFilter] = useState('today'); // 'today', 'all', 'custom'
    const [productListDateRange, setProductListDateRange] = useState({ start: '', end: '' });

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter orders by date for product list
    const filterOrdersForProductList = (ordersData) => {
        let filteredOrders = ordersData.filter(order => order.status !== 'cancelled');
        
        if (productListDateFilter === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.date || order.timestamp);
                const orderDateOnly = new Date(orderDate);
                orderDateOnly.setHours(0, 0, 0, 0);
                return orderDateOnly >= today && orderDateOnly < tomorrow;
            });
        } else if (productListDateFilter === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const today = new Date(yesterday);
            today.setDate(today.getDate() + 1);
            
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.date || order.timestamp);
                const orderDateOnly = new Date(orderDate);
                orderDateOnly.setHours(0, 0, 0, 0);
                return orderDateOnly >= yesterday && orderDateOnly < today;
            });
        } else if (productListDateFilter === 'custom' && (productListDateRange.start || productListDateRange.end)) {
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.date || order.timestamp);
                const orderDateStr = orderDate.toISOString().split('T')[0];
                
                if (productListDateRange.start && orderDateStr < productListDateRange.start) return false;
                if (productListDateRange.end && orderDateStr > productListDateRange.end) return false;
                return true;
            });
        }
        // If 'all', no date filtering is applied
        
        return filteredOrders;
    };

    // Calculate product statistics (excluding cancelled orders)
    const calculateProductStats = (ordersData) => {
        const stats = new Map();
        
        // Filter orders by date first
        const filteredOrders = filterOrdersForProductList(ordersData);

        filteredOrders.forEach(order => {
            order.cartItems?.forEach(item => {
                const key = `${item.title || item.name}-${item.category || 'vegetables'}`;
                if (!stats.has(key)) {
                    stats.set(key, {
                        name: item.title || item.name,
                        category: item.category || 'vegetables',
                        totalQuantity: 0,
                        totalOrders: 0,
                        totalRevenue: 0,
                        lastOrdered: null
                    });
                }
                const stat = stats.get(key);
                stat.totalQuantity += Number(item.quantity || 0);
                stat.totalOrders += 1;
                stat.totalRevenue += Number(item.quantity || 0) * Number(item.price || 0);
                
                const orderDate = order.timestamp?.toDate?.() || new Date(order.date || order.timestamp);
                if (!stat.lastOrdered || orderDate > stat.lastOrdered) {
                    stat.lastOrdered = orderDate;
                }
            });
        });

        setProductStats(Array.from(stats.values()));
    };

    useEffect(() => {
        if (order && order.length > 0) {
            calculateProductStats(order);
        }
    }, [order, productListDateFilter, productListDateRange]);

    // Get unique customers and statuses for filters
    const getUniqueCustomers = () => {
        const customers = new Set();
        order.forEach(order => {
            const customerName = order.addressInfo?.name || order.name || 'N/A';
            customers.add(customerName);
        });
        return Array.from(customers).sort();
    };

    const getUniqueStatuses = () => {
        const statuses = new Set();
        order.forEach(order => {
            const status = order.status || 'placed';
            statuses.add(status);
        });
        return Array.from(statuses).sort();
    };

    // Filter and sort orders with Excel-like filters
    const getFilteredAndSortedOrders = () => {
        let filteredOrders = [...order];

        // Category filter
        if (selectedCategory !== 'all') {
            filteredOrders = filteredOrders.filter(order => {
                const hasMatchingCategory = order.cartItems?.some(item => {
                    const itemCategory = item.category || 'vegetables';
                    const isLeafy = itemCategory.toLowerCase().includes('leafy');
                    
                    if (selectedCategory === 'leafy_vegetables') {
                        return isLeafy;
                    } else if (selectedCategory === 'vegetables') {
                        return !isLeafy;
                    }
                    return true;
                });
                
                return hasMatchingCategory;
            });
        }

        // Date range filter
        if (dateRange.start || dateRange.end) {
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.timestamp?.toDate?.() || new Date(order.date || order.timestamp);
                const orderDateStr = orderDate.toISOString().split('T')[0];
                
                if (dateRange.start && orderDateStr < dateRange.start) return false;
                if (dateRange.end && orderDateStr > dateRange.end) return false;
                return true;
            });
        }

        // Status filter
        if (selectedStatuses.length > 0) {
            filteredOrders = filteredOrders.filter(order => {
                const orderStatus = order.status || 'placed';
                return selectedStatuses.includes(orderStatus);
            });
        }

        // Customer filter
        if (selectedCustomers.length > 0) {
            filteredOrders = filteredOrders.filter(order => {
                const customerName = order.addressInfo?.name || order.name || 'N/A';
                return selectedCustomers.includes(customerName);
            });
        }

        // Price range filter
        if (priceRange.min || priceRange.max) {
            filteredOrders = filteredOrders.filter(order => {
                const totalAmount = order.grandTotal || 
                    order.cartItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0) || 0;
                
                if (priceRange.min && totalAmount < Number(priceRange.min)) return false;
                if (priceRange.max && totalAmount > Number(priceRange.max)) return false;
                return true;
            });
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredOrders = filteredOrders.filter(order => {
                const itemMatches = order.cartItems?.some(item => 
                    (item.title || item.name || '').toLowerCase().includes(query)
                );
                const customerMatches = (order.addressInfo?.name || order.name || 'N/A').toLowerCase().includes(query);
                const orderIdMatches = (order.orderId || order.id || '').toLowerCase().includes(query);
                
                return itemMatches || customerMatches || orderIdMatches;
            });
        }

        // Sorting
        filteredOrders.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    const dateA = a.timestamp?.toDate?.() || new Date(a.date || a.timestamp);
                    const dateB = b.timestamp?.toDate?.() || new Date(b.date || b.timestamp);
                    comparison = dateB - dateA;
                    break;
                case 'name':
                    comparison = (a.addressInfo?.name || a.name || 'N/A').localeCompare(b.addressInfo?.name || b.name || 'N/A');
                    break;
                case 'quantity':
                    const quantityA = a.cartItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
                    const quantityB = b.cartItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
                    comparison = quantityB - quantityA;
                    break;
                default:
                    const defaultDateA = a.timestamp?.toDate?.() || new Date(a.date || a.timestamp);
                    const defaultDateB = b.timestamp?.toDate?.() || new Date(b.date || b.timestamp);
                    comparison = defaultDateB - defaultDateA;
            }
            return sortOrder === 'asc' ? -comparison : comparison;
        });

        return filteredOrders;
    };

    // Get filtered product stats with column sorting
    const getFilteredProductStats = () => {
        const categoryFiltered = productStats.filter(product => {
            if (selectedCategory === 'all') return true;
            const isLeafy = product.category?.toLowerCase().includes('leafy');
            if (selectedCategory === 'leafy_vegetables') {
                return isLeafy;
            } else if (selectedCategory === 'vegetables') {
                return !isLeafy;
            }
            return true;
        });
        
        const searchFiltered = categoryFiltered.filter(product => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (product.name || '').toLowerCase().includes(query);
        });
        
        // Apply column sorting
        if (productTableSort.column) {
            searchFiltered.sort((a, b) => {
                let comparison = 0;
                switch (productTableSort.column) {
                    case 'name':
                        comparison = (a.name || '').localeCompare(b.name || '');
                        break;
                    case 'category':
                        comparison = (a.category || '').localeCompare(b.category || '');
                        break;
                    case 'quantity':
                        comparison = (a.totalQuantity || 0) - (b.totalQuantity || 0);
                        break;
                    case 'orders':
                        comparison = (a.totalOrders || 0) - (b.totalOrders || 0);
                        break;
                    case 'revenue':
                        comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0);
                        break;
                    case 'lastOrdered':
                        const dateA = a.lastOrdered ? (a.lastOrdered.toDate ? a.lastOrdered.toDate() : new Date(a.lastOrdered)) : new Date(0);
                        const dateB = b.lastOrdered ? (b.lastOrdered.toDate ? b.lastOrdered.toDate() : new Date(b.lastOrdered)) : new Date(0);
                        comparison = dateA - dateB;
                        break;
                    default:
                        comparison = (b.totalQuantity || 0) - (a.totalQuantity || 0);
                }
                return productTableSort.order === 'asc' ? comparison : -comparison;
            });
        } else {
            // Default sort by quantity descending
            searchFiltered.sort((a, b) => b.totalQuantity - a.totalQuantity);
        }
        
        return searchFiltered;
    };
    
    // Handle product table column sort
    const handleProductTableSort = (column) => {
        if (productTableSort.column === column) {
            // Toggle order if same column
            setProductTableSort({
                column,
                order: productTableSort.order === 'asc' ? 'desc' : 'asc'
            });
        } else {
            // New column, default to ascending
            setProductTableSort({ column, order: 'asc' });
        }
    };
    
    // Handle order table column sort
    const handleOrderTableSort = (column) => {
        if (orderTableSort.column === column) {
            setOrderTableSort({
                column,
                order: orderTableSort.order === 'asc' ? 'desc' : 'asc'
            });
        } else {
            setOrderTableSort({ column, order: 'asc' });
        }
    };
    
    // Sort icon component
    const SortIcon = ({ column, currentSort }) => {
        if (currentSort.column !== column) {
            return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
        }
        return currentSort.order === 'asc' 
            ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
            : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
    };

    // Download functions
    const downloadCSV = (data, filename) => {
        if (data.length === 0) {
            toast.error('No data to download');
            return;
        }

        let csvContent = '';
        
        if (activeTab === 'orderData') {
            // CSV for order data
            csvContent = 'Order ID,Customer Name,Product Name,Category,Quantity,Date,Order Count\n';
            
            // Group orders by customer and date for CSV
            const groupedOrders = new Map();
            data.forEach(order => {
                const customerName = order.addressInfo?.name || order.name || 'N/A';
                const orderDate = order.timestamp?.toDate?.() || new Date(order.date || order.timestamp);
                const dateKey = orderDate.toISOString().split('T')[0];
                const groupKey = `${customerName}-${dateKey}`;
                
                if (!groupedOrders.has(groupKey)) {
                    groupedOrders.set(groupKey, {
                        customerName,
                        date: orderDate,
                        orders: [],
                        orderCount: 0
                    });
                }
                
                const group = groupedOrders.get(groupKey);
                group.orders.push(order);
                group.orderCount++;
            });
            
            // Generate CSV content
            groupedOrders.forEach(group => {
                group.orders.forEach(order => {
                    order.cartItems?.forEach(item => {
                        const orderId = order.orderId ? `#${order.orderId}` : `#${order.id.slice(-8)}`;
                        const customerName = order.addressInfo?.name || order.name || 'N/A';
                        const productName = item.title || item.name;
                        const category = (item.category || 'vegetables').toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable';
                        const quantity = (item.category || 'vegetables').toLowerCase().includes('leafy') 
                            ? `${parseInt(item.quantity || 1)} piece${parseInt(item.quantity || 1) > 1 ? 's' : ''}`
                            : `${Number(item.quantity || 0).toFixed(2)} kg`;
                        const date = formatDate(order.timestamp || order.date);
                        const orderCount = group.orderCount > 1 ? `${group.orderCount} orders` : '1 order';
                        
                        csvContent += `"${orderId}","${customerName}","${productName}","${category}","${quantity}","${date}","${orderCount}"\n`;
                    });
                });
            });
        } else {
            // CSV for product stats
            csvContent = 'Product Name,Category,Total Quantity,Total Orders,Total Revenue,Last Ordered\n';
            data.forEach(product => {
                const quantity = product.category?.toLowerCase().includes('leafy')
                    ? `${parseInt(product.totalQuantity || 0)} piece${parseInt(product.totalQuantity || 0) > 1 ? 's' : ''}`
                    : `${Number(product.totalQuantity || 0).toFixed(2)} kg`;
                const category = product.category?.toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable';
                const lastOrdered = product.lastOrdered ? formatDate(product.lastOrdered) : 'N/A';
                
                csvContent += `"${product.name}","${category}","${quantity}","${product.totalOrders}","₹${product.totalRevenue.toFixed(2)}","${lastOrdered}"\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownload = () => {
        const data = activeTab === 'orderData' ? getFilteredAndSortedOrders() : getFilteredProductStats();
        const filename = `inventory_${activeTab}_${new Date().toISOString().split('T')[0]}`;
        downloadCSV(data, filename);
        toast.success('Data downloaded successfully!');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const data = activeTab === 'orderData' ? getFilteredAndSortedOrders() : getFilteredProductStats();
        
        let printContent = `
            <html>
            <head>
                <title>Inventory Report - ${activeTab === 'orderData' ? 'Order Data' : 'Product List'}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .filters { margin-bottom: 20px; font-size: 12px; color: #666; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Inventory Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
        `;

        if (activeTab === 'orderData') {
            printContent += `
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer Name</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Date</th>
                            <th>Order Count</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            // Group orders by customer and date for print
            const groupedOrders = new Map();
            data.forEach(order => {
                const customerName = order.addressInfo?.name || order.name || 'N/A';
                const orderDate = order.timestamp?.toDate?.() || new Date(order.date || order.timestamp);
                const dateKey = orderDate.toISOString().split('T')[0];
                const groupKey = `${customerName}-${dateKey}`;
                
                if (!groupedOrders.has(groupKey)) {
                    groupedOrders.set(groupKey, {
                        customerName,
                        date: orderDate,
                        orders: [],
                        orderCount: 0
                    });
                }
                
                const group = groupedOrders.get(groupKey);
                group.orders.push(order);
                group.orderCount++;
            });
            
            // Generate print content
            groupedOrders.forEach(group => {
                group.orders.forEach(order => {
                    order.cartItems?.forEach(item => {
                        const orderId = order.orderId ? `#${order.orderId}` : `#${order.id.slice(-8)}`;
                        const customerName = order.addressInfo?.name || order.name || 'N/A';
                        const productName = item.title || item.name;
                        const category = (item.category || 'vegetables').toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable';
                        const quantity = (item.category || 'vegetables').toLowerCase().includes('leafy') 
                            ? `${parseInt(item.quantity || 1)} piece${parseInt(item.quantity || 1) > 1 ? 's' : ''}`
                            : `${Number(item.quantity || 0).toFixed(2)} kg`;
                        const date = formatDate(order.timestamp || order.date);
                        const orderCount = group.orderCount > 1 ? `${group.orderCount} orders` : '1 order';
                        
                        printContent += `
                            <tr>
                                <td>${orderId}</td>
                                <td>${customerName}</td>
                                <td>${productName}</td>
                                <td>${category}</td>
                                <td>${quantity}</td>
                                <td>${date}</td>
                                <td>${orderCount}</td>
                            </tr>
                        `;
                    });
                });
            });
        } else {
            printContent += `
                <table>
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Total Quantity</th>
                            <th>Total Orders</th>
                            <th>Total Revenue</th>
                            <th>Last Ordered</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(product => {
                const quantity = product.category?.toLowerCase().includes('leafy')
                    ? `${parseInt(product.totalQuantity || 0)} piece${parseInt(product.totalQuantity || 0) > 1 ? 's' : ''}`
                    : `${Number(product.totalQuantity || 0).toFixed(2)} kg`;
                const category = product.category?.toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable';
                const lastOrdered = product.lastOrdered ? formatDate(product.lastOrdered) : 'N/A';
                
                printContent += `
                    <tr>
                        <td>${product.name}</td>
                        <td>${category}</td>
                        <td>${quantity}</td>
                        <td>${product.totalOrders}</td>
                        <td>₹${product.totalRevenue.toFixed(2)}</td>
                        <td>${lastOrdered}</td>
                    </tr>
                `;
            });
        }

        printContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex justify-between items-center">
                <div>
                        <h2 className="text-2xl font-semibold text-gray-800">Inventory Analysis</h2>
                        <p className="text-gray-600 mt-1">Track and analyze order data</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex gap-4 mt-6">
                    <button
                        onClick={() => setActiveTab('orderData')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                            activeTab === 'orderData'
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <LayoutList className="w-4 h-4" />
                        Order Data Structure
                    </button>
                    <button
                        onClick={() => setActiveTab('productList')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                            activeTab === 'productList'
                                ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <ListFilter className="w-4 h-4" />
                        Order Product List
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* Product List Date Filter (only show in productList tab) */}
            {activeTab === 'productList' && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="text-sm font-medium text-gray-700">Filter by Date:</label>
                        <select
                            value={productListDateFilter}
                            onChange={(e) => {
                                setProductListDateFilter(e.target.value);
                                if (e.target.value !== 'custom') {
                                    setProductListDateRange({ start: '', end: '' });
                                }
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="today">Today Only</option>
                            <option value="yesterday">Yesterday Only</option>
                            <option value="all">All Orders</option>
                            <option value="custom">Custom Date Range</option>
                        </select>
                        
                        {productListDateFilter === 'custom' && (
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={productListDateRange.start}
                                    onChange={(e) => setProductListDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Start Date"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={productListDateRange.end}
                                    onChange={(e) => setProductListDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="End Date"
                                />
                            </div>
                        )}
                        
                        {productListDateFilter === 'today' && (
                            <span className="text-sm text-blue-700 font-medium">
                                Showing orders from: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                        {productListDateFilter === 'yesterday' && (
                            <span className="text-sm text-blue-700 font-medium">
                                Showing orders from: {(() => {
                                    const yesterday = new Date();
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    return yesterday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                })()}
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            {/* Category Tabs */}
            <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                            selectedCategory === 'all'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All Products
                    </button>
                <button
                    onClick={() => setSelectedCategory('vegetables')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                        selectedCategory === 'vegetables'
                            ? 'bg-orange-100 text-orange-700 border-2 border-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <Carrot className="w-4 h-4" />
                    Vegetables
                </button>
                <button
                    onClick={() => setSelectedCategory('leafy_vegetables')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                        selectedCategory === 'leafy_vegetables'
                            ? 'bg-green-100 text-green-700 border-2 border-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <Leaf className="w-4 h-4" />
                    Leafy Vegetables
                </button>
            </div>

                {/* Excel-like Filters */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                        <Filter className="w-4 h-4" />
                        Advanced Filters
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showFilters && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                                    <div className="space-y-2">
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Start Date"
                                        />
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="End Date"
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            if (e.target.value === 'all') {
                                                setSelectedStatuses([]);
                                            } else {
                                                setSelectedStatuses([e.target.value]);
                                            }
                                            setStatusFilter(e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="all">All Statuses</option>
                                        {getUniqueStatuses().map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Customer Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                    <select
                                        value={customerFilter}
                                        onChange={(e) => {
                                            if (e.target.value === 'all') {
                                                setSelectedCustomers([]);
                                            } else {
                                                setSelectedCustomers([e.target.value]);
                                            }
                                            setCustomerFilter(e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="all">All Customers</option>
                                        {getUniqueCustomers().map(customer => (
                                            <option key={customer} value={customer}>{customer}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Range (₹)</label>
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            value={priceRange.min}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Min Price"
                                        />
                                        <input
                                            type="number"
                                            value={priceRange.max}
                                            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Max Price"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Clear Filters */}
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => {
                                        setDateRange({ start: '', end: '' });
                                        setStatusFilter('all');
                                        setCustomerFilter('');
                                        setPriceRange({ min: '', max: '' });
                                        setSelectedCustomers([]);
                                        setSelectedStatuses([]);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                >
                                    <X className="w-3 h-3" />
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    )}
            </div>

            {/* Search and Sort */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'orderData' ? "Search by order ID, customer name..." : "Search by product name..."}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                    {activeTab === 'orderData' && (
                        <>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                    <option value="date">Sort by Date</option>
                    <option value="name">Sort by Customer Name</option>
                    <option value="quantity">Sort by Quantity</option>
                </select>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 rounded-lg border-2 border-gray-200 hover:bg-gray-100"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                    <ArrowUpDown className="w-5 h-5 text-gray-600" />
                </button>
                        </>
                    )}
                    {/* Reset Filters Button */}
                    {(selectedCategory !== 'all' || searchQuery || dateRange.start || dateRange.end || selectedStatuses.length > 0 || selectedCustomers.length > 0 || priceRange.min || priceRange.max) && (
                        <button
                            onClick={() => {
                                setSelectedCategory('all');
                                setSearchQuery('');
                                setDateRange({ start: '', end: '' });
                                setStatusFilter('all');
                                setCustomerFilter('');
                                setPriceRange({ min: '', max: '' });
                                setSelectedCustomers([]);
                                setSelectedStatuses([]);
                            }}
                            className="px-4 py-2 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            title="Reset all filters"
                        >
                            Reset Filters
                        </button>
                    )}
            </div>

                {/* Filter Status */}
                {(selectedCategory !== 'all' || searchQuery || dateRange.start || dateRange.end || selectedStatuses.length > 0 || selectedCustomers.length > 0 || priceRange.min || priceRange.max) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-700">
                            <strong>Active Filters:</strong>
                            {selectedCategory !== 'all' && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Category: {selectedCategory === 'vegetables' ? 'Vegetables' : 'Leafy Vegetables'}
                                </span>
                            )}
                            {searchQuery && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Search: "{searchQuery}"
                                </span>
                            )}
                            {dateRange.start && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Date: {dateRange.start} to {dateRange.end || 'Today'}
                                </span>
                            )}
                            {selectedStatuses.length > 0 && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Status: {selectedStatuses.join(', ')}
                                </span>
                            )}
                            {selectedCustomers.length > 0 && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Customer: {selectedCustomers.join(', ')}
                                </span>
                            )}
                            {(priceRange.min || priceRange.max) && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                    Price: ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                                </span>
                            )}
                        </div>
                                </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
                        <span className="ml-2 text-gray-600">Loading data...</span>
                            </div>
                )}

                {/* Table Views */}
                {!loading && activeTab === 'orderData' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50">
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('orderId')}
                                    >
                                        <div className="flex items-center">
                                            Order ID
                                            <SortIcon column="orderId" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('customerName')}
                                    >
                                        <div className="flex items-center">
                                            Customer Name
                                            <SortIcon column="customerName" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('productName')}
                                    >
                                        <div className="flex items-center">
                                            Product Name
                                            <SortIcon column="productName" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('category')}
                                    >
                                        <div className="flex items-center">
                                            Category
                                            <SortIcon column="category" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('quantity')}
                                    >
                                        <div className="flex items-center">
                                            Quantity
                                            <SortIcon column="quantity" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleOrderTableSort('date')}
                                    >
                                        <div className="flex items-center">
                                            Date
                                            <SortIcon column="date" currentSort={orderTableSort} />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Order Count</th>
                                    </tr>
                                </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(() => {
                                    const orders = getFilteredAndSortedOrders();
                                    const groupedOrders = new Map();
                                    
                                    // Group orders by customer and date
                                    orders.forEach(order => {
                                        const customerName = order.addressInfo?.name || order.name || 'N/A';
                                        const orderDate = order.timestamp?.toDate?.() || new Date(order.date || order.timestamp);
                                        const dateKey = orderDate.toISOString().split('T')[0];
                                        const groupKey = `${customerName}-${dateKey}`;
                                        
                                        if (!groupedOrders.has(groupKey)) {
                                            groupedOrders.set(groupKey, {
                                                customerName,
                                                date: orderDate,
                                                orders: [],
                                                orderCount: 0
                                            });
                                        }
                                        
                                        const group = groupedOrders.get(groupKey);
                                        group.orders.push(order);
                                        group.orderCount++;
                                    });
                                    
                                    // Flatten grouped orders for display
                                    const flattenedOrders = [];
                                    groupedOrders.forEach(group => {
                                        group.orders.forEach(order => {
                                            order.cartItems?.forEach((item, itemIndex) => {
                                                flattenedOrders.push({
                                                    order,
                                                    item,
                                                    itemIndex,
                                                    orderCount: group.orderCount,
                                                    isFirstInGroup: itemIndex === 0 && group.orders.indexOf(order) === 0,
                                                    orderId: order.orderId ? `#${order.orderId}` : order.id ? `#${order.id.slice(-8)}` : 'N/A',
                                                    customerName: order.addressInfo?.name || order.name || 'N/A',
                                                    productName: item.title || item.name || '',
                                                    category: item.category || 'vegetables',
                                                    quantity: Number(item.quantity || 0),
                                                    date: order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.date || order.timestamp)
                                                });
                                            });
                                        });
                                    });
                                    
                                    // Apply column sorting if active
                                    if (orderTableSort.column) {
                                        flattenedOrders.sort((a, b) => {
                                            let comparison = 0;
                                            switch (orderTableSort.column) {
                                                case 'orderId':
                                                    comparison = (a.orderId || '').localeCompare(b.orderId || '');
                                                    break;
                                                case 'customerName':
                                                    comparison = a.customerName.localeCompare(b.customerName);
                                                    break;
                                                case 'productName':
                                                    comparison = a.productName.localeCompare(b.productName);
                                                    break;
                                                case 'category':
                                                    comparison = a.category.localeCompare(b.category);
                                                    break;
                                                case 'quantity':
                                                    comparison = a.quantity - b.quantity;
                                                    break;
                                                case 'date':
                                                    comparison = a.date - b.date;
                                                    break;
                                                default:
                                                    comparison = 0;
                                            }
                                            return orderTableSort.order === 'asc' ? comparison : -comparison;
                                        });
                                    }
                                    
                                    return flattenedOrders.map(({ order, item, itemIndex, orderCount, isFirstInGroup }, index) => (
                                        <tr 
                                            key={`${order.id}-${itemIndex}-${index}`} 
                                            className={`hover:bg-gray-50 ${
                                                isFirstInGroup && orderCount > 1 
                                                    ? 'border-t-2 border-blue-200 bg-blue-50' 
                                                    : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {order.orderId ? `#${order.orderId}` : order.id ? `#${order.id.slice(-8)}` : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {order.addressInfo?.name || order.name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.title || item.name}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                    (item.category || 'vegetables').toLowerCase().includes('leafy')
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {(item.category || 'vegetables').toLowerCase().includes('leafy') ? <Leaf className="w-3 h-3" /> : <Carrot className="w-3 h-3" />}
                                                    {(item.category || 'vegetables').toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                                {(item.category || 'vegetables').toLowerCase().includes('leafy') 
                                                    ? `${parseInt(item.quantity || 1)} piece${parseInt(item.quantity || 1) > 1 ? 's' : ''}`
                                                    : `${Number(item.quantity || 0).toFixed(2)} kg`
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.timestamp || order.date)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {orderCount > 1 ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                        {orderCount} orders
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                ) : !loading ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('name')}
                                    >
                                        <div className="flex items-center">
                                            Product Name
                                            <SortIcon column="name" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('category')}
                                    >
                                        <div className="flex items-center">
                                            Category
                                            <SortIcon column="category" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('quantity')}
                                    >
                                        <div className="flex items-center">
                                            Total Quantity
                                            <SortIcon column="quantity" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('orders')}
                                    >
                                        <div className="flex items-center">
                                            Total Orders
                                            <SortIcon column="orders" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('revenue')}
                                    >
                                        <div className="flex items-center">
                                            Total Revenue
                                            <SortIcon column="revenue" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleProductTableSort('lastOrdered')}
                                    >
                                        <div className="flex items-center">
                                            Last Ordered
                                            <SortIcon column="lastOrdered" currentSort={productTableSort} />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {getFilteredProductStats().map((product, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                product.category?.toLowerCase().includes('leafy')
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {product.category?.toLowerCase().includes('leafy') ? <Leaf className="w-3 h-3" /> : <Carrot className="w-3 h-3" />}
                                                {product.category?.toLowerCase().includes('leafy') ? 'Leafy Vegetable' : 'Vegetable'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                            {product.category?.toLowerCase().includes('leafy')
                                                ? `${parseInt(product.totalQuantity || 0)} piece${parseInt(product.totalQuantity || 0) > 1 ? 's' : ''}`
                                                : `${Number(product.totalQuantity || 0).toFixed(2)} kg`
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{product.totalOrders}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-green-600">₹{product.totalRevenue.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {product.lastOrdered ? formatDate(product.lastOrdered) : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                    </div>
                ) : null}

            {/* Empty State */}
                {!loading && ((activeTab === 'orderData' && getFilteredAndSortedOrders().length === 0) ||
                  (activeTab === 'productList' && getFilteredProductStats().length === 0)) && (
                <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                    <p className="text-gray-500">
                        {searchQuery 
                                ? "No items match your search criteria" 
                                : `No ${selectedCategory.replace('_', ' ')} data available`
                        }
                    </p>
                </div>
            )}
            </div>
        </div>
    );
}

export default Inventory; 