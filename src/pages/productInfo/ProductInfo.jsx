import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useDispatch, useSelector } from 'react-redux';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { addToCart } from '../../redux/cartSlice';
import { fireDB } from '../../firebase/FirebaseConfig';
import Layout from '../../components/layout/Layout';
import myContext from '../../context/data/myContext';
import { Leaf, Star, Truck, Shield, Clock, Heart, ShoppingCart, ArrowRight, Share2, Copy, Facebook, MessageCircle, Send, X } from 'lucide-react';
import Loader from '../../components/loader/Loader';
import { useUserTracking } from '../../hooks/useUserTracking';

function ProductInfo() {
    const { trackPage } = useUserTracking();
    const context = useContext(myContext);
    const { loading, setLoading, product } = context;
    const [products, setProducts] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const navigate = useNavigate();
    const params = useParams({ from: '/productinfo/$id' });
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart);

    // Constants for quantity management (matching cart page)
    const MIN_QUANTITY = 0.50;
    const QUANTITY_STEP = 0.50;
    const LEAFY_MIN_QUANTITY = 1;
    const LEAFY_QUANTITY_STEP = 1;

    // Track page visit
    useEffect(() => {
        trackPage('products');
    }, [trackPage]);

    const getProductData = async () => {
        setLoading(true);
        try {
            const productTemp = await getDoc(doc(fireDB, "products", params.id));
            setProducts(productTemp.data());
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    }

    useEffect(() => {
        getProductData();
    }, [params.id]);

    const addCart = (products) => {
        // Convert any Firestore Timestamp to ISO string
        const safeProduct = {
            ...products,
            time: products.time && products.time.toDate ? products.time.toDate().toISOString() : products.time,
            quantity
        };
        dispatch(addToCart(safeProduct));
        toast.success('Added to cart');
    }

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Get suggested products (same category, excluding current product)
    const getSuggestedProducts = () => {
        if (!products || !product) return [];
        
        const currentCategory = products.category;
        const currentId = params.id;
        
        return product
            .filter(item => 
                item.id !== currentId && 
                (item.category === currentCategory || 
                 item.category === 'Vegetables' || 
                 item.category === 'Leafy Vegetables')
            )
            .slice(0, 6); // Show max 6 suggestions
    };

    const suggestedProducts = getSuggestedProducts();

    // Check if product is leafy vegetable
    const isLeafyVegetable = products?.category === 'Leafy Vegetables';

    // Handle view details click
    const handleViewDetails = (productId) => {
        console.log('Navigating to product:', productId);
        navigate({ to: `/productinfo/${productId}` });
    };

    // Share functionality
    const handleShare = async (platform) => {
        const productUrl = window.location.href;
        const shareText = `Check out ${products.title} on Navedhana! ${products.description}`;
        
        switch (platform) {
            case 'copy':
                try {
                    await navigator.clipboard.writeText(productUrl);
                    toast.success('Link copied to clipboard!');
                } catch (err) {
                    toast.error('Failed to copy link');
                }
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + productUrl)}`);
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`);
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`);
                break;
        }
        setShowShareDialog(false);
    };

    if (loading) {
        return (
            <Layout>
                <Loader />
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Fixed navbar offset - accounts for announcement bar + navbar height */}
            <div className="pt-24 lg:pt-28 min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {products && (
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Product Image Section */}
                            <div className="lg:w-1/2">
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                                    <div className="relative group">
                                        <img
                                            src={products.imageUrl}
                                            alt={products.title}
                                            className="w-full h-[300px] lg:h-[500px] object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
                                        {/* Share Button */}
                                        <button
                                            onClick={() => setShowShareDialog(true)}
                                            className="absolute top-4 right-20 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-lg"
                                        >
                                            <Share2 className="w-5 h-5 text-gray-600" />
                                        </button>
                                        
                                        {/* Wishlist Button */}
                                        <button
                                            onClick={() => setIsWishlisted(!isWishlisted)}
                                            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-lg"
                                        >
                                            <Heart 
                                                className={`w-5 h-5 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                                            />
                                        </button>
                                        
                                        {/* Fresh Badge */}
                                        <div className="absolute top-4 left-4">
                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-sm font-medium">
                                                <Leaf className="w-4 h-4" />
                                                Fresh
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Product Details Section */}
                            <div className="lg:w-1/2">
                                <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
                                    {/* Product Title and Rating */}
                                    <div className="mb-6">
                                        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                                            {products.title}
                                        </h1>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-5 h-5 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-gray-500 text-sm">4.0 (120+ reviews)</span>
                                        </div>
                                    </div>

                                    {/* Product Description */}
                                    <div className="mb-6">
                                        <p className="text-gray-600 leading-relaxed text-lg">
                                            {products.description}
                                        </p>
                                    </div>

                                    {/* Price and Quantity Section */}
                                    <div className="border-t border-gray-200 pt-6 mb-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-bold text-gray-900">₹{products.price}</span>
                                                {products.actualprice > products.price && (
                                                    <span className="text-lg text-gray-400 line-through">₹{products.actualprice}</span>
                                                )}
                                                <span className="text-lg text-gray-500">
                                                    per {isLeafyVegetable ? 'piece' : 'kg'}
                                                </span>
                                            </div>
                                            
                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                                                {isLeafyVegetable ? (
                                                    // Dropdown for leafy vegetables (pieces)
                                                    <select
                                                        value={quantity}
                                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                                        className="w-32 px-3 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-semibold text-gray-900"
                                                    >
                                                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                                            <option key={num} value={num}>
                                                                {num} piece{num > 1 ? 's' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    // Plus/minus buttons for regular vegetables (kg)
                                                    <>
                                                        <button 
                                                            onClick={() => setQuantity(Math.max(MIN_QUANTITY, quantity - QUANTITY_STEP))}
                                                            className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center font-semibold text-gray-700 transition-colors duration-200 shadow-sm"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-16 text-center font-semibold text-gray-900">
                                                            {quantity.toFixed(2)} kg
                                                        </span>
                                                        <button 
                                                            onClick={() => setQuantity(quantity + QUANTITY_STEP)}
                                                            className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center font-semibold text-gray-700 transition-colors duration-200 shadow-sm"
                                                        >
                                                            +
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => addCart(products)}
                                                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            >
                                                Add to Cart
                                            </button>
                                            
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Suggestions Section */}
                    {suggestedProducts.length > 0 && (
                        <div className="mt-16">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    You Might Also Like
                                </h2>
                                <p className="text-gray-600 text-lg">
                                    Discover more fresh vegetables from our collection
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                                {suggestedProducts.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="bg-white rounded-lg sm:rounded-2xl shadow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden group"
                                    >
                                        {/* Product Image */}
                                        <div className="relative overflow-hidden">
                                            <Link to={`/productinfo/${item.id}`}>
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    className="w-full h-28 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </Link>
                                            
                                            {/* Category Badge */}
                                            <div className="absolute top-2 left-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                                                    item.category === 'Vegetables' 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-pink-100 text-pink-700'
                                                }`}>
                                                    {item.category}
                                                </span>
                                            </div>

                                            {/* Quick Add Button */}
                                            <button
                                                onClick={() => {
                                                    const defaultQuantity = item.category === 'Leafy Vegetables' ? 1 : 0.25;
                                                    const safeItem = {
                                                        ...item,
                                                        time: item.time && item.time.toDate ? item.time.toDate().toISOString() : item.time,
                                                        quantity: defaultQuantity
                                                    };
                                                    dispatch(addToCart(safeItem));
                                                    toast.success('Added to cart');
                                                }}
                                                className="absolute top-2 right-2 p-1.5 sm:p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-lg opacity-0 group-hover:opacity-100"
                                            >
                                                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                                            </button>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-2 sm:p-4">
                                            <Link to={`/productinfo/${item.id}`}>
                                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                                                    {item.title}
                                                </h3>
                                            </Link>
                                            
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-base sm:text-lg font-bold text-green-600">₹{item.price}</span>
                                                    {item.actualprice && item.actualprice > item.price && (
                                                        <span className="text-xs sm:text-sm text-gray-400 line-through">₹{item.actualprice}</span>
                                                    )}
                                                </div>
                                                
                                                {/* Rating */}
                                                <div className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-xs sm:text-sm text-gray-600">4.0</span>
                                                </div>
                                            </div>

                                            {/* View Details Button */}
                                            <button 
                                                onClick={() => handleViewDetails(item.id)}
                                                className="w-full flex items-center justify-center gap-1 py-1.5 sm:py-2 px-3 sm:px-4 border border-green-600 text-green-600 text-xs sm:text-sm rounded-lg font-medium hover:bg-green-50 transition-all duration-200 group/btn"
                                            >
                                                View Details
                                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* View All Products Button */}
                            <div className="text-center mt-8">
                                <Link 
                                    to="/allproducts"
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    View All Products
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Share Dialog */}
            {showShareDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Share Product</h3>
                            <button 
                                onClick={() => setShowShareDialog(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleShare('whatsapp')}
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span>WhatsApp</span>
                            </button>
                            
                            <button
                                onClick={() => handleShare('facebook')}
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                <Facebook className="w-5 h-5" />
                                <span>Facebook</span>
                            </button>
                            
                            <button
                                onClick={() => handleShare('twitter')}
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                                <span>Twitter</span>
                            </button>
                            
                            <button
                                onClick={() => handleShare('copy')}
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                <Copy className="w-5 h-5" />
                                <span>Copy Link</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ProductInfo;