import React, { useContext, useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import myContext from '../../context/data/myContext';
import HeroSection from '../../components/heroSection/HeroSection';
import ProductCard from '../../components/productCard/productCard';
import Track from '../../components/track/Track';
import TermsModal from '../../components/modal/TermsModal';
import { getDoc, doc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import { useUserTracking } from '../../hooks/useUserTracking';
import { useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
//import Testimonial from '../../components/testimonial/Testimonial';

function Home() {
  const { trackPage } = useUserTracking();
  const navigate = useNavigate();
  const [showNotice, setShowNotice] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [timingSettings, setTimingSettings] = useState({
    orderStartTime: '08:00',
    orderEndTime: '22:00',
    lateOrderCutoffTime: '21:00'
  });

  // Track page visit
  useEffect(() => {
    trackPage('home');
  }, [trackPage]);

  useEffect(() => {
    const fetchTimingSettings = async () => {
      try {
        const timingDoc = await getDoc(doc(fireDB, 'settings', 'timing'));
        if (timingDoc.exists()) {
          setTimingSettings(timingDoc.data());
        }
      } catch (err) {
        console.error('Error fetching timing settings:', err);
      }
    };
    fetchTimingSettings();
  }, []);

  useEffect(() => {
    // Check if user is logged in and if terms have been accepted
    const user = localStorage.getItem('user');
    const termsAccepted = localStorage.getItem('termsAccepted');
    if (user && !termsAccepted) {
      setShowTerms(true);
    }
  }, []);

  const handleAcceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setShowTerms(false);
  };

  const handleNoticeOkay = () => {
    localStorage.setItem('orderNoticeAccepted', 'true');
    setShowNotice(false);
  };

  return (
    <Layout>
      <Helmet>
        <title>Navedhana Fresh – Fresh Vegetables & Leafy Greens Home Delivery</title>
        <meta
          name="description"
          content="Order fresh vegetables and leafy greens online with Navedhana Fresh. Farm-to-table produce with fast doorstep home delivery and easy search."
        />
        <link rel="canonical" href="https://fresh.navedhana.com/" />
        <meta property="og:url" content="https://fresh.navedhana.com/" />
        <meta property="og:title" content="Navedhana Fresh – Fresh Vegetables & Leafy Greens Home Delivery" />
        <meta
          property="og:description"
          content="Order fresh vegetables and leafy greens online with Navedhana Fresh. Farm-to-table produce with fast doorstep home delivery and easy search."
        />
      </Helmet>
              <div className="pt-[70px] lg:pt-35">
        {/* Debug Navigation Panel */}
        
        <HeroSection />
        <ProductCard />
        <Track />
        <TermsModal open={showTerms} onAccept={handleAcceptTerms} onClose={() => setShowTerms(false)} />
        {showNotice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Blurred overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl px-8 py-6 max-w-md w-full text-center border-2 border-green-600">
              <div className="text-green-700 text-lg font-semibold mb-2">
                Order Times: {timingSettings.orderStartTime} – {timingSettings.orderEndTime}
              </div>
              <div className="text-gray-700 mb-4">
                Orders placed after {timingSettings.lateOrderCutoffTime} will be delivered with the next day's harvest.
              </div>
              <button onClick={handleNoticeOkay} className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
                Accept
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Home;
