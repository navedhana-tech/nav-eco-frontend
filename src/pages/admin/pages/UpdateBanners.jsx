import React, { useEffect, useState } from 'react';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { imgDB } from '../../../firebase/FirebaseConfig';
import { Image as ImageIcon, Trash2, Loader2, Plus } from 'lucide-react';

function UpdateBanners() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch all banners from Firebase Storage
    const fetchBanners = async () => {
        setLoading(true);
        try {
            const bannerFolderRef = ref(imgDB, 'banner');
            const res = await listAll(bannerFolderRef);
            const urlPromises = res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { url, name: itemRef.name, fullPath: itemRef.fullPath };
            });
            const urls = await Promise.all(urlPromises);
            setBanners(urls);
        } catch (err) {
            setError('Failed to fetch banners.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setImageFile(file);
        setSuccess('');
        setError('');
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    // Upload new banner
    const handleUpload = async () => {
        if (!imageFile) {
            setError('Please select an image to upload.');
            return;
        }
        setUploading(true);
        setError('');
        setSuccess('');
        try {
            const imageRef = ref(imgDB, `banner/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageRef, imageFile);
            setSuccess('Banner uploaded successfully!');
            setImageFile(null);
            setImagePreview(null);
            fetchBanners();
        } catch (err) {
            setError('Failed to upload banner.');
        } finally {
            setUploading(false);
        }
    };

    // Delete a banner
    const handleDelete = async (fullPath) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const bannerRef = ref(imgDB, fullPath);
            await deleteObject(bannerRef);
            setSuccess('Banner deleted successfully!');
            fetchBanners();
        } catch (err) {
            setError('Failed to delete banner.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-blue-50 py-8 px-2 flex flex-col items-center">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-8 mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-blue-900 text-center">Update Banners</h2>
                {/* Upload Section */}
                <div className="mb-8 flex flex-col items-center">
                    <label className="w-full cursor-pointer">
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed ${imagePreview ? 'border-blue-500' : 'border-blue-200'} rounded-lg h-48 bg-blue-50 transition-all duration-200 w-full max-w-md`}>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <>
                                    <ImageIcon className="w-12 h-12 text-blue-400" />
                                    <span className="mt-2 text-sm text-blue-500">Click or drag to upload new banner</span>
                                </>
                            )}
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    <button
                        onClick={handleUpload}
                        className={`mt-4 flex items-center px-6 py-2 rounded-lg text-white font-semibold ${uploading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} transition`}
                        disabled={uploading}
                    >
                        {uploading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...</>) : (<><Plus className="w-5 h-5 mr-2" /> Upload Banner</>)}
                    </button>
                    {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
                    {success && <div className="mt-2 text-green-600 text-sm">{success}</div>}
                </div>
                {/* Banner List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center items-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                    ) : banners.length === 0 ? (
                        <div className="col-span-full text-center text-blue-500">No banners found.</div>
                    ) : (
                        banners.map((banner) => (
                            <div key={banner.name} className="relative group rounded-xl shadow bg-blue-100 p-3 flex flex-col items-center">
                                <img src={banner.url} alt={banner.name} className="w-full h-40 object-cover rounded-lg mb-2" />
                                <div className="flex justify-center gap-2 mt-2">
                                    <button
                                        onClick={() => handleDelete(banner.fullPath)}
                                        className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold shadow flex items-center"
                                        title="Delete banner"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default UpdateBanners; 