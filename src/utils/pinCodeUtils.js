import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Check if a pin code is valid for delivery
export const checkPinCodeValidity = async (pinCode) => {
    try {
        const pinCodesRef = collection(fireDB, 'deliveryPinCodes');
        const q = query(pinCodesRef, where('pinCode', '==', pinCode), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const pinCodeData = querySnapshot.docs[0].data();
            return {
                isValid: true,
                area: pinCodeData.area,
                pinCode: pinCodeData.pinCode
            };
        }
        
        return {
            isValid: false,
            area: null,
            pinCode: pinCode
        };
    } catch (error) {
        console.error('Error checking pin code validity:', error);
        return {
            isValid: false,
            area: null,
            pinCode: pinCode,
            error: 'Failed to check pin code'
        };
    }
};

// Submit a delivery request for a new pin code
export const submitDeliveryRequest = async (requestData) => {
    try {
        const request = {
            pinCode: requestData.pinCode,
            area: requestData.area || '',
            customerName: requestData.customerName,
            customerPhone: requestData.customerPhone,
            customerEmail: requestData.customerEmail || '',
            message: requestData.message || '',
            requestedAt: new Date().toISOString(),
            processed: false
        };

        const docRef = await addDoc(collection(fireDB, 'deliveryRequests'), request);
        return {
            success: true,
            requestId: docRef.id
        };
    } catch (error) {
        console.error('Error submitting delivery request:', error);
        return {
            success: false,
            error: 'Failed to submit delivery request'
        };
    }
};

// Validate pin code format
export const validatePinCodeFormat = (pinCode) => {
    if (!pinCode || typeof pinCode !== 'string') {
        return { isValid: false, error: 'Pin code is required' };
    }
    
    if (pinCode.length !== 6) {
        return { isValid: false, error: 'Pin code must be 6 digits' };
    }
    
    if (!/^\d{6}$/.test(pinCode)) {
        return { isValid: false, error: 'Pin code must contain only numbers' };
    }
    
    return { isValid: true };
};

// Get all active pin codes (for admin use)
export const getAllActivePinCodes = async () => {
    try {
        const pinCodesRef = collection(fireDB, 'deliveryPinCodes');
        const q = query(pinCodesRef, where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching active pin codes:', error);
        return [];
    }
}; 