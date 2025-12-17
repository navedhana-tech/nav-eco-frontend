import React, { useContext, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import Layout from '../../components/layout/Layout';
import { 
    Leaf, 
    Users, 
    Target, 
    Award, 
    Globe, 
    Heart, 
    Star, 
    CheckCircle, 
    ArrowRight,
    Truck,
    Clock,
    Shield,
    Zap,
    TrendingUp
} from 'lucide-react';
import myContext from '../../context/data/myContext';
import { useUserTracking } from '../../hooks/useUserTracking';
import { Helmet } from 'react-helmet-async';

const AboutPage = () => {
    const { trackPage } = useUserTracking();
    const context = useContext(myContext);
    const { mode } = context;

    // Track page visit
    useEffect(() => {
        trackPage('other');
    }, [trackPage]);

    return (
       <Layout>
            <Helmet>
                <title>About – Farm-to-Table Fresh Vegetable Delivery | Navedhana Fresh</title>
                <meta
                    name="description"
                    content="Learn about Navedhana Fresh and our mission to connect farmers directly with customers for fresh vegetables and leafy greens home delivery."
                />
                <link rel="canonical" href="https://fresh.navedhana.com/about" />
                <meta property="og:url" content="https://fresh.navedhana.com/about" />
                <meta property="og:title" content="About – Farm-to-Table Fresh Vegetable Delivery | Navedhana Fresh" />
                <meta
                    property="og:description"
                    content="Learn about Navedhana Fresh and our mission to connect farmers directly with customers for fresh vegetables and leafy greens home delivery."
                />
            </Helmet>
            {/* Hero Section */}
            <div className="pt-24 lg:pt-28 min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    {/* Hero Content */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                            <Leaf className="w-4 h-4" />
                            About Navedhana
                        </div>
                        
                        <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            Revolutionizing{' '}
                            <span className="bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                                Farm-to-Table
                            </span>
                        </h1>
                        
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            We're on a mission to transform the agricultural supply chain by connecting farmers directly 
                            with consumers, ensuring fresh vegetables reach your table within 8 hours of harvest.
                        </p>
                    </div>

                    {/* Company Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
                            <div className="text-sm text-gray-600">Farmers</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Truck className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">1000+</div>
                            <div className="text-sm text-gray-600">Deliveries</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">Home delivery</div>
                            <div className="text-sm text-gray-600">Fresh Delivery</div>
                        </div>
                        
                        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">4.8★</div>
                            <div className="text-sm text-gray-600">Rating</div>
                        </div>
                    </div>

                    {/* Our Story Section */}
                    <div className="mb-16">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                From a simple idea to a revolutionary platform that's changing how we think about fresh produce.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">The Beginning</h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    Navedhana was born from a simple observation: farmers were struggling to get fair prices for their produce, 
                                    while consumers were paying high prices for vegetables that had lost their freshness through long supply chains.
                                </p>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    We realized that by eliminating middlemen and creating a direct connection between farmers and consumers, 
                                    we could solve both problems simultaneously.
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                        <Target className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">Our Vision</h4>
                                        <p className="text-sm text-gray-600">A world where fresh produce is accessible to all</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-8 text-white">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                    <Leaf className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Today's Impact</h3>
                                <p className="text-white/90 leading-relaxed mb-6">
                                    We've successfully connected hundreds of farmers with thousands of customers, 
                                    creating a sustainable ecosystem that benefits everyone involved.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">95%</div>
                                        <div className="text-sm text-white/80">Less Food Waste</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">40%</div>
                                        <div className="text-sm text-white/80">Better Prices</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mission & Values Section */}
                    <div className="mb-16">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission & Values</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                We're driven by a clear mission and guided by values that put people and planet first.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Mission */}
                            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Target className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    To revolutionize the agricultural supply chain by creating a direct bridge between farmers and consumers, 
                                    ensuring fair compensation for farmers while delivering the freshest produce to customers.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                        <span className="text-gray-700">Eliminate middlemen</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                        <span className="text-gray-700">Reduce food waste</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                        <span className="text-gray-700">Support local farmers</span>
                        </div>
                    </div>
                </div>

                            {/* Values */}
                            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                                    <Heart className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Shield className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Transparency</h4>
                                            <p className="text-sm text-gray-600">Clear pricing and honest communication</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Zap className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Innovation</h4>
                                            <p className="text-sm text-gray-600">Constantly improving our platform</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Globe className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Sustainability</h4>
                                            <p className="text-sm text-gray-600">Eco-friendly practices and local focus</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How We Work Section */}
                    <div className="mb-16">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">How We Work</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                Our streamlined process ensures maximum freshness and efficiency.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center group">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-2xl font-bold text-green-600">1</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Farmers List Produce</h3>
                                <p className="text-gray-600">
                                    Local farmers harvest and list their fresh vegetables on our platform with real-time availability and pricing.
                                </p>
                            </div>
                            
                            <div className="text-center group">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-2xl font-bold text-green-600">2</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Customers Order</h3>
                                <p className="text-gray-600">
                                    Customers browse fresh vegetables, place orders, and we coordinate with farmers for same-day delivery.
                                </p>
                            </div>
                            
                            <div className="text-center group">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-2xl font-bold text-green-600">3</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Fresh Delivery</h3>
                                <p className="text-gray-600">
                                    We deliver fresh vegetables within 8 hours of harvest, ensuring maximum freshness and supporting local farmers.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center bg-gradient-to-r from-green-600 to-green-700 rounded-3xl p-12 text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            Join the Revolution
                        </h2>
                        <p className="text-xl mb-8 opacity-90">
                            Be part of the movement that's changing how we think about fresh produce. 
                            Support local farmers while enjoying the freshest vegetables.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link 
                                to="/allproducts"
                                className="inline-flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Browse Products
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link 
                                to="/whyus"
                                className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-green-600 transition-all duration-200"
                            >
                                Learn More
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
       </Layout>
    );
};

export default AboutPage;
