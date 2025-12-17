import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import myContext from '../../context/data/myContext';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../redux/cartSlice';
import { toast } from 'react-toastify';
import { ShoppingCart, Truck, CreditCard, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { imgDB } from '../../firebase/FirebaseConfig';
import { fireDB } from '../../firebase/FirebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { trackProductInteraction, trackCartAction, trackPageVisit } from '../../utils/userTracking';

// Add CSS to hide scrollbar and for marquee animation
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    display: flex;
    animation: marquee 30s linear infinite;
    will-change: transform;
  }
`;

function ProductCard() {
    const context = useContext(myContext);
    const { mode, product, searchkey } = context;
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart);
    const navigate = useNavigate();
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        // Add the styles to the document
        const styleSheet = document.createElement("style");
        styleSheet.innerText = scrollbarHideStyles;
        document.head.appendChild(styleSheet);

        return () => {
            // Clean up the styles when component unmounts
            document.head.removeChild(styleSheet);
        };
    }, []);

    // Fetch banners from Firebase Storage
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const bannerRef = ref(imgDB, 'banner/');
                const bannerList = await listAll(bannerRef);
                
                console.log('Found banners:', bannerList.items.length);
                
                const bannerUrls = await Promise.all(
                    bannerList.items.map(async (item) => {
                        const url = await getDownloadURL(item);
                        return url;
                    })
                );
                
                console.log('Banner URLs loaded:', bannerUrls.length);
                setBanners(bannerUrls);
            } catch (error) {
                console.error('Error fetching banners:', error);
            }
        };

        fetchBanners();
    }, []);

    // Auto-rotate banners
    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBannerIndex((prevIndex) => 
                    prevIndex === banners.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000); // Change banner every 5 seconds

            return () => clearInterval(interval);
        }
    }, [banners]);

    // Navigation functions for banner arrows
    const goToPreviousBanner = () => {
        console.log('Previous button clicked, current index:', currentBannerIndex, 'banners length:', banners.length);
        setCurrentBannerIndex((prevIndex) => 
            prevIndex === 0 ? banners.length - 1 : prevIndex - 1
        );
    };

    const goToNextBanner = () => {
        console.log('Next button clicked, current index:', currentBannerIndex, 'banners length:', banners.length);
        setCurrentBannerIndex((prevIndex) => 
            prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        );
    };

    // Load recently viewed products from localStorage and track page visit
    useEffect(() => {
        const stored = localStorage.getItem('recentlyViewed');
        if (stored) {
            setRecentlyViewed(JSON.parse(stored));
        }

        // Track page visit for home/products page
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userId = user?.user?.uid;
                if (userId) {
                    trackPageVisit(userId, {
                        page: 'home',
                        sessionStartTime: Date.now(),
                        sessionDuration: 0,
                        referrer: document.referrer || '',
                        sessionId: Date.now().toString()
                    });
                }
            } catch (err) {
                console.error('Error tracking page visit:', err);
            }
        }
    }, [product]);

    // Helper to add a product to recently viewed with tracking
    const addToRecentlyViewed = async (item) => {
        let viewed = localStorage.getItem('recentlyViewed');
        viewed = viewed ? JSON.parse(viewed) : [];
        // Remove if already exists
        viewed = viewed.filter(p => p.id !== item.id);
        // Add to front
        viewed.unshift(item);
        // Keep only last 5
        viewed = viewed.slice(0, 5);
        localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
        setRecentlyViewed(viewed);

        // Store in Firebase and track user interaction if user is logged in
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userId = user?.user?.uid;
                if (userId) {
                    // Save recently viewed for this user in Firestore
                    await setDoc(doc(fireDB, 'recentlyViewed', userId), {
                        products: viewed,
                        updatedAt: new Date().toISOString(),
                    });

                    // Track product interaction
                    await trackProductInteraction(userId, {
                        productId: item.id,
                        productName: item.title,
                        category: item.category,
                        price: item.price,
                        action: 'view'
                    });
                }
            } catch (err) {
                console.error('Error tracking product view:', err);
            }
        }
    };

    const addCart = async (product) => {
        // Set default quantity of 1 for leafy vegetables, 0.50 for regular vegetables
        const productToAdd = product.category === 'Leafy Vegetables' 
            ? { ...product, quantity: 1 }
            : { ...product, quantity: 0.50 };
        
        dispatch(addToCart(productToAdd));
        toast.success('Added to cart');

        // Track cart action if user is logged in
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userId = user?.user?.uid;
                if (userId) {
                    await trackCartAction(userId, {
                        action: 'add',
                        productId: product.id,
                        productName: product.title,
                        quantity: productToAdd.quantity,
                        price: product.price
                    });
                }
            } catch (err) {
                console.error('Error tracking cart action:', err);
            }
        }
    };

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const filteredProducts = product.filter((obj) =>
        obj.title.toLowerCase().includes(searchkey.toLowerCase())
    );

    const vegetables = filteredProducts
        .filter(item => item.category === 'Vegetables')
        .sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
    const leafyVegetables = filteredProducts
        .filter(item => item.category === 'Leafy Vegetables')
        .sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });

    // --- NEW: All images for horizontal scroll ---
    const allVegetableImages = product.filter(item => item.category === 'Vegetables' && item.imageUrl);
    const allLeafyImages = product.filter(item => item.category === 'Leafy Vegetables' && item.imageUrl);

    const calculateDiscount = (actualPrice, price) => {
        const discount = ((actualPrice - price) / actualPrice) * 100;
        return Math.round(discount);
    };

    const ProductContainer = ({ title, products }) => {
        return (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-extrabold mb-1 text-gray-900 bg-gradient-to-r from-pink-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                            {title}
                        </h1>
                        <div className="h-1 w-16 bg-pink-400 rounded"></div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate({ to: '/allproducts' });
                        }}
                        className="inline-flex items-center text-pink-500 hover:text-pink-600 text-sm font-semibold bg-pink-50 px-3 py-1.5 rounded-full shadow"
                    >
                        View All
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
                <div className="relative overflow-x-auto pb-3 scrollbar-hide scroll-smooth">
                    <div className="flex gap-3">
                        {products.map((item) => {
                            const { title, price, imageUrl, id, actualprice, category } = item;
                            const discountPercentage = calculateDiscount(actualprice, price);
                            return (
                                <div
                                    key={id}
                                    className="min-w-[150px] max-w-[170px] w-[150px] rounded-xl bg-white border border-gray-100 shadow-md hover:shadow-xl hover:scale-105 transition-all group flex flex-col"
                                >
                                    {/* Image Container - navigates to product info */}
                                    <div
                                        className="relative pt-[90%] overflow-hidden rounded-t-xl cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToRecentlyViewed(item);
                                            navigate({ to: `/productinfo/${id}` });
                                        }}
                                    >
                                        <img
                                            className="absolute top-0 left-0 w-full h-full object-cover rounded-t-xl group-hover:scale-105 transition-transform duration-200 shadow"
                                            src={imageUrl}
                                            alt={title}
                                        />
                                        {/* Discount Badge */}
                                        {discountPercentage > 0 && (
                                        <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-400 to-green-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow">
                                            {discountPercentage}% OFF
                                        </div>
                                        )}
                                    </div>
                                    {/* Content Container */}
                                    <div className="p-2 flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${category === 'Vegetables' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'}`}>{category}</span>
                                        </div>
                                        {/* Title - also navigates */}
                                        <h1
                                            className="text-base font-bold mb-1 truncate text-gray-900 cursor-pointer"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                addToRecentlyViewed(item);
                                                navigate({ to: `/productinfo/${id}` });
                                            }}
                                        >
                                            {title}
                                        </h1>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-bold text-green-600">₹{price}</span>
                                                {actualprice > price && (
                                                    <span className="text-xs text-gray-400 line-through">₹{actualprice}</span>
                                                )}
                                                <span className="text-xs text-gray-500">{category === 'Leafy Vegetables' ? '/pieces' : '/kg'}</span>
                                            </div>
                                        </div>
                                        {/* Add To Cart Button - only adds to cart */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addCart(item);
                                            }}
                                            className="w-full py-1.5 mt-auto bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center gap-1 font-semibold shadow transition-all hover:from-green-600 hover:to-green-700 text-sm"
                                        >
                                            <ShoppingCart className="w-4 h-4" /> Add To Cart
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // --- NEW: Horizontal image-only auto-looping scroller ---
    // Combine all vegetable and leafy vegetable images into one array with a divider
    const combinedImages = [
        ...allVegetableImages.map(item => ({ ...item, type: 'veg' })),
        { id: 'divider', type: 'divider' },
        ...allLeafyImages.map(item => ({ ...item, type: 'leafy' }))
    ];

    // Villages where vegetables are sourced from
    const villages = [
        'Yacharam',
        'Ibrahimpatnam',
        'Maheshwaram',
        'Shadnagar',
        'Kanakamamidi',
        'Injapur',
        'Shamshabad',
        'Shabad',
        'Konaipalle',
        'Chevella',
        'Shankarpalli'
    ];

    return (
        <div className="scroll-smooth">
            {/* Recently Viewed Products */}
            {recentlyViewed.length > 0 && (
                <div className="container mx-auto px-4 py-6">
                    <h2 className="text-2xl font-extrabold mb-1 text-gray-900 bg-gradient-to-r from-pink-400 via-green-400 to-blue-400 bg-clip-text text-transparent">Recently Viewed</h2>
                    <div className="h-1 w-16 bg-pink-400 rounded mb-4"></div>
                    <div className="relative">
                        <div className="overflow-x-auto scrollbar-hide">
                            <div className="flex gap-3 pb-4">
                        {recentlyViewed.map((item) => (
                            <div
                                key={item.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate({ to: `/productinfo/${item.id}` });
                                }}
                                        className="flex-none w-[160px] rounded-lg bg-white border border-gray-100 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer group"
                            >
                                        <div className="relative pt-[90%] overflow-hidden rounded-t-lg">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                        <div className="p-3">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.category === 'Vegetables' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {item.category}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{item.title}</h3>
                                            <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-green-600">₹{item.price}</span>
                                            {item.actualprice > item.price && (
                                                <span className="text-xs text-gray-400 line-through">₹{item.actualprice}</span>
                                            )}
                                            <span className="text-xs text-gray-500">{item.category === 'Leafy Vegetables' ? ' /pieces' : '/kg'}</span>
                                        </div>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                        {/* Gradient Shadows for scroll indication */}
                        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                    </div>
                </div>
            )}

            {/* Combined Images Auto-looping Scroller */}
            {combinedImages.length > 1 && (
                <div className="w-full py-3 mb-6 bg-gradient-to-r from-green-50 via-pink-50 to-blue-50 rounded-xl shadow-inner overflow-x-hidden relative">
                    {/* Marquee wrapper for seamless infinite scroll */}
                    <div
                        className="animate-marquee whitespace-nowrap flex items-center"
                        style={{ animationDuration: '30s', width: 'fit-content' }}
                    >
                        {/* Duplicate the images for seamless looping */}
                        {combinedImages.concat(combinedImages).map((item, idx) => (
                            item.type === 'divider' ? (
                                <div key={`divider-${idx}`} className="h-10 w-10 flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-gray-300 mx-4"></span>
                                </div>
                            ) : (
                                <img
                                    key={item.id + '-' + idx}
                                    src={item.imageUrl}
                                    alt={item.type === 'veg' ? 'Vegetable' : 'Leafy Vegetable'}
                                    className={`h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-full border-2 ${item.type === 'veg' ? 'border-green-200' : 'border-pink-200'} shadow mx-3 cursor-pointer hover:scale-110 transition-transform duration-200`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addToRecentlyViewed(item);
                                        navigate({ to: `/productinfo/${item.id}` });
                                    }}
                                />
                            )
                        ))}
                    </div>
                </div>
            )}

           
            {/* Feature bar at the top */}
            <div className="relative z-20 w-full flex justify-center">
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-4 bg-white rounded-xl shadow-md px-3 py-2 sm:px-6 sm:py-4 mt-3 mb-4 max-w-4xl mx-auto">
                    <div className="flex flex-row gap-2 justify-center sm:justify-start">
                        <div className="flex items-center gap-1 text-green-700 font-medium border-2 border-green-500 bg-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base">
                            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Home delivery</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-700 font-medium border-2 border-green-500 bg-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base">
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Cash on delivery</span>
                        </div>
                    </div>
                    <div className="flex justify-center mt-2 sm:mt-0">
                        <div className="flex items-center gap-1 text-green-700 font-medium border-2 border-green-500 bg-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-base">
                            <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Best Quality and Quantity</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Banner Section */}
            {banners.length > 0 && (
                <div className="w-full mb-6 relative overflow-hidden rounded-2xl shadow-lg">
                    <div className="relative h-64 sm:h-80 md:h-96">
                        {banners.map((banner, index) => (
                            <img
                                key={index}
                                src={banner}
                                alt={`Banner ${index + 1}`}
                                className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
                                    index === currentBannerIndex ? 'opacity-100' : 'opacity-0'
                                }`}
                            />
                        ))}
                        
                        {/* Banner overlay with gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                        
                        {/* Navigation arrows - only show if there are multiple banners */}
                        {banners.length > 1 && (
                            <>
                                {/* Previous arrow */}
                                <button
                                    onClick={goToPreviousBanner}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl group z-10"
                                >
                                    <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform duration-200" />
                                </button>
                                
                                {/* Next arrow */}
                                <button
                                    onClick={goToNextBanner}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl group z-10"
                                >
                                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform duration-200" />
                                </button>
                            </>
                        )}
                        
                        {/* Navigation dots */}
                        {banners.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {banners.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentBannerIndex(index)}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                            index === currentBannerIndex 
                                                ? 'bg-white scale-125' 
                                                : 'bg-white/50 hover:bg-white/75'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* Banner content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white">
                                
                              
                            </div>
                        </div>
                    </div>
                </div>
            )}
             {/* Villages Auto-scrolling Section */}
            <div className="w-full py-4 mb-6 bg-gradient-to-r from-green-100 via-yellow-100 to-orange-100 rounded-xl shadow-inner overflow-x-hidden relative">
                <div className="mb-3 text-center">
                    <h3 className="text-lg font-bold text-green-800 mb-1">🌱 Fresh From Our Partner Villages</h3>
                    <p className="text-sm text-green-600">Quality vegetables sourced directly from local farmers</p>
                </div>
                {/* Marquee wrapper for villages */}
                <div
                    className="animate-marquee whitespace-nowrap flex items-center"
                    style={{ animationDuration: '40s', width: 'fit-content' }}
                >
                    {/* Duplicate villages for seamless looping */}
                    {villages.concat(villages).map((village, idx) => (
                        <div
                            key={`${village}-${idx}`}
                            className="mx-3 bg-white rounded-xl shadow-lg border border-green-200 px-6 py-4 min-w-max hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <div className="flex items-center gap-3">
                                
                                <div>
                                    <h4 className="font-semibold text-green-800 text-sm">{village}</h4>
                                    <p className="text-xs text-green-600">Fresh Produce</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            <div className="container mx-auto px-4 py-8">
                {vegetables.length > 0 && (
                    <ProductContainer title="Fresh Vegetables" products={vegetables} />
                )}
                {leafyVegetables.length > 0 && (
                    <ProductContainer title="Leafy Vegetables" products={leafyVegetables} />
                )}
            </div>
        </div>
    );
}

export default ProductCard;