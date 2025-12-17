import { hasDeliveryAccess, getCurrentUserRole } from './roleUtils';

export const testDeliveryBoyAccess = () => {
  console.log('=== Testing Delivery Boy Access ===');
  
  // Test different role scenarios
  const testCases = [
    { role: 'master_admin', expected: true },
    { role: 'sub_admin', expected: true },
    { role: 'delivery_boy', expected: true },
    { role: 'user', expected: false }
  ];
  
  testCases.forEach(({ role, expected }) => {
    // Temporarily set role in localStorage
    const originalRole = localStorage.getItem('userRole');
    localStorage.setItem('userRole', role);
    
    const hasAccess = hasDeliveryAccess();
    const status = hasAccess === expected ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${status} Role: ${role}, Expected: ${expected}, Got: ${hasAccess}`);
    
    // Restore original role
    if (originalRole) {
      localStorage.setItem('userRole', originalRole);
    } else {
      localStorage.removeItem('userRole');
    }
  });
  
  console.log('=== Test Complete ===');
};

export const showDeliveryBoyMenu = () => {
  // Simulate delivery boy login
  localStorage.setItem('userRole', 'delivery_boy');
  
  console.log('=== Delivery Boy Menu Items ===');
  console.log('Available tabs for delivery boy:');
  console.log('- Delivery Dashboard (default)');
  console.log('- Inventory');
  console.log('- Orders');
  console.log('');
  console.log('Hidden tabs:');
  console.log('- Overview');
  console.log('- Products');
  console.log('- Users');
  console.log('- Analytics');
  console.log('- Settings');
  console.log('- Admin Management');
  console.log('- Add Product');
  console.log('- Update Banners');
  console.log('=== End Menu Items ===');
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  window.testDeliveryBoyAccess = testDeliveryBoyAccess;
  window.showDeliveryBoyMenu = showDeliveryBoyMenu;
} 