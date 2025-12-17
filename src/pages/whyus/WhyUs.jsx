import React, { useContext, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import Layout from '../../components/layout/Layout';
import { 
    Leaf, 
    Clock, 
    Truck, 
    Users, 
    Heart, 
    Star, 
    CheckCircle, 
    ArrowRight,
    Shield,
    Zap,
    Globe,
    Award
} from 'lucide-react';
import myContext from '../../context/data/myContext';
import { useUserTracking } from '../../hooks/useUserTracking';

const WhyUsPage = () => {
    const { trackPage } = useUserTracking();
    const context = useContext(myContext);
    const { mode } = context;

    // Track page visit
    useEffect(() => {
        trackPage('other');
    }, [trackPage]);

    return (
        <Layout>
            {/* Hero Section */}
            <div className="pt-24 lg:pt-28 min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {/* Hero Content */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                            <Leaf className="w-4 h-4" />
                            Empowering Farmers, Serving Customers
                        </div>
                        
                        <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            Why Choose{' '}
                            <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                Navedhana?
                            </span>
                        </h1>
                        
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            We bridge the gap between farmers and consumers, ensuring fresh, farm-to-table vegetables 
                            within 8 hours of harvest while supporting local agriculture and fair compensation.
                        </p>
                    </div>

                    {/* Statistics Section */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">Home delivery</div>
                            <div className="text-sm text-gray-600">Fresh Delivery</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
                            <div className="text-sm text-gray-600">Farmers Supported</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Truck className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">1000+</div>
                            <div className="text-sm text-gray-600">Deliveries Made</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">4.8★</div>
                            <div className="text-sm text-gray-600">Customer Rating</div>
                        </div>
                    </div>

                    {/* Main Benefits Section */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                            Our Core Values & Benefits
                        </h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Benefit 1 */}
                            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Heart className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        Supporting Farmers First
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        We take the marketing stress off farmers' shoulders, helping them sell perishable crops quickly 
                                        with fair compensation. No middlemen, no transportation worries - just direct support for local agriculture.
                                    </p>
                                    <div className="flex items-center gap-2 text-green-600 font-medium">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Fair market prices</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600 font-medium mt-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>No middlemen fees</span>
                                    </div>
                            </div>
                        </div>

                        {/* Benefit 2 */}
                            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Zap className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        Fresh in 8 Hours
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Get vegetables harvested and delivered on the same day. Our harvest countdown shows you 
                                        exactly when your produce was picked, ensuring maximum freshness and nutrition.
                                    </p>
                                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Same-day delivery</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-600 font-medium mt-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Harvest tracking</span>
                                    </div>
                                </div>
                            </div>

                            {/* Benefit 3 */}
                            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Truck className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        Efficient Bulk Delivery
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        We deliver bulk orders to apartment complexes and colonies using optimized routes, 
                                        keeping delivery charges low while maintaining high standards for freshness and quality.
                                    </p>
                                    <div className="flex items-center gap-2 text-purple-600 font-medium">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Cost-effective delivery</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-purple-600 font-medium mt-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Optimized routes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Benefit 4 */}
                            <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Award className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        Quality Guaranteed
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Every vegetable is carefully selected and quality-checked. We work directly with farmers 
                                        to ensure you get the best produce while supporting sustainable farming practices.
                                    </p>
                                    <div className="flex items-center gap-2 text-orange-600 font-medium">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Quality assurance</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-orange-600 font-medium mt-2">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Sustainable practices</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How It Works Section */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                            How It Works
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-green-600">1</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">You Order</h3>
                                <p className="text-gray-600">
                                    Browse fresh vegetables, place your order, and we'll coordinate with farmers for Next-day delivery.
                                </p>
                            </div>
                            
                            <div className="text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-green-600">2</span>
                                </div>
                                
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Farmers Harvest</h3>
                                <p className="text-gray-600">
                                    Local farmers harvest fresh vegetables and list them on our platform with real-time availability.
                                </p>
                        </div>

                            <div className="text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-2xl font-bold text-green-600">3</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Fresh Delivery</h3>
                                <p className="text-gray-600">
                                    Get your fresh vegetables delivered within 8 hours of harvest, supporting local farmers directly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center bg-gradient-to-r from-green-600 to-green-700 rounded-3xl p-12 text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            Ready to Support Local Farmers?
                        </h2>
                        <p className="text-xl mb-8 opacity-90">
                            Join thousands of customers who are already enjoying fresh, farm-to-table vegetables 
                            while supporting local agriculture.
                        </p>
                        <Link 
                            to="/allproducts"
                            className="inline-flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Browse Fresh Vegetables
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default WhyUsPage;
