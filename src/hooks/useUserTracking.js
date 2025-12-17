import { useCallback } from 'react';
import { 
  trackPageVisit, 
  trackProductInteraction, 
  trackCartAction, 
  trackSearchQuery, 
  trackOrderPlacement 
} from '../utils/userTracking';

// Custom hook for user tracking
export const useUserTracking = () => {
  // Get current user ID helper
  const getCurrentUserId = useCallback(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user?.user?.uid || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }, []);

  // Track page visit
  const trackPage = useCallback(async (pageName, additionalData = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await trackPageVisit(userId, {
        page: pageName,
        sessionStartTime: Date.now(),
        sessionDuration: additionalData.sessionDuration || 0,
        referrer: document.referrer || '',
        sessionId: additionalData.sessionId || Date.now().toString(),
        isSinglePageVisit: additionalData.isSinglePageVisit || false,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking page visit:', error);
    }
  }, [getCurrentUserId]);

  // Track product interaction
  const trackProduct = useCallback(async (product, action = 'view', additionalData = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await trackProductInteraction(userId, {
        productId: product.id,
        productName: product.title || product.name,
        category: product.category,
        price: product.price,
        action,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking product interaction:', error);
    }
  }, [getCurrentUserId]);

  // Track cart action
  const trackCart = useCallback(async (action, product, quantity = 1, additionalData = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await trackCartAction(userId, {
        action,
        productId: product.id,
        productName: product.title || product.name,
        quantity,
        price: product.price,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking cart action:', error);
    }
  }, [getCurrentUserId]);

  // Track search query
  const trackSearch = useCallback(async (query, results = 0, additionalData = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await trackSearchQuery(userId, {
        query,
        results,
        clicked: additionalData.clicked || false,
        clickedProduct: additionalData.clickedProduct || '',
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking search query:', error);
    }
  }, [getCurrentUserId]);

  // Track order placement
  const trackOrder = useCallback(async (orderData) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await trackOrderPlacement(userId, {
        orderId: orderData.orderId || '',
        amount: orderData.amount || 0,
        items: orderData.items || [],
        paymentMethod: orderData.paymentMethod || '',
        deliveryAddress: orderData.deliveryAddress || '',
        status: orderData.status || 'pending',
        categories: orderData.categories || [],
        discountUsed: orderData.discountUsed || 0,
        ...orderData
      });
    } catch (error) {
      console.error('Error tracking order placement:', error);
    }
  }, [getCurrentUserId]);

  // Track engagement events
  const trackEngagement = useCallback(async (eventType, value = '', metadata = {}) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      // Import dynamically to avoid circular dependencies
      const { trackEngagementEvent } = await import('../utils/userTracking');
      await trackEngagementEvent(userId, {
        event: eventType,
        value,
        metadata
      });
    } catch (error) {
      console.error('Error tracking engagement event:', error);
    }
  }, [getCurrentUserId]);

  // Utility function to check if user is logged in
  const isUserLoggedIn = useCallback(() => {
    return getCurrentUserId() !== null;
  }, [getCurrentUserId]);

  // Session tracking helpers
  const startSession = useCallback(() => {
    const sessionId = Date.now().toString();
    sessionStorage.setItem('trackingSessionId', sessionId);
    sessionStorage.setItem('sessionStartTime', Date.now().toString());
    return sessionId;
  }, []);

  const getSessionDuration = useCallback(() => {
    const startTime = sessionStorage.getItem('sessionStartTime');
    if (startTime) {
      return Date.now() - parseInt(startTime);
    }
    return 0;
  }, []);

  const getSessionId = useCallback(() => {
    return sessionStorage.getItem('trackingSessionId') || Date.now().toString();
  }, []);

  return {
    // Main tracking functions
    trackPage,
    trackProduct,
    trackCart,
    trackSearch,
    trackOrder,
    trackEngagement,
    
    // Utility functions
    isUserLoggedIn,
    getCurrentUserId,
    
    // Session helpers
    startSession,
    getSessionDuration,
    getSessionId
  };
};

export default useUserTracking; 