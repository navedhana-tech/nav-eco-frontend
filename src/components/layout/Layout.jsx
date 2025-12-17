import React from 'react';
import Navbar from '../navbar/Navbar';
import Footer from '../footer/Footer';
import MobileBottomNav from '../MobileBottomNav';

function Layout({ children }) {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <div className="content min-h-screen">
        {children}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
