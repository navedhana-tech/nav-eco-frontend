import React, { useContext, useState, useEffect } from 'react';
import myContext from '../../../context/data/myContext';
import { Package, IndianRupee, Tags, FileText, Image as ImageIcon, ArrowLeft, Loader2, Save, Upload, Edit3 } from 'lucide-react';
import { useNavigate, useParams, Link } from '@tanstack/react-router';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { imgDB } from '../../../firebase/FirebaseConfig';
import Loader from '../../../components/loader/Loader';

function UpdateProduct() {
    try {
        const context = useContext(myContext);
        const { product, updateProduct, mode } = context;
        const navigate = useNavigate();
        
        let id;
        try {
            const params = useParams();
            id = params.id;
        } catch (error) {
            console.error("Error getting params:", error);
        }
        
        // Fallback to URL parsing if useParams doesn't work
        const urlId = window.location.pathname.split('/').pop();
        const productId = id || urlId;

        // Helper function for navigation with fallback
        const handleNavigation = (path) => {
            console.log("Attempting to navigate to:", path);
            // Use window.location for now as it's more reliable
            window.location.href = path;
        };
    const [errors, setErrors] = useState({});
    const [imagePreview, setImagePreview] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [productData, setProductData] = useState({
        title: '',
        price: '',
        category: '',
        description: '',
        weight: '',
        imageUrl: '',
        actualPrice: ''
    });
    
    // Find the product by ID when component mounts
    useEffect(() => {
        console.log("UpdateProduct useEffect - id from useParams:", id);
        console.log("UpdateProduct useEffect - urlId from URL:", urlId);
        console.log("UpdateProduct useEffect - final productId:", productId);
        console.log("UpdateProduct useEffect - product length:", product.length);
        if (productId && product.length > 0) {
            const foundProduct = product.find(p => p.id === productId);
            console.log("Found product:", foundProduct);
            if (foundProduct) {
                setProductData({
                    id: foundProduct.id,
                    title: foundProduct.title || '',
                    price: foundProduct.price || '',
                    category: foundProduct.category || '',
                    description: foundProduct.description || '',
                    weight: foundProduct.weight || '',
                    imageUrl: foundProduct.imageUrl || '',
                    actualPrice: foundProduct.actualPrice || ''
                });
                setImagePreview(foundProduct.imageUrl || '');
            } else {
                // Product not found, redirect to dashboard
                console.log("Product not found, redirecting to dashboard");
                handleNavigation('/dashboard');
            }
        }
    }, [productId, product, navigate]);

    // Show loading if product data is not loaded yet
    if (product.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    // Show error if product not found
    if (id && !product.find(p => p.id === id)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
                    <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
                    <button
                        onClick={() => handleNavigation('/dashboard')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const categories = [
        'Vegetables',
        'Fruits',
        'Leafy Greens',
        'Leafy Vegetables',
        'Root Vegetables',
        'Exotic Vegetables',
        'Organic Products'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProductData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async () => {
        if (!imageFile) return null;
        const imageRef = ref(imgDB, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        return await getDownloadURL(imageRef);
    };

    const validate = () => {
        const newErrors = {};
        if (!productData.title) newErrors.title = 'Product name is required.';
        if (!productData.price) newErrors.price = 'Price is required.';
        if (!productData.category) newErrors.category = 'Category is required.';
        if (!productData.imageUrl && !imageFile) newErrors.imageUrl = 'Product image is required.';
        if (productData.actualPrice && Number(productData.actualPrice) < Number(productData.price)) newErrors.actualPrice = 'Original price should be greater than or equal to selling price.';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submit triggered with productData:", productData);
        console.log("Image file:", imageFile);
        
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            console.log("Validation errors:", validationErrors);
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        setErrors({});
        try {
            let finalImageUrl = productData.imageUrl; // Keep existing image URL by default
            console.log("Initial image URL:", finalImageUrl);
            
            // If a new image was uploaded, upload it and get the new URL
            if (imageFile) {
                console.log("Uploading new image...");
                const newImageUrl = await uploadImage();
                if (newImageUrl) {
                    finalImageUrl = newImageUrl;
                    console.log("New image URL:", finalImageUrl);
                } else {
                    setErrors({ submit: 'Failed to upload image. Please try again.' });
                    setLoading(false);
                    return;
                }
            }
            
            // Update product with final image URL
            const updatedProduct = {
                ...productData,
                imageUrl: finalImageUrl,
                actualprice: productData.actualPrice || productData.actualprice
            };
            
            console.log("Calling updateProduct with:", updatedProduct);
            await updateProduct(updatedProduct);
            setSuccess(true);
            setTimeout(() => {
                handleNavigation('/dashboard');
            }, 2000);
        } catch (error) {
            console.log("Error in handleSubmit:", error);
            setErrors({ submit: 'Failed to update product. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <Link
                            to="/dashboard"
                            className="flex items-center px-4 py-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-gray-700 hover:text-blue-600 border border-gray-100"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Dashboard
                        </Link>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                                Update Product
                            </h1>
                            <p className="text-gray-600 mt-1">Modify product information</p>
                        </div>
                        <div className="w-24"></div> {/* Spacer for centering */}
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-green-600 px-8 py-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                                <Edit3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Update Product Information</h2>
                                <p className="text-blue-100">Modify the details below to update your product</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Image Upload Section */}
                        <div className="space-y-4">
                            <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                                Product Image *
                            </label>
                            <div className="flex justify-center">
                                <div className={`w-full max-w-md h-64 relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
                                    imagePreview 
                                        ? 'border-green-300 bg-green-50' 
                                        : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                                } ${errors.imageUrl ? 'border-red-300 bg-red-50' : ''}`}>
                                    {imagePreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                                            <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <div className="bg-white/90 rounded-xl p-3">
                                                    <Upload className="w-6 h-6 text-blue-600" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-6">
                                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                                                <ImageIcon className="w-8 h-8 text-blue-600" />
                                            </div>
                                            <p className="text-lg font-medium text-gray-700 mb-2">Update Product Image</p>
                                            <p className="text-sm text-gray-500 text-center">Click or drag to upload a new image</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageChange} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    />
                                </div>
                            </div>
                            {errors.imageUrl && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                    {errors.imageUrl}
                                </p>
                            )}
                        </div>

                        {/* Product Details Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Product Name */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                                    Product Name *
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="title" 
                                        value={productData.title || ''} 
                                        onChange={handleInputChange} 
                                        className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                                            errors.title 
                                                ? 'border-red-300 bg-red-50 focus:border-red-500' 
                                                : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                                        } focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500`} 
                                        placeholder="Enter product name" 
                                    />
                                    {errors.title && (
                                        <p className="text-red-500 text-sm mt-2 flex items-center">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                            {errors.title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                    <Tags className="w-5 h-5 mr-2 text-blue-600" />
                                    Category *
                                </label>
                                <div className="relative">
                                    <select 
                                        name="category" 
                                        value={productData.category || ''} 
                                        onChange={handleInputChange} 
                                        className={`w-full px-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                                            errors.category 
                                                ? 'border-red-300 bg-red-50 focus:border-red-500' 
                                                : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                                        } focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900`}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                    {errors.category && (
                                        <p className="text-red-500 text-sm mt-2 flex items-center">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                            {errors.category}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Price */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                    <IndianRupee className="w-5 h-5 mr-2 text-blue-600" />
                                    Price (₹) *
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</div>
                                    <input 
                                        type="number" 
                                        name="price" 
                                        value={productData.price || ''} 
                                        onChange={handleInputChange} 
                                        className={`w-full pl-8 pr-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                                            errors.price 
                                                ? 'border-red-300 bg-red-50 focus:border-red-500' 
                                                : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                                        } focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500`} 
                                        placeholder="0.00" 
                                        step="0.01"
                                        min="0"
                                    />
                                    {errors.price && (
                                        <p className="text-red-500 text-sm mt-2 flex items-center">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                            {errors.price}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Weight */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                                    Weight (kg)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="weight" 
                                        value={productData.weight || ''} 
                                        onChange={handleInputChange} 
                                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500 transition-all duration-300" 
                                        placeholder="0.00" 
                                        step="0.01" 
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Original Price (MRP) */}
                            <div className="space-y-3">
                                <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                    <IndianRupee className="w-5 h-5 mr-2 text-blue-600" />
                                    Original Price (MRP)
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</div>
                                    <input
                                        type="number"
                                        name="actualPrice"
                                        value={productData.actualPrice || ''}
                                        onChange={handleInputChange}
                                        className={`w-full pl-8 pr-4 py-4 rounded-xl border-2 transition-all duration-300 ${
                                            errors.actualPrice 
                                                ? 'border-red-300 bg-red-50 focus:border-red-500' 
                                                : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                                        } focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500`} 
                                        placeholder="0.00" 
                                        step="0.01"
                                        min="0"
                                    />
                                    {errors.actualPrice && (
                                        <p className="text-red-500 text-sm mt-2 flex items-center">
                                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                            {errors.actualPrice}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <label className="block text-lg font-semibold text-gray-800 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Description
                            </label>
                            <div className="relative">
                                <textarea 
                                    name="description" 
                                    value={productData.description || ''} 
                                    onChange={handleInputChange} 
                                    rows="4" 
                                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500 transition-all duration-300 resize-none" 
                                    placeholder="Enter product description..." 
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4 pt-6">
                            <Link 
                                to="/dashboard"
                                className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-lg hover:bg-gray-200 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 inline-block text-center"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit" 
                                disabled={loading} 
                                className={`flex items-center px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                                    loading 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg hover:shadow-xl'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-6 h-6 mr-3" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                        {errors.submit && (
                            <p className="text-red-500 text-sm text-center flex items-center justify-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                {errors.submit}
                            </p>
                        )}
                        
                        {success && (
                            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                                <div className="flex items-center justify-center mb-2">
                                    <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className="text-green-800 font-semibold">Product Updated Successfully!</p>
                                </div>
                                <p className="text-green-600 text-sm">Redirecting to dashboard...</p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
    } catch (error) {
        console.error("Error in UpdateProduct component:", error);
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Product</h2>
                    <p className="text-gray-600 mb-4">There was an error loading the product update page.</p>
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }
}

export default UpdateProduct;