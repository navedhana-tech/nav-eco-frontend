import React, { useContext, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { toast } from 'react-toastify';
import { 
    Package, 
    IndianRupee, 
    Tags, 
    FileText, 
    Image as ImageIcon,
    ArrowLeft,
    Loader2,
    Upload,
    Plus,
    CheckCircle
} from 'lucide-react';
import myContext from '../../../context/data/myContext';
import { fireDB, imgDB } from '../../../firebase/FirebaseConfig';
import Loader from '../../../components/loader/Loader';

function AddProduct() {
    const navigate = useNavigate();
    const context = useContext(myContext);
    const { mode, addProduct } = context;

    const [formProduct, setFormProduct] = useState({
        title: '',
        price: '',
        category: '',
        description: '',
        weight: '',
        actualPrice: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const categories = [
        'Vegetables',
        'Fruits',
        'Leafy Greens',
        'Leafy Vegetables',
        'Root Vegetables',
        'Exotic Vegetables',
        'Organic Products'
    ];

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormProduct(prev => ({
            ...prev,
            [name]: value
        }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formProduct.title) newErrors.title = 'Product name is required.';
        if (!formProduct.price) newErrors.price = 'Price is required.';
        if (!formProduct.category) newErrors.category = 'Category is required.';
        if (!imageFile) newErrors.image = 'Product image is required.';
        if (formProduct.actualPrice && Number(formProduct.actualPrice) < Number(formProduct.price)) newErrors.actualPrice = 'Original price should be greater than or equal to selling price.';
        return newErrors;
    };

    const uploadImage = async () => {
        if (!imageFile) return null;
        const imageRef = ref(imgDB, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        return await getDownloadURL(imageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        try {
            const imageUrl = await uploadImage();
            if (!imageUrl) {
                setErrors(prev => ({ ...prev, image: 'Failed to upload image.' }));
                setLoading(false);
                return;
            }
            
            const newProduct = {
                ...formProduct,
                imageUrl,
                actualprice: formProduct.actualPrice || formProduct.price,
            };
            
            await addProduct(newProduct);
            toast.success('Product added successfully!');
            navigate('/dashboard');
        } catch (error) {
            toast.error('Failed to add product');
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
                    <button
                        onClick={() => navigate('/dashboard')}
                            className="flex items-center px-4 py-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-gray-700 hover:text-blue-600 border border-gray-100"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </button>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                        Add New Product
                    </h1>
                            <p className="text-gray-600 mt-1">Create a new product listing</p>
                        </div>
                        <div className="w-24"></div> {/* Spacer for centering */}
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-green-600 px-8 py-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Product Information</h2>
                                <p className="text-blue-100">Fill in the details below to add your product</p>
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
                                } ${errors.image ? 'border-red-300 bg-red-50' : ''}`}>
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
                                            <p className="text-lg font-medium text-gray-700 mb-2">Upload Product Image</p>
                                            <p className="text-sm text-gray-500 text-center">Click or drag to upload your product image</p>
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
                            {errors.image && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                    {errors.image}
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
                                        value={formProduct.title}
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
                                        value={formProduct.category}
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
                                        value={formProduct.price}
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
                                        value={formProduct.weight}
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
                                        value={formProduct.actualPrice}
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
                                    value={formProduct.description}
                                    onChange={handleInputChange}
                                    rows="4"
                                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 text-gray-900 placeholder-gray-500 transition-all duration-300 resize-none" 
                                    placeholder="Enter product description..." 
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center pt-6">
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
                                        Adding Product...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-6 h-6 mr-3" />
                                        Add Product
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AddProduct;
