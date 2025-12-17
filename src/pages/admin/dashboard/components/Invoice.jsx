import React, { useState, useEffect, useContext } from 'react';
import { FileText, Plus, Save, Eye, Trash2, Download, Printer, Search, Calendar, User, MapPin, Phone, Mail, Building, Edit } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import { fireDB } from '../../../../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import myContext from '../../../../context/data/myContext';

const Invoice = () => {
    const context = useContext(myContext);
    const { product } = context;
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [viewInvoiceId, setViewInvoiceId] = useState(null);
    const [previewInvoice, setPreviewInvoice] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        customerCity: '',
        customerState: '',
        customerPincode: '',
        items: [{ category: '', name: '', productId: '', quantity: 1, price: 0, total: 0 }],
        subtotal: 0,
        tax: 0,
        discount: 0,
        deliveryCharge: 0,
        total: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Generate invoice number
    const generateInvoiceNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${year}${month}${day}-${random}`;
    };

    useEffect(() => {
        if (showForm && !invoiceForm.invoiceNumber) {
            setInvoiceForm(prev => ({ ...prev, invoiceNumber: generateInvoiceNumber() }));
        }
    }, [showForm]);

    // Fetch invoices from Firebase
    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const invoicesRef = collection(fireDB, 'invoices');
            const q = query(invoicesRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const invoicesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInvoices(invoicesData);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Calculate item total
    const calculateItemTotal = (quantity, price) => {
        return parseFloat((quantity * price).toFixed(2));
    };

    // Update invoice totals
    const updateTotals = (items, tax, discount, deliveryCharge) => {
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxAmount = parseFloat(((subtotal * tax) / 100).toFixed(2));
        const discountAmount = parseFloat((discount || 0).toFixed(2));
        const deliveryChargeAmount = parseFloat((deliveryCharge || 0).toFixed(2));
        const total = parseFloat((subtotal + taxAmount - discountAmount + deliveryChargeAmount).toFixed(2));
        return { subtotal, taxAmount, discountAmount, deliveryChargeAmount, total };
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInvoiceForm(prev => ({ ...prev, [name]: value }));
        
        if (name === 'tax' || name === 'discount' || name === 'deliveryCharge') {
            const { subtotal, taxAmount, discountAmount, deliveryChargeAmount, total } = updateTotals(
                invoiceForm.items,
                name === 'tax' ? parseFloat(value) : invoiceForm.tax,
                name === 'discount' ? parseFloat(value) : invoiceForm.discount,
                name === 'deliveryCharge' ? parseFloat(value) : invoiceForm.deliveryCharge
            );
            setInvoiceForm(prev => ({
                ...prev,
                subtotal,
                tax: name === 'tax' ? parseFloat(value) : prev.tax,
                discount: name === 'discount' ? parseFloat(value) : prev.discount,
                deliveryCharge: name === 'deliveryCharge' ? parseFloat(value) : prev.deliveryCharge,
                total
            }));
        }
    };

    // Get products by category (sorted alphabetically)
    const getProductsByCategory = (category) => {
        if (!category || !product) return [];
        return product
            .filter(p => p.category === category)
            .sort((a, b) => {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
    };

    // Handle item changes
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...invoiceForm.items];
        
        if (field === 'category') {
            // Reset product selection when category changes
            updatedItems[index] = {
                ...updatedItems[index],
                category: value,
                name: '',
                productId: '',
                price: 0,
                total: 0
            };
        } else if (field === 'productId') {
            // Auto-fetch price when product is selected
            const selectedProduct = product.find(p => p.id === value);
            if (selectedProduct) {
                updatedItems[index] = {
                    ...updatedItems[index],
                    productId: value,
                    name: selectedProduct.title,
                    price: parseFloat(selectedProduct.price) || 0,
                    category: selectedProduct.category || updatedItems[index].category
                };
            }
        } else {
            updatedItems[index] = {
                ...updatedItems[index],
                [field]: field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value
            };
        }
        
        updatedItems[index].total = calculateItemTotal(
            updatedItems[index].quantity,
            updatedItems[index].price
        );

        const { subtotal, taxAmount, discountAmount, deliveryChargeAmount, total } = updateTotals(
            updatedItems,
            invoiceForm.tax,
            invoiceForm.discount,
            invoiceForm.deliveryCharge
        );

        setInvoiceForm(prev => ({
            ...prev,
            items: updatedItems,
            subtotal,
            total
        }));
    };

    // Add new item
    const addItem = () => {
        setInvoiceForm(prev => ({
            ...prev,
            items: [...prev.items, { category: '', name: '', productId: '', quantity: 1, price: 0, total: 0 }]
        }));
    };

    // Remove item
    const removeItem = (index) => {
        if (invoiceForm.items.length > 1) {
            const updatedItems = invoiceForm.items.filter((_, i) => i !== index);
            const { subtotal, taxAmount, discountAmount, deliveryChargeAmount, total } = updateTotals(
                updatedItems,
                invoiceForm.tax,
                invoiceForm.discount,
                invoiceForm.deliveryCharge
            );
            setInvoiceForm(prev => ({
                ...prev,
                items: updatedItems,
                subtotal,
                total
            }));
        }
    };

    // Save invoice to Firebase
    const handleSaveInvoice = async () => {
        // Validation
        if (!invoiceForm.customerName || !invoiceForm.customerPhone) {
            toast.error('Please fill in customer name and phone number');
            return;
        }

        if (invoiceForm.items.some(item => !item.category || !item.productId || item.price <= 0)) {
            toast.error('Please select category and product for all items');
            return;
        }

        setLoading(true);
        try {
            const invoiceData = {
                ...invoiceForm,
                updatedAt: Timestamp.now(),
                updatedBy: JSON.parse(localStorage.getItem('user'))?.user?.email || 'admin'
            };

            if (editingInvoiceId) {
                // Update existing invoice
                await updateDoc(doc(fireDB, 'invoices', editingInvoiceId), invoiceData);
                toast.success('Invoice updated successfully!');
                setEditingInvoiceId(null);
            } else {
                // Create new invoice
                const newInvoiceData = {
                    ...invoiceData,
                    createdAt: Timestamp.now(),
                    createdBy: JSON.parse(localStorage.getItem('user'))?.user?.email || 'admin'
                };
                await addDoc(collection(fireDB, 'invoices'), newInvoiceData);
                toast.success('Invoice created successfully!');
            }
            
            setShowForm(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error('Error saving invoice:', error);
            toast.error('Failed to save invoice');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit invoice
    const handleEditInvoice = (invoice) => {
        setEditingInvoiceId(invoice.id);
        setInvoiceForm({
            invoiceNumber: invoice.invoiceNumber || '',
            customerName: invoice.customerName || '',
            customerEmail: invoice.customerEmail || '',
            customerPhone: invoice.customerPhone || '',
            customerAddress: invoice.customerAddress || '',
            customerCity: invoice.customerCity || '',
            customerState: invoice.customerState || '',
            customerPincode: invoice.customerPincode || '',
            items: invoice.items && invoice.items.length > 0 
                ? invoice.items.map(item => ({
                    ...item,
                    total: item.total || calculateItemTotal(item.quantity || 1, item.price || 0)
                }))
                : [{ category: '', name: '', productId: '', quantity: 1, price: 0, total: 0 }],
            subtotal: invoice.subtotal || 0,
            tax: invoice.tax || 0,
            discount: invoice.discount || 0,
            deliveryCharge: invoice.deliveryCharge || 0,
            total: invoice.total || 0,
            notes: invoice.notes || '',
            date: invoice.date ? (invoice.date.toDate ? invoice.date.toDate().toISOString().split('T')[0] : invoice.date.split('T')[0]) : new Date().toISOString().split('T')[0]
        });
        setShowForm(true);
    };

    // Reset form
    const resetForm = () => {
        setEditingInvoiceId(null);
        setInvoiceForm({
            invoiceNumber: generateInvoiceNumber(),
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            customerAddress: '',
            customerCity: '',
            customerState: '',
            customerPincode: '',
            items: [{ category: '', name: '', productId: '', quantity: 1, price: 0, total: 0 }],
            subtotal: 0,
            tax: 0,
            discount: 0,
            deliveryCharge: 0,
            total: 0,
            notes: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    // Delete invoice
    const handleDeleteInvoice = async (invoiceId) => {
        if (!window.confirm('Are you sure you want to delete this invoice?')) return;
        
        setLoading(true);
        try {
            await deleteDoc(doc(fireDB, 'invoices', invoiceId));
            toast.success('Invoice deleted successfully');
            fetchInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Failed to delete invoice');
        } finally {
            setLoading(false);
        }
    };

    // Print invoice
    const handlePrintInvoice = (invoice) => {
        setViewInvoiceId(invoice.id);
        setTimeout(() => {
            const invoiceElement = document.getElementById(`invoice-${invoice.id}`);
            if (!invoiceElement) {
                toast.error('Invoice not found for printing');
                return;
            }
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Please allow popups to print the invoice');
                return;
            }
            
            printWindow.document.write('<html><head><title>Invoice</title><style>body{font-family:Arial,sans-serif;padding:20px;}</style></head><body>');
            printWindow.document.write(invoiceElement.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }, 100);
    };

    // Download invoice as PDF
    const handleDownloadPDF = async (invoice) => {
        setViewInvoiceId(invoice.id);
        setTimeout(async () => {
            const invoiceElement = document.getElementById(`invoice-${invoice.id}`);
            if (!invoiceElement) {
                toast.error('Invoice element not found');
                return;
            }

            try {
                // Create a clone of the invoice element for PDF with optimized sizing
                const clone = invoiceElement.cloneNode(true);
                clone.style.width = '215.9mm'; // 21.59 cm
                clone.style.height = '279.4mm'; // 27.94 cm
                clone.style.padding = '15mm';
                clone.style.fontSize = '10px';
                clone.style.transform = 'scale(1)';
                clone.style.transformOrigin = 'top left';
                
                // Temporarily append to body for rendering
                clone.style.position = 'absolute';
                clone.style.left = '-9999px';
                document.body.appendChild(clone);

                const canvas = await html2canvas(clone, { 
                    scale: 1.5,
                    width: 816, // 21.59 cm width in pixels at 96 DPI (215.9mm)
                    height: 1056, // 27.94 cm height in pixels at 96 DPI (279.4mm)
                    useCORS: true,
                    logging: false
                });
                
                document.body.removeChild(clone);

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [215.9, 279.4] // Custom size: 21.59 x 27.94 cm
                });
                const imgWidth = 215.9; // Width in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Fit to one page
                if (imgHeight > 279.4) {
                    // Scale down to fit
                    const scale = 279.4 / imgHeight;
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * scale, imgHeight * scale);
                } else {
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                }

                pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
                toast.success('Invoice downloaded successfully');
            } catch (error) {
                console.error('Error generating PDF:', error);
                toast.error('Failed to generate PDF');
            }
        }, 100);
    };

    // Filter invoices
    const filteredInvoices = invoices.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerPhone?.includes(searchQuery)
    );

    const selectedInvoice = invoices.find(inv => inv.id === viewInvoiceId);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Custom Invoices
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Create and manage custom invoices for customers</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    {editingInvoiceId ? 'Create New Invoice' : 'Create Invoice'}
                </button>
            </div>

            {/* Create/Edit Invoice Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">
                        {editingInvoiceId ? 'Edit Invoice' : 'Create New Invoice'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                            <input
                                type="text"
                                name="invoiceNumber"
                                value={invoiceForm.invoiceNumber}
                                onChange={handleInputChange}
                                disabled={editingInvoiceId !== null}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    editingInvoiceId ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                                title={editingInvoiceId ? 'Invoice number cannot be changed' : ''}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                name="date"
                                value={invoiceForm.date}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Customer Details */}
                    <div className="border-t pt-4 mb-4">
                        <h4 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Customer Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                                <input
                                    type="text"
                                    name="customerName"
                                    value={invoiceForm.customerName}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input
                                    type="tel"
                                    name="customerPhone"
                                    value={invoiceForm.customerPhone}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="customerEmail"
                                    value={invoiceForm.customerEmail}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    name="customerAddress"
                                    value={invoiceForm.customerAddress}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input
                                    type="text"
                                    name="customerCity"
                                    value={invoiceForm.customerCity}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input
                                    type="text"
                                    name="customerState"
                                    value={invoiceForm.customerState}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                <input
                                    type="text"
                                    name="customerPincode"
                                    value={invoiceForm.customerPincode}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="border-t pt-4 mb-4">
                        <h4 className="text-lg font-semibold mb-3 text-gray-800">Invoice Items</h4>
                        <div className="space-y-3">
                            {invoiceForm.items.map((item, index) => {
                                const categoryProducts = getProductsByCategory(item.category);
                                return (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select
                                                value={item.category}
                                                onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                <option value="">Select Category</option>
                                                <option value="Vegetables">Vegetables</option>
                                                <option value="Leafy Vegetables">Leafy Vegetables</option>
                                            </select>
                                        </div>
                                        <div className="col-span-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                            <select
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                disabled={!item.category}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select Product</option>
                                                {categoryProducts.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                min="0.5"
                                                step={item.category === 'Leafy Vegetables' ? "1" : "0.5"}
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                                placeholder="Enter price"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                                            <input
                                                type="text"
                                                value={`₹${item.total.toFixed(2)}`}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                                                readOnly
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            {invoiceForm.items.length > 1 && (
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 className="w-4 h-4 mx-auto" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={addItem}
                            className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                                <input
                                    type="text"
                                    value={`₹${invoiceForm.subtotal.toFixed(2)}`}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="tax"
                                    value={invoiceForm.tax}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="discount"
                                    value={invoiceForm.discount}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="deliveryCharge"
                                    value={invoiceForm.deliveryCharge}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                                <input
                                    type="text"
                                    value={`₹${invoiceForm.total.toFixed(2)}`}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 font-bold text-blue-700"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="border-t pt-4 mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={invoiceForm.notes}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Additional notes or terms..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPreviewInvoice(true)}
                            disabled={!invoiceForm.customerName || !invoiceForm.customerPhone || invoiceForm.items.some(item => !item.name || item.price <= 0)}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Eye className="w-5 h-5" />
                            Preview Invoice
                        </button>
                        <button
                            onClick={handleSaveInvoice}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
                        </button>
                        <button
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by invoice number, customer name, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Invoices List */}
            {loading && invoices.length === 0 ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invoices...</p>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No invoices found</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <div>{invoice.customerName}</div>
                                            <div className="text-xs text-gray-500">{invoice.customerPhone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {new Date(invoice.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{invoice.total?.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewInvoiceId(invoice.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="View Invoice"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditInvoice(invoice)}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintInvoice(invoice)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    title="Print Invoice"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(invoice)}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Preview Invoice Modal */}
            {previewInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-[215.9mm] max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Preview Invoice</h3>
                                <button
                                    onClick={() => setPreviewInvoice(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div id="preview-invoice" style={{ position: 'relative', width: '215.9mm', height: '279.4mm', margin: '0 auto', background: '#fff', padding: '15mm', borderRadius: 16, fontFamily: 'Inter, Arial, sans-serif', boxShadow: '0 4px 24px rgba(60,120,60,0.08)', fontSize: '11px' }}>
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
                                            <div style={{ color: '#666', fontSize: 14 }}>Date: {new Date(invoiceForm.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                            <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Invoice #: {invoiceForm.invoiceNumber}</div>
                                        </div>
                                    </div>

                                    {/* Invoice Details */}
                                    <div style={{ background: '#f0f9f0', padding: 10, borderRadius: 6, marginBottom: 12 }}>
                                        <div>
                                            <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 3, fontSize: 12 }}>Bill To</div>
                                            <div style={{ fontSize: 10, color: '#444', lineHeight: '1.4' }}>
                                                <div style={{ fontWeight: 600, marginBottom: 2 }}>{invoiceForm.customerName}</div>
                                                {invoiceForm.customerPhone && <div>Phone: {invoiceForm.customerPhone}</div>}
                                                {invoiceForm.customerEmail && <div>Email: {invoiceForm.customerEmail}</div>}
                                                {invoiceForm.customerAddress && <div>{invoiceForm.customerAddress}</div>}
                                                {(invoiceForm.customerCity || invoiceForm.customerState || invoiceForm.customerPincode) && (
                                                    <div>
                                                        {invoiceForm.customerCity && `${invoiceForm.customerCity}, `}
                                                        {invoiceForm.customerState && `${invoiceForm.customerState} `}
                                                        {invoiceForm.customerPincode}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: '10px' }}>
                                        <thead>
                                            <tr style={{ background: '#e8f5e9' }}>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'left' }}>Product</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'center' }}>Category</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'right' }}>Price</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceForm.items
                                                ?.filter(item => item.name && item.price > 0)
                                                .sort((a, b) => {
                                                    const nameA = (a.name || '').toLowerCase();
                                                    const nameB = (b.name || '').toLowerCase();
                                                    return nameA.localeCompare(nameB);
                                                })
                                                .map((item, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fbe7' : '#fff' }}>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10 }}>{item.name}</td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10, textAlign: 'center' }}>{item.category || 'N/A'}</td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10, textAlign: 'center' }}>
                                                        {item.category === 'Leafy Vegetables' 
                                                            ? `${item.quantity || 1} piece${(item.quantity || 1) > 1 ? 's' : ''}`
                                                            : `${item.quantity || 1} kg`}
                                                    </td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', fontSize: 10, textAlign: 'right' }}>
                                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{item.price.toFixed(2)}</div>
                                                    </td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', fontSize: 10, textAlign: 'right' }}>
                                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{item.total.toFixed(2)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Summary */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                        <div style={{ width: '200px', background: '#f0f9f0', padding: 10, borderRadius: 6, fontSize: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <div style={{ color: '#666' }}>Subtotal:</div>
                                                <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{invoiceForm.subtotal?.toFixed(2)}</div>
                                            </div>
                                            {invoiceForm.tax > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#666' }}>Tax ({invoiceForm.tax}%):</div>
                                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{((invoiceForm.subtotal * invoiceForm.tax) / 100).toFixed(2)}</div>
                                                </div>
                                            )}
                                            {invoiceForm.discount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#8b5cf6' }}>Discount:</div>
                                                    <div style={{ color: '#8b5cf6', fontWeight: 600 }}>-₹{invoiceForm.discount.toFixed(2)}</div>
                                                </div>
                                            )}
                                            {invoiceForm.deliveryCharge > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#666' }}>Delivery:</div>
                                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{invoiceForm.deliveryCharge.toFixed(2)}</div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #b2dfdb', paddingTop: 6, marginTop: 6 }}>
                                                <div style={{ color: '#217a3b', fontSize: 12, fontWeight: 700 }}>Total:</div>
                                                <div style={{ color: '#217a3b', fontSize: 12, fontWeight: 700 }}>₹{invoiceForm.total?.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {invoiceForm.notes && (
                                        <div style={{ marginBottom: 10, padding: 8, background: '#fff9e6', borderRadius: 6, border: '1px solid #ffe082' }}>
                                            <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 2, fontSize: 10 }}>Notes:</div>
                                            <div style={{ color: '#666', fontSize: 9 }}>{invoiceForm.notes}</div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: 8, textAlign: 'center' }}>
                                        <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 2, fontSize: 10 }}>Thank you for shopping with NaveDhana!</div>
                                        <div style={{ color: '#666', fontSize: 9 }}>
                                            For support, contact us at support@navedhana.com<br />
                                            Fresh Vegetables Harvested Today & Delivered Today!
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setTimeout(() => {
                                            const invoiceElement = document.getElementById('preview-invoice');
                                            if (!invoiceElement) {
                                                toast.error('Invoice not found for printing');
                                                return;
                                            }
                                            
                                            const printWindow = window.open('', '_blank');
                                            if (!printWindow) {
                                                toast.error('Please allow popups to print the invoice');
                                                return;
                                            }
                                            
                                            printWindow.document.write('<html><head><title>Invoice</title><style>body{font-family:Arial,sans-serif;padding:20px;}</style></head><body>');
                                            printWindow.document.write(invoiceElement.outerHTML);
                                            printWindow.document.write('</body></html>');
                                            printWindow.document.close();
                                            setTimeout(() => {
                                                printWindow.print();
                                                printWindow.close();
                                            }, 500);
                                        }, 100);
                                    }}
                                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Printer className="w-5 h-5" />
                                    Print
                                </button>
                                <button
                                    onClick={async () => {
                                        setTimeout(async () => {
                                            const invoiceElement = document.getElementById('preview-invoice');
                                            if (!invoiceElement) {
                                                toast.error('Invoice element not found');
                                                return;
                                            }

                                            try {
                                                // Create a clone of the invoice element for PDF with optimized sizing
                                                const clone = invoiceElement.cloneNode(true);
                                                clone.style.width = '215.9mm'; // 21.59 cm
                                                clone.style.height = '279.4mm'; // 27.94 cm
                                                clone.style.padding = '15mm';
                                                clone.style.fontSize = '10px';
                                                clone.style.transform = 'scale(1)';
                                                clone.style.transformOrigin = 'top left';
                                                
                                                // Temporarily append to body for rendering
                                                clone.style.position = 'absolute';
                                                clone.style.left = '-9999px';
                                                document.body.appendChild(clone);

                                                const canvas = await html2canvas(clone, { 
                                                    scale: 1.5,
                                                    width: 816, // 21.59 cm width in pixels at 96 DPI (215.9mm)
                                                    height: 1056, // 27.94 cm height in pixels at 96 DPI (279.4mm)
                                                    useCORS: true,
                                                    logging: false
                                                });
                                                
                                                document.body.removeChild(clone);

                                                const imgData = canvas.toDataURL('image/png');
                                                const pdf = new jsPDF({
                                                    orientation: 'portrait',
                                                    unit: 'mm',
                                                    format: [215.9, 279.4] // Custom size: 21.59 x 27.94 cm
                                                });
                                                const imgWidth = 215.9; // Width in mm
                                                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                                
                                                // Fit to one page
                                                if (imgHeight > 279.4) {
                                                    // Scale down to fit
                                                    const scale = 279.4 / imgHeight;
                                                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * scale, imgHeight * scale);
                                                } else {
                                                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                                                }

                                                pdf.save(`Invoice-${invoiceForm.invoiceNumber}.pdf`);
                                                toast.success('Invoice downloaded successfully');
                                            } catch (error) {
                                                console.error('Error generating PDF:', error);
                                                toast.error('Failed to generate PDF');
                                            }
                                        }, 100);
                                    }}
                                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => {
                                        setPreviewInvoice(false);
                                        handleSaveInvoice();
                                    }}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5" />
                                    {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
                                </button>
                                <button
                                    onClick={() => setPreviewInvoice(false)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice View Modal */}
            {viewInvoiceId && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-[215.9mm] max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Invoice</h3>
                                <button
                                    onClick={() => setViewInvoiceId(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div id={`invoice-${selectedInvoice.id}`} style={{ position: 'relative', width: '215.9mm', height: '279.4mm', maxWidth: '100%', margin: '0 auto', background: '#fff', padding: '15mm', borderRadius: 16, fontFamily: 'Inter, Arial, sans-serif', boxShadow: '0 4px 24px rgba(60,120,60,0.08)', fontSize: '11px' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Invoice Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <img src="/navedhana_LOGO.png" alt="Logo" style={{ width: 60, marginBottom: 4 }} />
                                            <div style={{ fontWeight: 900, color: '#217a3b', fontSize: 18, letterSpacing: 1 }}>NaveDhana</div>
                                            <div style={{ color: '#666', fontSize: 10 }}>Fresh Vegetables & Leafy Greens</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <h1 style={{ fontSize: 24, color: '#217a3b', marginBottom: 2, letterSpacing: 1, fontWeight: 900 }}>INVOICE</h1>
                                            <div style={{ color: '#666', fontSize: 11 }}>Date: {new Date(selectedInvoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                            <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>Invoice #: {selectedInvoice.invoiceNumber}</div>
                                        </div>
                                    </div>

                                    {/* Invoice Details */}
                                    <div style={{ background: '#f0f9f0', padding: 10, borderRadius: 6, marginBottom: 12 }}>
                                        <div>
                                            <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 3, fontSize: 12 }}>Bill To</div>
                                            <div style={{ fontSize: 10, color: '#444', lineHeight: '1.4' }}>
                                                <div style={{ fontWeight: 600, marginBottom: 2 }}>{selectedInvoice.customerName}</div>
                                                {selectedInvoice.customerPhone && <div>Phone: {selectedInvoice.customerPhone}</div>}
                                                {selectedInvoice.customerEmail && <div>Email: {selectedInvoice.customerEmail}</div>}
                                                {selectedInvoice.customerAddress && <div>{selectedInvoice.customerAddress}</div>}
                                                {(selectedInvoice.customerCity || selectedInvoice.customerState || selectedInvoice.customerPincode) && (
                                                    <div>
                                                        {selectedInvoice.customerCity && `${selectedInvoice.customerCity}, `}
                                                        {selectedInvoice.customerState && `${selectedInvoice.customerState} `}
                                                        {selectedInvoice.customerPincode}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: '10px' }}>
                                        <thead>
                                            <tr style={{ background: '#e8f5e9' }}>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'left' }}>Product</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'center' }}>Category</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'right' }}>Price</th>
                                                <th style={{ padding: 6, border: '1px solid #b2dfdb', color: '#217a3b', fontSize: 10, textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedInvoice.items
                                                ?.slice()
                                                .sort((a, b) => {
                                                    const nameA = (a.name || '').toLowerCase();
                                                    const nameB = (b.name || '').toLowerCase();
                                                    return nameA.localeCompare(nameB);
                                                })
                                                .map((item, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fbe7' : '#fff' }}>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10 }}>{item.name}</td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10, textAlign: 'center' }}>{item.category || 'N/A'}</td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', color: '#333', fontSize: 10, textAlign: 'center' }}>
                                                        {item.category === 'Leafy Vegetables' 
                                                            ? `${item.quantity || 1} piece${(item.quantity || 1) > 1 ? 's' : ''}`
                                                            : `${item.quantity || 1} kg`}
                                                    </td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', fontSize: 10, textAlign: 'right' }}>
                                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{item.price.toFixed(2)}</div>
                                                    </td>
                                                    <td style={{ padding: 6, border: '1px solid #e0e0e0', fontSize: 10, textAlign: 'right' }}>
                                                        <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{item.total.toFixed(2)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Summary */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                        <div style={{ width: '200px', background: '#f0f9f0', padding: 10, borderRadius: 6, fontSize: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <div style={{ color: '#666' }}>Subtotal:</div>
                                                <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{selectedInvoice.subtotal?.toFixed(2)}</div>
                                            </div>
                                            {selectedInvoice.tax > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#666' }}>Tax ({selectedInvoice.tax}%):</div>
                                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{((selectedInvoice.subtotal * selectedInvoice.tax) / 100).toFixed(2)}</div>
                                                </div>
                                            )}
                                            {selectedInvoice.discount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#8b5cf6' }}>Discount:</div>
                                                    <div style={{ color: '#8b5cf6', fontWeight: 600 }}>-₹{selectedInvoice.discount.toFixed(2)}</div>
                                                </div>
                                            )}
                                            {selectedInvoice.deliveryCharge > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ color: '#666' }}>Delivery:</div>
                                                    <div style={{ color: '#217a3b', fontWeight: 600 }}>₹{selectedInvoice.deliveryCharge.toFixed(2)}</div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #b2dfdb', paddingTop: 6, marginTop: 6 }}>
                                                <div style={{ color: '#217a3b', fontSize: 12, fontWeight: 700 }}>Total:</div>
                                                <div style={{ color: '#217a3b', fontSize: 12, fontWeight: 700 }}>₹{selectedInvoice.total?.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {selectedInvoice.notes && (
                                        <div style={{ marginBottom: 10, padding: 8, background: '#fff9e6', borderRadius: 6, border: '1px solid #ffe082' }}>
                                            <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 2, fontSize: 10 }}>Notes:</div>
                                            <div style={{ color: '#666', fontSize: 9 }}>{selectedInvoice.notes}</div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: 8, textAlign: 'center' }}>
                                        <div style={{ color: '#217a3b', fontWeight: 700, marginBottom: 2, fontSize: 10 }}>Thank you for shopping with NaveDhana!</div>
                                        <div style={{ color: '#666', fontSize: 9 }}>
                                            For support, contact us at support@navedhana.com<br />
                                            Fresh Vegetables Harvested Today & Delivered Today!
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => handlePrintInvoice(selectedInvoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Printer className="w-5 h-5" />
                                    Print
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF(selectedInvoice)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => setViewInvoiceId(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoice;

