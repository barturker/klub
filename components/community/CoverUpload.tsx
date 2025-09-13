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

interface CoverUploadProps {
  communityId: string;
  currentCoverUrl: string | null;
  onCoverChange: (url: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for cover images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ASPECT_RATIO = 4; // 4:1 aspect ratio for banner

export function CoverUpload({ communityId, currentCoverUrl, onCoverChange }: CoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  
  // react-easy-crop states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, GIF, or WebP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
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
      setZoom(1);
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

      const response = await fetch(`/api/communities/${communityId}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload cover image');
      }

      const data = await response.json();
      onCoverChange(data.cover_url);
      toast.success('Cover image uploaded successfully');
      setShowCropDialog(false);
      resetState();
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Failed to upload cover image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsUploading(true);

      const response = await fetch(`/api/communities/${communityId}/cover`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove cover image');
      }

      onCoverChange('');
      toast.success('Cover image removed successfully');
    } catch (error) {
      console.error('Error removing cover:', error);
      toast.error('Failed to remove cover image');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Cover Image</label>
        <p className="text-sm text-muted-foreground">
          Upload a wide banner image for your community page (recommended: 1920x480)
        </p>
        
        {/* Cover Preview */}
        <div className="relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          {currentCoverUrl ? (
            <>
              <Image
                src={currentCoverUrl}
                alt="Community cover"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
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
                onClick={() => document.getElementById('cover-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Cover Image
              </Button>
            </div>
          )}
        </div>
        
        <input
          id="cover-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop Cover Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <>
                <div className="relative h-[400px] bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={previewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={ASPECT_RATIO}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    showGrid={true}
                    restrictPosition={true}
                  />
                </div>
                
                {/* Zoom Control */}
                <div className="flex items-center gap-4">
                  <ZoomIn className="w-5 h-5 text-gray-500" />
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    max={3}
                    min={1}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-12">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 Tip: Use the zoom slider and drag the image to perfectly position your cover. The image will be cropped to a wide banner format.
                  </p>
                </div>
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
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}