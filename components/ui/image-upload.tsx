'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, X, ZoomIn, ImageIcon } from 'lucide-react';
import { Point, Area } from 'react-easy-crop';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  // Required props
  uploadUrl: string;
  onImageChange: (url: string) => void;
  
  // Optional props with defaults
  currentImageUrl?: string | null;
  deleteUrl?: string;
  maxFileSize?: number;
  allowedTypes?: string[];
  aspectRatio?: number;
  cropShape?: 'rect' | 'round';
  showGrid?: boolean;
  minZoom?: number;
  maxZoom?: number;
  
  // UI customization
  label?: string;
  description?: string;
  previewHeight?: string;
  previewClassName?: string;
  uploadButtonText?: string;
  changeButtonText?: string;
  removeButtonText?: string;
  dialogTitle?: string;
  uploadingText?: string;
  successMessage?: string;
  errorMessage?: string;
  tip?: string;
}

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
  uploadUrl,
  onImageChange,
  currentImageUrl = null,
  deleteUrl,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  aspectRatio = 1,
  cropShape = 'rect',
  showGrid = false,
  minZoom = 1,
  maxZoom = 3,
  label,
  description,
  previewHeight = 'h-32',
  previewClassName,
  uploadButtonText = 'Upload Image',
  changeButtonText = 'Change',
  removeButtonText = 'Remove',
  dialogTitle = 'Crop Image',
  uploadingText = 'Uploading...',
  successMessage = 'Image uploaded successfully',
  errorMessage = 'Failed to upload image',
  tip = 'Use the zoom slider and drag the image to perfectly position it',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  
  // react-easy-crop states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Please select a valid image file (${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')})`;
    }
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setShowCropDialog(true);
      // Reset crop settings for new image
      setCrop({ x: 0, y: 0 });
      setZoom(minZoom);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to the crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // For circular crops, we need to clip
    if (cropShape === 'round') {
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2,
        0,
        2 * Math.PI
      );
      ctx.clip();
    }

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl || !croppedAreaPixels) return;

    try {
      setIsUploading(true);

      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const formData = new FormData();
      formData.append('file', croppedBlob, selectedFile.name);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Try different possible response field names
      const imageUrl = data.url || data.logo_url || data.cover_url || data.image_url;
      
      if (imageUrl) {
        onImageChange(imageUrl);
        toast.success(successMessage);
        setShowCropDialog(false);
        resetState();
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!deleteUrl) {
      onImageChange('');
      return;
    }

    try {
      setIsUploading(true);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      onImageChange('');
      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(minZoom);
    setCroppedAreaPixels(null);
  };

  const inputId = `image-upload-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        {/* Image Preview */}
        <div className={cn(
          "relative w-full rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
          previewHeight,
          previewClassName,
          cropShape === 'round' && 'rounded-full'
        )}>
          {currentImageUrl ? (
            <>
              <Image
                src={currentImageUrl}
                alt="Uploaded image"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById(inputId)?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {changeButtonText}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  {removeButtonText}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadButtonText}
              </Button>
            </div>
          )}
        </div>
        
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className={aspectRatio > 2 ? "max-w-4xl" : "max-w-2xl"}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <>
                <div className="relative h-[400px] bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape={cropShape}
                    showGrid={showGrid}
                    restrictPosition={true}
                  />
                </div>
                
                {/* Zoom Control */}
                <div className="flex items-center gap-4">
                  <ZoomIn className="w-5 h-5 text-gray-500" />
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    max={maxZoom}
                    min={minZoom}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-12">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                
                {tip && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 Tip: {tip}
                    </p>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCropDialog(false);
                  resetState();
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !croppedAreaPixels}
              >
                {isUploading ? uploadingText : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}