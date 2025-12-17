import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';
import { toast } from 'react-toastify';
import { MapPin, Plus, Trash2, Search, AlertCircle, X } from 'lucide-react';

const PinCodeManager = () => {
    const [pinCodes, setPinCodes] = useState([]);
    const [newPinCode, setNewPinCode] = useState('');
    const [newPinCodeArea, setNewPinCodeArea] = useState('');
    const [pinCodeLoading, setPinCodeLoading] = useState(false);
    const [pinCodeSearch, setPinCodeSearch] = useState('');
    const [deliveryRequests, setDeliveryRequests] = useState([]);
    const [showDeliveryRequests, setShowDeliveryRequests] = useState(false);

    useEffect(() => {
        fetchPinCodes();
        fetchDeliveryRequests();
    }, []);

    const fetchPinCodes = async () => {
        try {
            const pinCodesSnapshot = await getDocs(collection(fireDB, 'deliveryPinCodes'));
            const pinCodesData = pinCodesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPinCodes(pinCodesData);
        } catch (err) {
            console.error('Error fetching pin codes:', err);
            toast.error('Failed to load pin codes');
        }
    };

    const fetchDeliveryRequests = async () => {
        try {
            const requestsSnapshot = await getDocs(collection(fireDB, 'deliveryRequests'));
            const requestsData = requestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDeliveryRequests(requestsData);
        } catch (err) {
            console.error('Error fetching delivery requests:', err);
        }
    };

    const handleAddPinCode = async () => {
        if (!newPinCode.trim() || !newPinCodeArea.trim()) {
            toast.error('Please enter both pin code and area name');
            return;
        }

        if (newPinCode.length !== 6 || !/^\d{6}$/.test(newPinCode)) {
            toast.error('Please enter a valid 6-digit pin code');
            return;
        }

        setPinCodeLoading(true);
        try {
            // Check if pin code already exists
            const existingPinCode = pinCodes.find(pc => pc.pinCode === newPinCode);
            if (existingPinCode) {
                toast.error('This pin code already exists');
                return;
            }

            await addDoc(collection(fireDB, 'deliveryPinCodes'), {
                pinCode: newPinCode,
                area: newPinCodeArea,
                addedAt: new Date().toISOString(),
                isActive: true
            });

            setNewPinCode('');
            setNewPinCodeArea('');
            await fetchPinCodes();
            toast.success('Pin code added successfully!');
        } catch (err) {
            console.error('Error adding pin code:', err);
            toast.error('Failed to add pin code');
        } finally {
            setPinCodeLoading(false);
        }
    };

    const handleDeletePinCode = async (pinCodeId) => {
        if (!window.confirm('Are you sure you want to delete this pin code?')) {
            return;
        }

        try {
            await deleteDoc(doc(fireDB, 'deliveryPinCodes', pinCodeId));
            await fetchPinCodes();
            toast.success('Pin code deleted successfully!');
        } catch (err) {
            console.error('Error deleting pin code:', err);
            toast.error('Failed to delete pin code');
        }
    };

    const handleDeleteDeliveryRequest = async (requestId) => {
        if (!window.confirm('Are you sure you want to delete this delivery request?')) {
            return;
        }

        try {
            await deleteDoc(doc(fireDB, 'deliveryRequests', requestId));
            await fetchDeliveryRequests();
            toast.success('Delivery request deleted successfully!');
        } catch (err) {
            console.error('Error deleting delivery request:', err);
            toast.error('Failed to delete delivery request');
        }
    };

    const filteredPinCodes = pinCodes.filter(pc => 
        pc.pinCode.includes(pinCodeSearch) || 
        pc.area.toLowerCase().includes(pinCodeSearch.toLowerCase())
    );

    const pendingDeliveryRequests = deliveryRequests.filter(req => !req.processed);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Delivery Pin Codes
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDeliveryRequests(!showDeliveryRequests)}
                            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-all"
                        >
                            <AlertCircle className="w-4 h-4" />
                            Delivery Requests ({pendingDeliveryRequests.length})
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="p-6">
                {/* Add New Pin Code */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-3">Add New Pin Code</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Pin Code</label>
                            <input
                                type="text"
                                maxLength="6"
                                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all outline-none"
                                placeholder="Enter 6-digit pin code"
                                value={newPinCode}
                                onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                                disabled={pinCodeLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Area Name</label>
                            <input
                                type="text"
                                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all outline-none"
                                placeholder="Enter area name"
                                value={newPinCodeArea}
                                onChange={(e) => setNewPinCodeArea(e.target.value)}
                                disabled={pinCodeLoading}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleAddPinCode}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 w-full justify-center"
                                disabled={pinCodeLoading || !newPinCode.trim() || !newPinCodeArea.trim()}
                            >
                                <Plus className="w-4 h-4" />
                                {pinCodeLoading ? 'Adding...' : 'Add Pin Code'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all outline-none"
                            placeholder="Search pin codes or areas..."
                            value={pinCodeSearch}
                            onChange={(e) => setPinCodeSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Pin Codes List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredPinCodes.length > 0 ? (
                        filteredPinCodes.map((pinCode) => (
                            <div key={pinCode.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{pinCode.pinCode}</div>
                                        <div className="text-sm text-gray-600">{pinCode.area}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeletePinCode(pinCode.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete pin code"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            {pinCodeSearch ? 'No pin codes found matching your search' : 'No pin codes added yet'}
                        </div>
                    )}
                </div>

                {/* Delivery Requests Modal */}
                {showDeliveryRequests && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-orange-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        Delivery Requests ({pendingDeliveryRequests.length})
                                    </h3>
                                    <button
                                        onClick={() => setShowDeliveryRequests(false)}
                                        className="p-2 hover:bg-orange-100 rounded-lg transition-all"
                                    >
                                        <X className="w-5 h-5 text-orange-600" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {pendingDeliveryRequests.length > 0 ? (
                                    <div className="space-y-4">
                                        {pendingDeliveryRequests.map((request) => (
                                            <div key={request.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="font-semibold text-orange-800">{request.pinCode}</div>
                                                            <div className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                                                {request.area || 'Unknown Area'}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-gray-700 mb-2">
                                                            <strong>Customer:</strong> {request.customerName}<br />
                                                            <strong>Phone:</strong> {request.customerPhone}<br />
                                                            <strong>Email:</strong> {request.customerEmail || 'Not provided'}<br />
                                                            <strong>Requested:</strong> {new Date(request.requestedAt).toLocaleString('en-IN')}
                                                        </div>
                                                        {request.message && (
                                                            <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                                                                <strong>Message:</strong> {request.message}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 ml-4">
                                                        <button
                                                            onClick={() => {
                                                                // Add pin code from request
                                                                setNewPinCode(request.pinCode);
                                                                setNewPinCodeArea(request.area || '');
                                                                setShowDeliveryRequests(false);
                                                            }}
                                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-green-700 transition-all"
                                                        >
                                                            Add Pin Code
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDeliveryRequest(request.id)}
                                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 transition-all"
                                                        >
                                                            Delete Request
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No pending delivery requests
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PinCodeManager; 