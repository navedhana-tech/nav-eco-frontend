import React, { useState } from 'react';
import { X, MapPin, User, Phone, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { submitDeliveryRequest, validatePinCodeFormat } from '../utils/pinCodeUtils';
import { toast } from 'react-toastify';

const DeliveryRequestModal = ({ isOpen, onClose, pinCode, area }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.customerName.trim()) {
            newErrors.customerName = 'Name is required';
        }

        if (!formData.customerPhone.trim()) {
            newErrors.customerPhone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.customerPhone.replace(/\D/g, ''))) {
            newErrors.customerPhone = 'Please enter a valid 10-digit phone number';
        }

        if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
            newErrors.customerEmail = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const result = await submitDeliveryRequest({
                pinCode,
                area,
                customerName: formData.customerName.trim(),
                customerPhone: formData.customerPhone.trim(),
                customerEmail: formData.customerEmail.trim(),
                message: formData.message.trim()
            });

            if (result.success) {
                toast.success('Delivery request submitted successfully! We will review and add your area soon.');
                onClose();
                // Reset form
                setFormData({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    message: ''
                });
            } else {
                toast.error(result.error || 'Failed to submit request. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting delivery request:', error);
            toast.error('Failed to submit request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            // Reset form and errors
            setFormData({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                message: ''
            });
            setErrors({});
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-orange-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Request Delivery
                        </h3>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-orange-100 rounded-lg transition-all"
                            disabled={loading}
                        >
                            <X className="w-5 h-5 text-orange-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Pin Code Info */}
                    <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-5 h-5 text-orange-600" />
                            <span className="font-semibold text-orange-800">Pin Code: {pinCode}</span>
                        </div>
                        {area && (
                            <div className="text-sm text-orange-700">Area: {area}</div>
                        )}
                        <div className="text-sm text-orange-600 mt-2">
                            We don't currently deliver to this area. Submit a request and we'll add it soon!
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Customer Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <User className="w-4 h-4 inline mr-1" />
                                Full Name *
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleInputChange}
                                className={`w-full border-2 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all outline-none ${
                                    errors.customerName ? 'border-red-300' : 'border-gray-200'
                                }`}
                                placeholder="Enter your full name"
                                disabled={loading}
                            />
                            {errors.customerName && (
                                <div className="text-red-500 text-sm mt-1">{errors.customerName}</div>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="customerPhone"
                                value={formData.customerPhone}
                                onChange={handleInputChange}
                                className={`w-full border-2 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all outline-none ${
                                    errors.customerPhone ? 'border-red-300' : 'border-gray-200'
                                }`}
                                placeholder="Enter your phone number"
                                disabled={loading}
                            />
                            {errors.customerPhone && (
                                <div className="text-red-500 text-sm mt-1">{errors.customerPhone}</div>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email (Optional)
                            </label>
                            <input
                                type="email"
                                name="customerEmail"
                                value={formData.customerEmail}
                                onChange={handleInputChange}
                                className={`w-full border-2 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all outline-none ${
                                    errors.customerEmail ? 'border-red-300' : 'border-gray-200'
                                }`}
                                placeholder="Enter your email address"
                                disabled={loading}
                            />
                            {errors.customerEmail && (
                                <div className="text-red-500 text-sm mt-1">{errors.customerEmail}</div>
                            )}
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MessageSquare className="w-4 h-4 inline mr-1" />
                                Additional Message (Optional)
                            </label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                rows="3"
                                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all outline-none resize-none"
                                placeholder="Tell us about your area or any specific requirements..."
                                disabled={loading}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Info */}
                    <div className="mt-4 text-center text-sm text-gray-500">
                        We'll review your request and add your area to our delivery network soon!
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryRequestModal; 