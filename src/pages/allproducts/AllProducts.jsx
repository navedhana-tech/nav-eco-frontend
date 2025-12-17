import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiHeart, FiFilter, FiX, FiSearch, FiGrid, FiList } from 'react-icons/fi';
import { BsGrid, BsList, BsStarFill } from 'react-icons/bs';
import { Truck, CreditCard, Star } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import myContext from '../../context/data/myContext';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../redux/cartSlice';
import { toast } from 'react-toastify';
import Loader from '../../components/loader/Loader';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import { useNavigate } from '@tanstack/react-router';
import { useUserTracking } from '../../hooks/useUserTracking';

function Allproducts() {
    const { trackPage } = useUserTracking();
    const context = useContext(myContext);
    const { mode, product, searchkey, setSearchkey, loading } = context;
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('default');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 5000]);
    const [favorites, setFavorites] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const navigate = useNavigate();

    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart);

    // Track page visit
    useEffect(() => {
        trackPage('products');
    }, [trackPage]);

    const addCart = (product) => {
        // Set default quantity of 1 for leafy vegetables, 0.50 for regular vegetables
        const productToAdd = product.category === 'Leafy Vegetables' 
            ? { ...product, quantity: 1 }
            : { ...product, quantity: 0.50 };
        dispatch(addToCart(productToAdd));
        toast.success('Added to cart');
    };

    const toggleFavorite = async (productId) => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.user?.uid) {
            toast.error('Please login to use favorites');
            return;
        }
        let updated;
        if (favorites.includes(productId)) {
            updated = favorites.filter(id => id !== productId);
        } else {
            updated = [...favorites, productId];
        }
        setFavorites(updated);
        await setDoc(doc(fireDB, 'favorites', userData.user.uid), { productIds: updated });
    };

    // Calculate discount percentage
    const calculateDiscount = (actualPrice, price) => {
        const discount = ((actualPrice - price) / actualPrice) * 100;
        return Math.round(discount);
    };

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.user?.uid) return;
        const fetchFavorites = async () => {
            const favDoc = await getDoc(doc(fireDB, 'favorites', userData.user.uid));
            if (favDoc.exists()) setFavorites(favDoc.data().productIds || []);
        };
        fetchFavorites();
    }, [product]);

    // Get unique categories
    const categories = ['all', ...new Set(product.map(item => item.category))];

    // Filtered suggestions
    const suggestions = searchkey.trim()
        ? product.filter(p =>
            p.title.toLowerCase().includes(searchkey.toLowerCase())
        ).slice(0, 5)
        : [];

    // Filter and sort products
    const filteredAndSortedProducts = product
        .filter((obj) => {
            const matchesSearch = obj.title.toLowerCase().includes(searchkey.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || obj.category === selectedCategory;
            const matchesPriceRange = obj.price >= priceRange[0] && obj.price <= priceRange[1];
            return matchesSearch && matchesCategory && matchesPriceRange;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'discount':
                    return calculateDiscount(b.actualprice, b.price) - calculateDiscount(a.actualprice, a.price);
                default:
                    return 0;
            }
        });

    // Separate products by category and sort vegetables alphabetically
    const vegetables = filteredAndSortedProducts
        .filter(item => item.category === 'Vegetables')
        .sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
    const leafyVegetables = filteredAndSortedProducts
        .filter(item => item.category === 'Leafy Vegetables')
        .sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });

    // Product Card Component
    const ProductCard = ({ item, viewMode, index }) => {
        const { title, price, imageUrl, id, actualprice, category, stock } = item;
        const discountPercentage = calculateDiscount(actualprice, price);
        const isFavorite = favorites.includes(id);
        // Best Seller logic: top 3 or discount > 20%
        const isBestSeller = index < 3 || discountPercentage > 20;
        // Stock indicator (always green for now)
        const inStock = typeof stock === 'undefined' ? true : stock > 0;

        return (
            <motion.div
                variants={itemVariants}
                className={`group cursor-pointer ${
                    viewMode === 'list'
                        ? 'flex bg-gradient-to-br from-white to-green-50 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-green-100 hover:shadow-xl md:hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 p-3 md:p-4 items-center gap-3 md:gap-6 w-full min-h-[120px] md:min-h-[160px]'
                        : ''
                }`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate({ to: `/productinfo/${id}` });
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
            >
                {viewMode === 'grid' ? (
                    // Grid View Card
                    <div className="bg-gradient-to-br from-white to-green-50 rounded-3xl shadow-xl border border-green-100 hover:shadow-2xl hover:scale-105 hover:border-green-400 transition-all duration-300 overflow-hidden relative">
                        {/* Best Seller Badge */}
                       
                        {/* Image Container */}
                        <div className="relative pt-[100%] overflow-hidden flex items-center justify-center">
                            <img
                                className="absolute top-0 left-0 w-full h-full object-cover rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300"
                                src={imageUrl}
                                alt={title}
                            />
                            {/* Discount Badge */}
                            {discountPercentage > 0 && (
                                <div className="absolute top-3 right-3 bg-gradient-to-r from-pink-400 to-green-400 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                    {discountPercentage}% OFF
                                </div>
                            )}
                            {/* Favorite Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(id);
                                }}
                                className={`absolute top-3 left-3 p-2 rounded-full transition-all duration-300 shadow-lg ${
                                    isFavorite 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-white/90 backdrop-blur-sm hover:bg-white'
                                }`}
                            >
                                <FiHeart 
                                    className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} 
                                />
                            </button>
                            {/* Stock Indicator */}
                            <span className={`absolute bottom-3 right-3 w-3 h-3 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`} title={inStock ? 'In Stock' : 'Out of Stock'}></span>
                        </div>
                        {/* Content Container */}
                        <div className="p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    category === 'Vegetables' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'
                                }`}>
                                    {category}
                                </span>
                            </div>
                            <h1 className="text-base font-bold mb-1 text-gray-900 line-clamp-2 leading-tight">{title}</h1>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-green-600">₹{price}</span>
                                    {actualprice > price && (
                                        <span className="text-xs text-gray-400 line-through">₹{actualprice}</span>
                                    )}
                                    <span className="text-xs text-gray-500">{category === 'Leafy Vegetables' ? '/pieces' : '/kg'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addCart(item);
                                }}
                                className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center gap-2 font-semibold shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:scale-105 focus:ring-2 focus:ring-green-400"
                            >
                                <FiShoppingCart className="w-5 h-5" />
                                Add To Cart
                            </button>
                        </div>
                    </div>
                ) : (
                    // List View Card
                    <>
                        {/* Image */}
                        <div className="relative flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-xl md:rounded-2xl overflow-hidden bg-gray-50">
                            <img
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                src={imageUrl}
                                alt={title}
                            />
                            {/* Discount Badge */}
                            {discountPercentage > 0 && (
                                <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-gradient-to-r from-pink-400 to-green-400 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs font-bold shadow-lg">
                                    {discountPercentage}% OFF
                                </div>
                            )}
                            {/* Best Seller Badge */}
                            
                            {/* Favorite Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(id);
                                }}
                                className={`absolute top-1 left-1 md:top-2 md:left-2 p-1 md:p-1.5 rounded-full transition-all duration-300 shadow-lg ${
                                    isFavorite 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-white/90 backdrop-blur-sm hover:bg-white'
                                }`}
                            >
                                <FiHeart 
                                    className={`w-2.5 h-2.5 md:w-3 md:h-3 ${isFavorite ? 'fill-current' : ''}`} 
                                />
                            </button>
                            {/* Stock Indicator */}
                            <span className={`absolute bottom-1 right-1 md:bottom-2 md:right-2 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`} title={inStock ? 'In Stock' : 'Out of Stock'}></span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between py-1 md:py-2 min-w-0">
                            {/* Header Section */}
                            <div className="flex flex-col gap-1 md:gap-2 mb-2 md:mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        category === 'Vegetables' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'
                                    }`}>
                                        {category}
                                    </span>
                                </div>
                                <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight line-clamp-2">{title}</h1>
                            </div>
                            
                            {/* Price and Action Section */}
                            <div className="flex items-center justify-between gap-2 md:gap-4">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-baseline gap-1 md:gap-2 flex-wrap">
                                        <span className="text-lg md:text-xl font-bold text-green-600">₹{price}</span>
                                        {actualprice > price && (
                                            <span className="text-xs md:text-sm text-gray-400 line-through">₹{actualprice}</span>
                                        )}
                                        <span className="text-xs md:text-sm text-gray-500">{category === 'Leafy Vegetables' ? '/pieces' : '/kg'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addCart(item);
                                    }}
                                    className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center gap-1 md:gap-2 font-semibold shadow-lg transition-all hover:from-green-600 hover:to-green-700 hover:scale-105 focus:ring-2 focus:ring-green-400 text-xs md:text-sm flex-shrink-0"
                                >
                                    <FiShoppingCart className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="hidden xs:inline">Add To Cart</span>
                                    <span className="inline xs:hidden">Add</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        );
    };

    // Category Section Component
    const CategorySection = ({ title, products, category, icon, gradient }) => {
        if (products.length === 0) return null;

        return (
            <div className="mb-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-xl">{icon}</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                        <p className="text-gray-600">{products.length} items available</p>
                    </div>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className={viewMode === 'grid' 
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                        : "space-y-4"
                    }
                >
                    {products.map((item, idx) => (
                        <ProductCard key={item.id} item={item} viewMode={viewMode} index={idx} />
                    ))}
                </motion.div>
            </div>
        );
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
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
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-green-50 via-pink-50 to-blue-50 py-8 mb-8 mt-20">
                <div className="container mx-auto px-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            Discover Fresh Products
                        </h1>
                        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                            Explore our wide range of fresh vegetables and leafy greens, carefully sourced from local farmers
                        </p>
                        {/* Search Bar */}
                        <div className="max-w-md mx-auto mb-6 relative">
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search for vegetables, leafy greens..."
                                    value={searchkey}
                                    onChange={(e) => { setSearchkey(e.target.value); setShowSuggestions(true); }}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent shadow-sm text-lg"
                                    autoComplete="off"
                                    onFocus={() => setShowSuggestions(true)}
                                />
                            </div>
                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-72 overflow-y-auto">
                                    {suggestions.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer transition-all border-b last:border-b-0"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate({ to: `/productinfo/${item.id}` });
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover border" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-900 truncate">{item.title}</div>
                                                <div className="text-xs text-gray-500 truncate">{item.category}</div>
                                            </div>
                                            <div className="font-bold text-green-600 text-sm">₹{item.price}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center">
                            <div className="h-1 w-32 bg-gradient-to-r from-green-400 to-pink-400 rounded"></div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <section className="text-gray-600 body-font min-h-screen w-full overflow-x-hidden">
                <div className="container px-2 sm:px-4 py-6 md:py-12 mx-auto w-full">
                    {/* Enhanced Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-6 w-full">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex-1 min-w-0 max-w-full"
                        >
                            <div className="flex items-center gap-4 mb-4 min-w-0 max-w-full">
                                <h2 className="text-2xl font-bold text-gray-800 truncate">
                                    All Products
                                </h2>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    {filteredAndSortedProducts.length} items
                                </span>
                            </div>
                            <p className="text-gray-600 truncate">
                                Showing results for "{searchkey || 'all products'}"
                            </p>
                        </motion.div>

                        {/* Enhanced Controls Section */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* View Toggle */}
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all duration-200 ${
                                        viewMode === 'grid'
                                            ? 'bg-green-500 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <BsGrid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all duration-200 ${
                                        viewMode === 'list'
                                            ? 'bg-green-500 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <BsList className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Filter Button (Mobile) */}
                            <button
                                onClick={() => setShowFilters(true)}
                                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-sm"
                            >
                                <FiFilter className="w-4 h-4" />
                                Filters
                            </button>

                            {/* Desktop Filters */}
                            <div className="hidden lg:flex items-center gap-3">
                                <select 
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white shadow-sm"
                                >
                                    {categories.map(category => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </option>
                                    ))}
                                </select>

                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white shadow-sm"
                                >
                                    <option value="default">Sort by</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="discount">Highest Discount</option>
                                </select>
                            </div>
                        </div>
                    </div>


                    {/* Mobile Filters Modal */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="w-full max-w-sm rounded-xl p-6 bg-white shadow-2xl"
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-semibold text-gray-800">Filters</h3>
                                        <button
                                            onClick={() => setShowFilters(false)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-3 text-gray-700">Category</label>
                                            <select 
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                                            >
                                                {categories.map(category => (
                                                    <option key={category} value={category}>
                                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-3 text-gray-700">Sort By</label>
                                            <select 
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                                            >
                                                <option value="default">Sort by</option>
                                                <option value="price-low">Price: Low to High</option>
                                                <option value="price-high">Price: High to Low</option>
                                                <option value="discount">Highest Discount</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-3 text-gray-700">
                                                Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5000"
                                                value={priceRange[1]}
                                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="w-full mt-8 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
                                    >
                                        Apply Filters
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Products Grid/List */}
                    {selectedCategory === 'all' ? (
                        // Show categorized sections when "all" is selected
                        <div>
                            <CategorySection 
                                title="Fresh Vegetables" 
                                products={vegetables} 
                                category="Vegetables"
                                icon="🥕"
                                gradient="bg-gradient-to-br from-green-100 to-green-500"
                            />
                            <CategorySection 
                                title="Leafy Vegetables" 
                                products={leafyVegetables} 
                                category="Leafy Vegetables"
                                icon="🥬"
                                gradient="bg-gradient-to-br from-pink-100 to-pink-400"
                            />
                        </div>
                    ) : (
                        // Show single category when specific category is selected
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className={viewMode === 'grid' 
                                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                            : "space-y-4"
                        }
                    >
                            {filteredAndSortedProducts.map((item, idx) => (
                                <ProductCard key={item.id} item={item} viewMode={viewMode} index={idx} />
                            ))}
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {filteredAndSortedProducts.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-16"
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-100 to-pink-100 rounded-full flex items-center justify-center">
                                <FiFilter className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-gray-800">
                                No products found
                            </h2>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Try adjusting your search or filter criteria to find what you're looking for
                            </p>
                            <button
                                onClick={() => {
                                    setSelectedCategory('all');
                                    setSortBy('default');
                                    setSearchkey('');
                                    setPriceRange([0, 5000]);
                                }}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg"
                            >
                                Reset Filters
                            </button>
                        </motion.div>
                    )}
                </div>
            </section>
        </Layout>
    );
}

export default Allproducts;