// Enhanced User Tracking Utility
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';

// Track user page visits with detailed analytics
export const trackPageVisit = async (userId, pageData) => {
  try {
    if (!userId) return;
    
    const userRef = doc(fireDB, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      
      // Page breakdown tracking
      const pageBreakdown = currentData.pageBreakdown || {
        home: 0,
        products: 0,
        cart: 0,
        checkout: 0,
        profile: 0,
        orders: 0,
        about: 0,
        other: 0
      };
      
      const pageName = pageData.page || 'other';
      const pageKey = Object.keys(pageBreakdown).includes(pageName) ? pageName : 'other';
      
      // Session tracking
      const sessionDuration = pageData.sessionDuration || 0;
      
      const updateData = {
        pageVisits: (currentData.pageVisits || 0) + 1,
        lastVisit: new Date().toLocaleString(),
        isActive: true,
        pageBreakdown: {
          ...pageBreakdown,
          [pageKey]: (pageBreakdown[pageKey] || 0) + 1
        },
        // Session analytics
        avgSessionDuration: calculateAvgSessionDuration(currentData, sessionDuration),
        singlePageVisits: pageData.isSinglePageVisit ? 
          (currentData.singlePageVisits || 0) + 1 : 
          (currentData.singlePageVisits || 0),
        // User journey tracking
        userJourney: [
          ...(currentData.userJourney || []),
          {
            page: pageData.page || 'unknown',
            timestamp: new Date().toLocaleString(),
            referrer: pageData.referrer || '',
            sessionId: pageData.sessionId || '',
            duration: sessionDuration
          }
        ].slice(-50) // Keep only last 50 page visits
      };
      
      await updateDoc(userRef, updateData);
      console.log(`Page visit tracked for user ${userId}: ${pageData.page}`);
    }
  } catch (error) {
    console.error('Error tracking page visit:', error);
  }
};

// Track product interactions
export const trackProductInteraction = async (userId, productData) => {
  try {
    if (!userId) return;
    
    const userRef = doc(fireDB, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      
      const updateData = {
        productViews: (currentData.productViews || 0) + 1,
        lastProductViewed: productData.productId || '',
        viewHistory: [
          ...(currentData.viewHistory || []),
          {
            productId: productData.productId || '',
            productName: productData.productName || '',
            category: productData.category || '',
            price: productData.price || 0,
            timestamp: new Date().toLocaleString(),
            action: productData.action || 'view' // 'view', 'like', 'share'
          }
        ].slice(-100), // Keep only last 100 product interactions
        
        // Category preferences
        categoryPreferences: updateCategoryPreferences(
          currentData.categoryPreferences || {},
          productData.category || 'other'
        ),
        
        // Price range preferences
        priceRangePreferences: updatePriceRangePreferences(
          currentData.priceRangePreferences || {},
          productData.price || 0
        )
      };
      
      await updateDoc(userRef, updateData);
      console.log(`Product interaction tracked for user ${userId}: ${productData.productName}`);
    }
  } catch (error) {
    console.error('Error tracking product interaction:', error);
  }
};

// Track cart actions
export const trackCartAction = async (userId, cartData) => {
  try {
    if (!userId) return;
    
    const userRef = doc(fireDB, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      
      const updateData = {
        cartActions: (currentData.cartActions || 0) + 1,
        lastCartAction: cartData.action || '',
        cartHistory: [
          ...(currentData.cartHistory || []),
          {
            action: cartData.action || '', // 'add', 'remove', 'update', 'clear'
            productId: cartData.productId || '',
            productName: cartData.productName || '',
            quantity: cartData.quantity || 0,
            price: cartData.price || 0,
            timestamp: new Date().toLocaleString()
          }
        ].slice(-50), // Keep only last 50 cart actions
        
        // Cart abandonment tracking
        cartAbandonmentCount: cartData.action === 'abandon' ? 
          (currentData.cartAbandonmentCount || 0) + 1 : 
          (currentData.cartAbandonmentCount || 0),
        
        // Conversion tracking
        cartToCheckoutConversions: cartData.action === 'checkout' ? 
          (currentData.cartToCheckoutConversions || 0) + 1 : 
          (currentData.cartToCheckoutConversions || 0)
      };
      
      await updateDoc(userRef, updateData);
      console.log(`Cart action tracked for user ${userId}: ${cartData.action}`);
    }
  } catch (error) {
    console.error('Error tracking cart action:', error);
  }
};

// Track search queries
export const trackSearchQuery = async (userId, searchData) => {
  try {
    if (!userId) return;
    
    const userRef = doc(fireDB, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      
      const updateData = {
        searchQueries: (currentData.searchQueries || 0) + 1,
        lastSearchQuery: searchData.query || '',
        searchHistory: [
          ...(currentData.searchHistory || []),
          {
            query: searchData.query || '',
            results: searchData.results || 0,
            timestamp: new Date().toLocaleString(),
            clicked: searchData.clicked || false,
            clickedProduct: searchData.clickedProduct || ''
          }
        ].slice(-30), // Keep only last 30 searches
        
        // Search preferences
        searchPreferences: updateSearchPreferences(
          currentData.searchPreferences || {},
          searchData.query || ''
        )
      };
      
      await updateDoc(userRef, updateData);
      console.log(`Search query tracked for user ${userId}: ${searchData.query}`);
    }
  } catch (error) {
    console.error('Error tracking search query:', error);
  }
};

// Track order placement with comprehensive data
export const trackOrderPlacement = async (userId, orderData) => {
  try {
    if (!userId) return;
    
    const userRef = doc(fireDB, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      
      const updateData = {
        totalOrders: (currentData.totalOrders || 0) + 1,
        totalSpent: (currentData.totalSpent || 0) + (orderData.amount || 0),
        lastOrderDate: new Date().toLocaleString(),
        lastOrderAmount: orderData.amount || 0,
        
        // Order history with detailed tracking
        orderHistory: [
          ...(currentData.orderHistory || []),
          {
            orderId: orderData.orderId || '',
            date: new Date().toLocaleString(),
            amount: orderData.amount || 0,
            items: orderData.items || [],
            paymentMethod: orderData.paymentMethod || '',
            deliveryAddress: orderData.deliveryAddress || '',
            status: orderData.status || 'pending',
            categories: orderData.categories || [],
            discountUsed: orderData.discountUsed || 0
          }
        ].slice(-50), // Keep only last 50 orders
        
        // Spending pattern analysis
        spendingPattern: updateSpendingPattern(currentData, orderData),
        
        // Customer lifecycle stage
        customerLifecycleStage: determineCustomerLifecycleStage(currentData, orderData),
        
        // Loyalty metrics
        loyaltyScore: calculateLoyaltyScore(currentData, orderData)
      };
      
      await updateDoc(userRef, updateData);
      console.log(`Order placement tracked for user ${userId}: ₹${orderData.amount}`);
    }
  } catch (error) {
    console.error('Error tracking order placement:', error);
  }
};

// Basic user visit tracking (legacy support)
export const trackUserVisit = async (userId) => {
    if (!userId) return;
    
    try {
        const userRef = doc(fireDB, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            await updateDoc(userRef, {
                pageVisits: increment(1),
                lastVisit: new Date().toLocaleString(),
                isActive: true
            });
        }
    } catch (error) {
        console.error('Error tracking user visit:', error);
    }
};

// Update user order data (legacy support)
export const updateUserOrderData = async (userId, orderAmount) => {
    if (!userId) return;
    
    try {
        const userRef = doc(fireDB, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            await updateDoc(userRef, {
                totalOrders: increment(1),
                totalSpent: increment(orderAmount),
                lastOrderDate: new Date().toLocaleString()
            });
        } else {
            await setDoc(userRef, {
                totalOrders: 1,
                totalSpent: orderAmount,
                lastOrderDate: new Date().toLocaleString(),
                pageVisits: 0,
                isActive: true,
                createdAt: new Date().toLocaleString()
            });
        }
    } catch (error) {
        console.error('Error updating user order data:', error);
    }
};

// Helper Functions
const calculateAvgSessionDuration = (currentData, newSessionDuration) => {
  const currentAvg = currentData.avgSessionDuration || 0;
  const totalSessions = currentData.pageVisits || 0;
  
  if (totalSessions === 0) return newSessionDuration;
  
  return ((currentAvg * totalSessions) + newSessionDuration) / (totalSessions + 1);
};

const updateCategoryPreferences = (currentPreferences, category) => {
  return {
    ...currentPreferences,
    [category]: (currentPreferences[category] || 0) + 1
  };
};

const updatePriceRangePreferences = (currentPreferences, price) => {
  let priceRange = 'unknown';
  
  if (price <= 100) priceRange = 'budget';
  else if (price <= 500) priceRange = 'mid-range';
  else if (price <= 1000) priceRange = 'premium';
  else priceRange = 'luxury';
  
  return {
    ...currentPreferences,
    [priceRange]: (currentPreferences[priceRange] || 0) + 1
  };
};

const updateSearchPreferences = (currentPreferences, query) => {
  const keywords = query.toLowerCase().split(' ');
  const updatedPreferences = { ...currentPreferences };
  
  keywords.forEach(keyword => {
    if (keyword.length > 2) { // Only track meaningful keywords
      updatedPreferences[keyword] = (updatedPreferences[keyword] || 0) + 1;
    }
  });
  
  return updatedPreferences;
};

const updateSpendingPattern = (currentData, orderData) => {
  const currentPattern = currentData.spendingPattern || {
    monthlySpending: {},
    categorySpending: {},
    averageOrderValue: 0,
    spendingTrend: 'stable'
  };
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  // Update monthly spending
  const monthlySpending = {
    ...currentPattern.monthlySpending,
    [currentMonth]: (currentPattern.monthlySpending[currentMonth] || 0) + (orderData.amount || 0)
  };
  
  // Update category spending
  const categorySpending = { ...currentPattern.categorySpending };
  (orderData.categories || []).forEach(category => {
    categorySpending[category] = (categorySpending[category] || 0) + (orderData.amount || 0) / (orderData.categories.length || 1);
  });
  
  // Calculate average order value
  const totalOrders = (currentData.totalOrders || 0) + 1;
  const totalSpent = (currentData.totalSpent || 0) + (orderData.amount || 0);
  const averageOrderValue = totalSpent / totalOrders;
  
  return {
    ...currentPattern,
    monthlySpending,
    categorySpending,
    averageOrderValue,
    lastOrderAmount: orderData.amount || 0,
    lastOrderCategory: orderData.categories?.[0] || 'other'
  };
};

const determineCustomerLifecycleStage = (currentData, orderData) => {
  const totalOrders = (currentData.totalOrders || 0) + 1;
  const totalSpent = (currentData.totalSpent || 0) + (orderData.amount || 0);
  const daysSinceFirstOrder = currentData.orderHistory?.length > 0 ? 
    Math.floor((new Date() - new Date(currentData.orderHistory[0].date)) / (1000 * 60 * 60 * 24)) : 0;
  
  if (totalOrders === 1) return 'new_customer';
  if (totalOrders <= 3) return 'developing_customer';
  if (totalOrders <= 10 && totalSpent >= 1000) return 'established_customer';
  if (totalOrders > 10 && totalSpent >= 5000) return 'vip_customer';
  if (daysSinceFirstOrder > 365 && totalOrders > 5) return 'loyal_customer';
  
  return 'regular_customer';
};

const calculateLoyaltyScore = (currentData, orderData) => {
  const totalOrders = (currentData.totalOrders || 0) + 1;
  const totalSpent = (currentData.totalSpent || 0) + (orderData.amount || 0);
  const engagementEvents = currentData.engagementEvents || 0;
  const pageVisits = currentData.pageVisits || 0;
  
  // Loyalty score calculation (0-100)
  let loyaltyScore = 0;
  
  // Order frequency (30 points max)
  loyaltyScore += Math.min(totalOrders * 2, 30);
  
  // Spending amount (25 points max)
  loyaltyScore += Math.min(totalSpent / 200, 25);
  
  // Engagement (25 points max)
  loyaltyScore += Math.min(engagementEvents * 5, 25);
  
  // Site activity (20 points max)
  loyaltyScore += Math.min(pageVisits * 0.5, 20);
  
  return Math.min(Math.floor(loyaltyScore), 100);
};

// Analytics reporting functions
export const generateUserAnalyticsReport = (userData) => {
  const report = {
    basicInfo: {
      totalPageVisits: userData.pageVisits || 0,
      totalOrders: userData.totalOrders || 0,
      totalSpent: userData.totalSpent || 0,
      avgSessionDuration: userData.avgSessionDuration || 0,
      lastVisit: userData.lastVisit || 'Never'
    },
    
    pageAnalytics: {
      pageBreakdown: userData.pageBreakdown || {},
      bounceRate: userData.singlePageVisits && userData.pageVisits ? 
        (userData.singlePageVisits / userData.pageVisits) * 100 : 0,
      mostVisitedPage: getMostVisitedPage(userData.pageBreakdown || {})
    },
    
    spendingAnalytics: {
      spendingPattern: userData.spendingPattern || {},
      averageOrderValue: userData.totalOrders > 0 ? 
        (userData.totalSpent || 0) / userData.totalOrders : 0,
      customerLifecycleStage: userData.customerLifecycleStage || 'new_customer'
    },
    
    engagementAnalytics: {
      engagementScore: userData.engagementScore || 0,
      loyaltyScore: userData.loyaltyScore || 0,
      categoryPreferences: userData.categoryPreferences || {},
      searchPreferences: userData.searchPreferences || {}
    }
  };
  
  return report;
};

const getMostVisitedPage = (pageBreakdown) => {
  if (!pageBreakdown || Object.keys(pageBreakdown).length === 0) return 'unknown';
  
  return Object.entries(pageBreakdown).reduce((max, [page, visits]) => 
    visits > (pageBreakdown[max] || 0) ? page : max, 'home'
  );
};

// Export all tracking functions
export default {
  trackPageVisit,
  trackProductInteraction,
  trackCartAction,
  trackSearchQuery,
  trackOrderPlacement,
  trackUserVisit,
  updateUserOrderData,
  generateUserAnalyticsReport
}; 