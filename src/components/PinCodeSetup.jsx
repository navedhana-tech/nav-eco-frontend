import React, { useState } from 'react';
import { setupSamplePinCodes } from '../utils/setupSamplePinCodes';
import { toast } from 'react-toastify';

const PinCodeSetup = () => {
    const [loading, setLoading] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            await setupSamplePinCodes();
            toast.success('Sample pin codes setup completed!');
        } catch (error) {
            console.error('Error setting up pin codes:', error);
            toast.error('Failed to setup pin codes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Pin Code Setup</h3>
            <p className="text-sm text-blue-600 mb-4">
                Click the button below to add sample pin codes for testing the location-based delivery system.
            </p>
            <button
                onClick={handleSetup}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
                {loading ? 'Setting up...' : 'Setup Sample Pin Codes'}
            </button>
        </div>
    );
};

export default PinCodeSetup; 