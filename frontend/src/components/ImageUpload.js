import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { X, Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
export const ImageUpload = ({ onImagesChange, multiple = false, maxImages = 5, existingImages = [] }) => {
  const [images, setImages] = useState(existingImages);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
  };
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    if (files.length === 0) {
      toast.error('Please drop image files only');
      return;
    }
    await processFiles(files);
  };
  const processFiles = async (files) => {
    if (!multiple && files.length > 1) {
      toast.error('Please select only one image');
      return;
    }
    if (multiple && images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    setUploading(true);
    const uploadedUrls = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now()}-${i}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API}/upload/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [fileId]: percentCompleted }));
          },
        });
        uploadedUrls.push(response.data.url);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
      const newImages = multiple ? [...images, ...uploadedUrls] : uploadedUrls;
      setImages(newImages);
      onImagesChange(newImages);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };
  return (
    <div className="space-y-3">
      {}
      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 ${
          dragActive 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        whileHover={{ scale: uploading ? 1 : 1.01 }}
        whileTap={{ scale: uploading ? 1 : 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
          disabled={uploading || (!multiple && images.length >= 1) || (multiple && images.length >= maxImages)}
        />
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{
              scale: dragActive ? 1.1 : 1,
              rotate: dragActive ? 5 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            {uploading ? (
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
            ) : (
              <Upload className={`h-12 w-12 mb-3 transition-colors ${
                dragActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
            )}
          </motion.div>
          <p className="text-sm font-medium mb-1">
            {uploading ? 'Uploading...' : dragActive ? 'Drop files here' : 'Drag & drop images here'}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            or click to browse
          </p>
          {multiple && (
            <p className="text-xs text-muted-foreground">
              {images.length}/{maxImages} images • Max {maxImages} files
            </p>
          )}
        </div>
        {}
        <AnimatePresence>
          {Object.keys(uploadProgress).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center"
            >
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm font-medium">Uploading files...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {images.map((img, index) => (
              <motion.div
                key={img}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-colors">
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  {}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transform"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 bg-green-500 rounded-full p-1"
                  >
                    <CheckCircle className="h-4 w-4 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};