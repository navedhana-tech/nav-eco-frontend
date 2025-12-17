import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { imgDB } from '../../../firebase/FirebaseConfig';
import { Image as ImageIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';

function ImageUploader({ folder, onUploadComplete }) {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setImageFile(file);
        setSuccess(false);
        setError('');
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const handleUpload = async () => {
        if (!imageFile) {
            setError("Please select an image file to upload.");
            return;
        }
        setUploading(true);
        setError('');
        setSuccess(false);
        const imageRef = ref(imgDB, `${folder}/${imageFile.name}`);
        try {
            await uploadBytes(imageRef, imageFile);
            const downloadUrl = await getDownloadURL(imageRef);
            setSuccess(true);
            setError('');
            onUploadComplete(downloadUrl); // Notify parent component
        } catch (err) {
            setError("Failed to upload image. Please try again.");
            setSuccess(false);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-8 px-2">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mx-auto">
                <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-white">Upload Image</h2>
                <div className="mb-4 flex flex-col items-center">
                    <label className="w-full cursor-pointer">
                        <div className={`flex flex-col items-center justify-center border-2 border-dashed ${imagePreview ? 'border-green-500' : 'border-gray-300'} rounded-lg h-48 bg-gray-50 dark:bg-gray-700 transition-all duration-200`}>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <>
                                    <ImageIcon className="w-12 h-12 text-gray-400" />
                                    <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click or drag to upload</span>
                                </>
                            )}
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
                {error && (
                    <div className="flex items-center gap-2 mb-2 text-red-600 bg-red-100 rounded px-3 py-2">
                        <XCircle className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 mb-2 text-green-700 bg-green-100 rounded px-3 py-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm">Image uploaded successfully.</span>
                    </div>
                )}
            <button
                onClick={handleUpload}
                    className={`w-full flex items-center justify-center px-6 py-3 rounded-lg text-white font-semibold ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} transition`}
                disabled={uploading}
            >
                    {uploading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...</>) : 'Upload Image'}
            </button>
            </div>
        </div>
    );
}

export default ImageUploader;
