import { collection, getDocs, query, where, updateDoc, doc, increment } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Validate and apply coupon code
export const validateCoupon = async (couponCode, orderAmount) => {
    try {
        if (!couponCode || !couponCode.trim()) {
            return {
                isValid: false,
                error: 'Please enter a coupon code'
            };
        }

        const couponsRef = collection(fireDB, 'coupons');
        const q = query(
            couponsRef, 
            where('code', '==', couponCode.toUpperCase()),
            where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return {
                isValid: false,
                error: 'Invalid or inactive coupon code'
            };
        }

        const coupon = querySnapshot.docs[0].data();
        const couponId = querySnapshot.docs[0].id;
        const now = new Date();

        // Check if coupon is expired
        if (new Date(coupon.validUntil) < now) {
            return {
                isValid: false,
                error: 'Coupon has expired'
            };
        }

        // Check if coupon is not yet valid
        if (new Date(coupon.validFrom) > now) {
            return {
                isValid: false,
                error: 'Coupon is not yet valid'
            };
        }

        // Check minimum order amount
        if (coupon.minOrderAmount > 0 && orderAmount < coupon.minOrderAmount) {
            return {
                isValid: false,
                error: `Minimum order amount of ₹${coupon.minOrderAmount} required`
            };
        }

        // Check usage limit
        if (coupon.usageLimit > 0 && (coupon.usageCount || 0) >= coupon.usageLimit) {
            return {
                isValid: false,
                error: 'Coupon usage limit reached'
            };
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.type === 'percentage') {
            discountAmount = (orderAmount * coupon.value) / 100;
            // Apply maximum discount limit
            if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
        } else {
            discountAmount = coupon.value;
        }

        return {
            isValid: true,
            coupon: {
                id: couponId,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                maxDiscount: coupon.maxDiscount,
                description: coupon.description
            },
            discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
            message: `Discount applied: ${coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`} off`
        };
    } catch (error) {
        console.error('Error validating coupon:', error);
        return {
            isValid: false,
            error: 'Failed to validate coupon. Please try again.'
        };
    }
};

// Increment coupon usage count
export const incrementCouponUsage = async (couponId) => {
    try {
        const couponRef = doc(fireDB, 'coupons', couponId);
        await updateDoc(couponRef, {
            usageCount: increment(1)
        });
        return true;
    } catch (error) {
        console.error('Error incrementing coupon usage:', error);
        return false;
    }
};

// Get all active coupons (for admin use)
export const getAllActiveCoupons = async () => {
    try {
        const couponsRef = collection(fireDB, 'coupons');
        const q = query(couponsRef, where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        return [];
    }
}; 