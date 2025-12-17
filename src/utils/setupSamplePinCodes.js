import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Sample pin codes for testing


export const setupSamplePinCodes = async () => {
    try {
        console.log('Setting up sample pin codes...');
        
        // Check if pin codes already exist
        const existingPinCodes = await getDocs(collection(fireDB, 'deliveryPinCodes'));
        if (!existingPinCodes.empty) {
            console.log('Pin codes already exist, skipping setup');
            return;
        }

        // Add sample pin codes
        for (const pinCodeData of samplePinCodes) {
            await addDoc(collection(fireDB, 'deliveryPinCodes'), {
                pinCode: pinCodeData.pinCode,
                area: pinCodeData.area,
                addedAt: new Date().toISOString(),
                isActive: true
            });
            console.log(`Added pin code: ${pinCodeData.pinCode} - ${pinCodeData.area}`);
        }

        console.log('Sample pin codes setup completed successfully!');
    } catch (error) {
        console.error('Error setting up sample pin codes:', error);
    }
};

// Function to check if a pin code exists
export const checkPinCodeExists = async (pinCode) => {
    try {
        const q = query(collection(fireDB, 'deliveryPinCodes'), where('pinCode', '==', pinCode));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking pin code:', error);
        return false;
    }
};

// Function to get all pin codes
export const getAllPinCodes = async () => {
    try {
        const snapshot = await getDocs(collection(fireDB, 'deliveryPinCodes'));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting pin codes:', error);
        return [];
    }
}; 