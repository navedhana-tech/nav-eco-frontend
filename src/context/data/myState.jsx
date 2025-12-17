import React, { useEffect, useState } from 'react'
import MyContext from './myContext';
import { fireDB as fireDb, auth } from '../../firebase/FirebaseConfig';
import { Timestamp, addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { doc, deleteDoc, setDoc, getDocs, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from 'firebase/auth';



function MyState(props) {
  const [loading, setLoading] = useState(false); 
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const [product, setProduct] = useState([]);

  // ********************** Add Product Section  **********************
  const addProduct = async (newProduct) => {
    const requiredFields = ['title', 'price', 'actualprice', 'imageUrl', 'category', 'description'];
    
    // Validate that all required fields are filled
    for (const field of requiredFields) {
        if (!newProduct[field]) {
            return toast.error(`Please fill all fields`);
        }
    }

    const productRef = collection(fireDb, "products");
    setLoading(true);
    
    try {
        await addDoc(productRef, {
            ...newProduct,
            time: Timestamp.now(),
            date: new Date().toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
            }),
        });
        toast.success("Product added successfully");
        
        // Refresh product data immediately
        getProductData();

    } catch (error) {
        console.log(error);
        toast.error("Failed to add product. Please try again."); // Inform the user of the error
    } finally {
        setLoading(false);
    }
};

  // ****** get product
  const getProductData = async () => {
    setLoading(true)
    try {
      const q = query(
        collection(fireDb, "products"),
        orderBy("time"),
        // limit(5)
      );
      const data = onSnapshot(q, (QuerySnapshot) => {
        let productsArray = [];
        QuerySnapshot.forEach((doc) => {
          productsArray.push({ ...doc.data(), id: doc.id });
        });
        setProduct(productsArray)
        setLoading(false);
      });
      return () => data;
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }
  //update and delete
  const edithandle = (item) => {
    // This function is used for editing products
    // The item will be passed to the update form
    console.log("Editing product:", item);
  }
  // update product
  const updateProduct = async (item) => {
    setLoading(true)
    try {
      console.log("Updating product with data:", item);
      
      // Use updateDoc instead of setDoc to update existing document
      const productRef = doc(fireDb, "products", item.id);
      const updateData = {
        title: item.title,
        price: parseFloat(item.price),
        category: item.category,
        description: item.description,
        weight: item.weight ? parseFloat(item.weight) : null,
        imageUrl: item.imageUrl,
        actualprice: item.actualprice || item.actualPrice,
        lastUpdated: new Date().toLocaleString()
      };
      
      console.log("Update data:", updateData);
      await updateDoc(productRef, updateData);
      
      toast.success("Product Updated successfully")
      getProductData();
      setLoading(false)
      
    } catch (error) {
      setLoading(false)
      console.log("Error updating product:", error)
      console.log("Error details:", error.code, error.message)
      toast.error("Failed to update product. Please try again.")
    }
  }

  const deleteProduct = async (item) => {
    setLoading(true);
  
    try {
      console.log("Attempting to delete product with ID:", item.id);
      await deleteDoc(doc(fireDb, "products", item.id));
      toast.success('Product deleted successfully');
      getProductData(); // Refresh the product list after deletion
    } catch (error) {
      toast.error('Product deletion failed');
      console.error("Error deleting product:", error.code, error.message);
    } finally {
      setLoading(false);
    }
  }
  const [order, setOrder] = useState([]);

  const getOrderData = () => {
    // Check if user is authenticated before fetching orders
    const userString = localStorage.getItem('user');
    if (!userString) {
      setOrder([]);
      return;
    }

    try {
      const user = JSON.parse(userString);
      if (!user || !user.user || !user.user.uid) {
        setOrder([]);
        return;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setOrder([]);
      return;
    }

    const q = query(collection(fireDb, "orders"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersArray = [];
      querySnapshot.forEach((doc) => {
        ordersArray.push({ ...doc.data(), id: doc.id });
      });
      setOrder(ordersArray); // Update the orders state
      setLoading(false); // Set loading to false after fetching
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });
  
    // Cleanup function to unsubscribe from the listener when component unmounts
    return () => unsubscribe();
  };
  
  
  const [user, setUser] = useState([]);

  const getUserData = async () => {
    // Check if user is authenticated and is admin before fetching user data
    const userString = localStorage.getItem('user');
    if (!userString) {
      setUser([]);
      return;
    }

    try {
      const user = JSON.parse(userString);
      if (!user || !user.user || !user.user.uid) {
        setUser([]);
        return;
      }

      // Check if user is admin
      const userRole = localStorage.getItem('userRole');
      const isAdmin = user.user.email === 'omprakash16003@gmail.com' || 
                     userRole === 'master_admin' || 
                     userRole === 'sub_admin' || 
                     userRole === 'delivery_boy';
      
      if (!isAdmin) {
        setUser([]);
        return;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      setUser([]);
      return;
    }

    setLoading(true)
    try {
      const result = await getDocs(collection(fireDb, "users"))
      const usersArray = [];
      result.forEach((doc) => {
        const userData = doc.data();
        usersArray.push({
          ...userData,
          id: doc.id,
          // Set default values for missing fields
          pageVisits: userData.pageVisits || 0,
          totalOrders: userData.totalOrders || 0,
          totalSpent: userData.totalSpent || 0,
          phone: userData.phone || 'Not provided',
          address: userData.address || 'Not provided',
          lastVisit: userData.lastVisit || 'Never',
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt || userData.date || 'N/A'
        });
      });
      setUser(usersArray);
      console.log('Enhanced user data:', usersArray)
      setLoading(false);
    } catch (error) {
      console.log('Error fetching user data:', error)
      setLoading(false)
    }
  }

  // Update user data with additional information
  const updateUserData = async (userId, userData) => {
    try {
      const userRef = doc(fireDb, "users", userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date().toLocaleString()
      });
      getUserData(); // Refresh user data
      toast.success('User data updated successfully');
    } catch (error) {
      console.error('Error updating user data:', error);
      toast.error('Failed to update user data');
    }
  };

  // Enhanced User Activity Tracking
  const trackUserActivity = async (userId, activityType, data = {}) => {
    // Skip tracking if disabled
    if (!trackingEnabled) {
      console.log('User activity tracking is currently disabled');
      return;
    }
    try {
      const userRef = doc(fireDb, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentData = userDoc.data();
        let updateData = {};
        
        switch (activityType) {
          case 'page_visit':
            // Track page-wise visits
            const pageBreakdown = currentData.pageBreakdown || {
              home: 0,
              products: 0,
              cart: 0,
              checkout: 0,
              profile: 0,
              other: 0
            };
            
            const pageName = data.page || 'other';
            const pageKey = Object.keys(pageBreakdown).includes(pageName) ? pageName : 'other';
            
            updateData = {
              pageVisits: (currentData.pageVisits || 0) + 1,
              lastVisit: new Date().toLocaleString(),
              isActive: true,
              pageBreakdown: {
                ...pageBreakdown,
                [pageKey]: (pageBreakdown[pageKey] || 0) + 1
              },
              // Track session data
              avgSessionDuration: calculateAvgSessionDuration(currentData, data.sessionDuration || 0),
              singlePageVisits: data.isSinglePageVisit ? 
                (currentData.singlePageVisits || 0) + 1 : 
                (currentData.singlePageVisits || 0)
            };
            break;
            
          case 'order_placed':
            updateData = {
              totalOrders: (currentData.totalOrders || 0) + 1,
              totalSpent: (currentData.totalSpent || 0) + (data.amount || 0),
              lastOrderDate: new Date().toLocaleString(),
              // Track order history for analytics
              orderHistory: [
                ...(currentData.orderHistory || []),
                {
                  date: new Date().toLocaleString(),
                  amount: data.amount || 0,
                  items: data.items || [],
                  orderId: data.orderId || ''
                }
              ].slice(-20) // Keep only last 20 orders
            };
            break;
            
          case 'order_cancelled':
            updateData = {
              totalOrders: Math.max(0, (currentData.totalOrders || 0) - 1),
              totalSpent: Math.max(0, (currentData.totalSpent || 0) - (data.amount || 0)),
              lastCancelDate: new Date().toLocaleString(),
              // Update order history to mark as cancelled
              orderHistory: (currentData.orderHistory || []).map(order => 
                order.orderId === data.orderId ? { ...order, cancelled: true } : order
              )
            };
            break;
            
          case 'product_view':
            updateData = {
              productViews: (currentData.productViews || 0) + 1,
              lastProductViewed: data.productId || '',
              viewHistory: [
                ...(currentData.viewHistory || []),
                {
                  productId: data.productId || '',
                  productName: data.productName || '',
                  category: data.category || '',
                  timestamp: new Date().toLocaleString()
                }
              ].slice(-50) // Keep only last 50 product views
            };
            break;
            
          case 'cart_action':
            updateData = {
              cartActions: (currentData.cartActions || 0) + 1,
              lastCartAction: data.action || '', // 'add', 'remove', 'update'
              cartHistory: [
                ...(currentData.cartHistory || []),
                {
                  action: data.action || '',
                  productId: data.productId || '',
                  quantity: data.quantity || 0,
                  timestamp: new Date().toLocaleString()
                }
              ].slice(-30) // Keep only last 30 cart actions
            };
            break;
            
          case 'search_query':
            updateData = {
              searchQueries: (currentData.searchQueries || 0) + 1,
              lastSearchQuery: data.query || '',
              searchHistory: [
                ...(currentData.searchHistory || []),
                {
                  query: data.query || '',
                  results: data.results || 0,
                  timestamp: new Date().toLocaleString()
                }
              ].slice(-20) // Keep only last 20 searches
            };
            break;
            
          case 'profile_update':
            updateData = {
              ...data,
              updatedAt: new Date().toLocaleString(),
              profileUpdateCount: (currentData.profileUpdateCount || 0) + 1
            };
            break;
            
          default:
            updateData = {
              ...data,
              lastActivity: new Date().toLocaleString()
            };
        }
        
        await updateDoc(userRef, updateData);
      } // Do not create a new user if not found
    } catch (error) {
      console.error('Error tracking user activity:', error);
    }
  };

  // Helper function to calculate average session duration
  const calculateAvgSessionDuration = (currentData, newSessionDuration) => {
    const currentAvg = currentData.avgSessionDuration || 0;
    const totalSessions = currentData.pageVisits || 0;
    
    if (totalSessions === 0) return newSessionDuration;
    
    return ((currentAvg * totalSessions) + newSessionDuration) / (totalSessions + 1);
  };

  // Track spending patterns
  const trackSpendingPattern = async (userId, orderData) => {
    try {
      const userRef = doc(fireDb, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data();
        const spendingPattern = currentData.spendingPattern || {
          monthlySpending: {},
          categorySpending: {},
          averageOrderValue: 0,
          spendingTrend: 'stable'
        };
        
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        
        const updatedPattern = {
          ...spendingPattern,
          monthlySpending: {
            ...spendingPattern.monthlySpending,
            [currentMonth]: (spendingPattern.monthlySpending[currentMonth] || 0) + (orderData.amount || 0)
          },
          categorySpending: {
            ...spendingPattern.categorySpending,
            [orderData.category || 'other']: (spendingPattern.categorySpending[orderData.category || 'other'] || 0) + (orderData.amount || 0)
          },
          lastOrderAmount: orderData.amount || 0,
          lastOrderCategory: orderData.category || 'other'
        };
        
        await updateDoc(userRef, {
          spendingPattern: updatedPattern,
          lastSpendingUpdate: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error('Error tracking spending pattern:', error);
    }
  };

  // Track page analytics
  const trackPageAnalytics = async (userId, pageData) => {
    try {
      const userRef = doc(fireDb, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentData = userDoc.data();
        const pageAnalytics = currentData.pageAnalytics || {
          pagesVisited: {},
          timeSpentOnPages: {},
          exitPages: {},
          entryPages: {}
        };
        
        const updatedAnalytics = {
          ...pageAnalytics,
          pagesVisited: {
            ...pageAnalytics.pagesVisited,
            [pageData.page]: (pageAnalytics.pagesVisited[pageData.page] || 0) + 1
          },
          timeSpentOnPages: {
            ...pageAnalytics.timeSpentOnPages,
            [pageData.page]: (pageAnalytics.timeSpentOnPages[pageData.page] || 0) + (pageData.timeSpent || 0)
          }
        };
        
        if (pageData.isEntry) {
          updatedAnalytics.entryPages = {
            ...pageAnalytics.entryPages,
            [pageData.page]: (pageAnalytics.entryPages[pageData.page] || 0) + 1
          };
        }
        
        if (pageData.isExit) {
          updatedAnalytics.exitPages = {
            ...pageAnalytics.exitPages,
            [pageData.page]: (pageAnalytics.exitPages[pageData.page] || 0) + 1
          };
        }
        
        await updateDoc(userRef, {
          pageAnalytics: updatedAnalytics,
          lastPageAnalyticsUpdate: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error('Error tracking page analytics:', error);
    }
  };

  // Function to re-enable tracking (can be called from admin panel)
  const enableTracking = () => {
    setTrackingEnabled(true);
    localStorage.removeItem('trackingDisabled');
    localStorage.removeItem('trackingDisabledAt');
    console.log('User activity tracking re-enabled');
  };

  // Function to disable tracking manually
  const disableTracking = () => {
    setTrackingEnabled(false);
    localStorage.setItem('trackingDisabled', 'true');
    localStorage.setItem('trackingDisabledAt', new Date().toISOString());
    console.log('User activity tracking manually disabled');
  };

  // Check if tracking was previously disabled on app start
  useEffect(() => {
    const trackingDisabled = localStorage.getItem('trackingDisabled');
    if (trackingDisabled === 'true') {
      setTrackingEnabled(false);
      console.log('User activity tracking was previously disabled due to quota issues');
    }
  }, []);

  useEffect(() => {
    // Always fetch products (public data)
    getProductData();
    
    // Only fetch sensitive data if user is authenticated
    const checkAuthAndFetchData = () => {
      const userString = localStorage.getItem('user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          if (user && user.user && user.user.uid) {
            getOrderData();
            getUserData();
          }
        } catch (error) {
          console.error('Error checking auth:', error);
        }
      }
    };

    // Check auth state on mount
    checkAuthAndFetchData();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        checkAuthAndFetchData();
      } else {
        // Clear sensitive data when user logs out
        setOrder([]);
        setUser([]);
      }
    });

    // Listen for localStorage changes (when user logs in/out)
    const handleStorageChange = () => {
      checkAuthAndFetchData();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userChanged', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userChanged', handleStorageChange);
    };
  }, []);
  const [searchkey, setSearchkey] = useState('')

  return (
    <MyContext.Provider value={{ 
      loading, setLoading,
      addProduct, product, edithandle, updateProduct, deleteProduct, order, user, searchkey, setSearchkey,
      getUserData, updateUserData, trackUserActivity, trackSpendingPattern, trackPageAnalytics, 
      enableTracking, disableTracking, trackingEnabled}}>
      {props.children}
    </MyContext.Provider>
  )
}

export default MyState