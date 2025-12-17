// Debug utility for TanStack Router
export const debugRouter = () => {
  console.log('Router Debug Info:');
  console.log('- Current URL:', window.location.href);
  console.log('- Current pathname:', window.location.pathname);
  
  // Check user auth
  try {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    console.log('- User auth check:', !!user?.user?.uid);
    console.log('- User data:', user);
  } catch (error) {
    console.error('- User auth error:', error);
  }
  
  // Check admin auth
  try {
    const adminString = localStorage.getItem('user');
    const admin = adminString ? JSON.parse(adminString) : null;
    const userRole = localStorage.getItem('userRole');
    console.log('- Admin auth check:', admin?.user?.email === 'omprakash16003@gmail.com' || 
                  userRole === 'master_admin' || 
                  userRole === 'sub_admin' || 
                  userRole === 'delivery_boy');
    console.log('- User role:', userRole);
  } catch (error) {
    console.error('- Admin auth error:', error);
  }
};

// Test navigation function
export const testNavigation = (path) => {
  console.log(`Testing navigation to: ${path}`);
  try {
    window.location.href = path;
  } catch (error) {
    console.error('Navigation error:', error);
  }
};

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  window.debugRouter = debugRouter;
  window.testNavigation = testNavigation;
} 