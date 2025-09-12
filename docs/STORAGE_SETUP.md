# Supabase Storage Setup for Community Branding

## Required Storage Buckets

### 1. Community Logos Bucket

**Bucket Name:** `community-logos`

**Settings:**
- Public: Yes (Allow public read access)
- Max file size: 5MB
- Allowed MIME types:
  - image/jpeg
  - image/png
  - image/webp
  - image/gif

**File naming convention:**
```
{community_id}/logo_{timestamp}.{ext}
```

### 2. Community Covers Bucket

**Bucket Name:** `community-covers`

**Settings:**
- Public: Yes (Allow public read access)
- Max file size: 10MB
- Allowed MIME types:
  - image/jpeg
  - image/png
  - image/webp
  - image/gif

**File naming convention:**
```
{community_id}/cover_{timestamp}.{ext}
```

## Setup Instructions

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Create `community-logos` bucket:
   - Name: `community-logos`
   - Public bucket: ✅ Enabled
   - File size limit: 5000000 (5MB)
   - Allowed MIME types: Add the types listed above
4. Create `community-covers` bucket:
   - Name: `community-covers`
   - Public bucket: ✅ Enabled
   - File size limit: 10000000 (10MB)
   - Allowed MIME types: Add the types listed above

## Storage Policies (RLS)

### For `community-logos` bucket:

```sql
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'community-logos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload logos" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'community-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their community logos
CREATE POLICY "Users can update own community logos" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'community-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their community logos
CREATE POLICY "Users can delete own community logos" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'community-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### For `community-covers` bucket:

```sql
-- Allow public read
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'community-covers');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload covers" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'community-covers' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their community covers
CREATE POLICY "Users can update own community covers" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'community-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their community covers
CREATE POLICY "Users can delete own community covers" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'community-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Next.js Configuration

Add Supabase storage domain to `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', ''),
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
```

## Upload Function Example

```typescript
import { createClient } from '@/lib/supabase/client';

export async function uploadCommunityLogo(
  communityId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const fileName = `${communityId}/logo_${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from('community-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('community-logos')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

## Image Optimization with Sharp

Server-side optimization example:

```typescript
import sharp from 'sharp';

export async function optimizeImage(
  buffer: Buffer,
  options: {
    width: number;
    height: number;
    format?: 'webp' | 'jpeg' | 'png';
  }
) {
  return sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'cover',
      position: 'center'
    })
    .toFormat(options.format || 'webp', {
      quality: 85
    })
    .toBuffer();
}
```

## Cleanup Strategy

Implement a cleanup function to remove old images when updating:

```typescript
export async function cleanupOldImages(
  communityId: string,
  bucketName: 'community-logos' | 'community-covers'
) {
  const supabase = createClient();
  
  // List all files in the community folder
  const { data: files } = await supabase.storage
    .from(bucketName)
    .list(communityId);

  if (!files || files.length <= 1) return;

  // Sort by created_at and keep only the latest
  const sortedFiles = files.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Delete all but the latest file
  const filesToDelete = sortedFiles.slice(1).map(f => `${communityId}/${f.name}`);
  
  if (filesToDelete.length > 0) {
    await supabase.storage
      .from(bucketName)
      .remove(filesToDelete);
  }
}
```

## Important Notes

1. **Manual Setup Required**: Storage buckets must be created manually in Supabase Dashboard
2. **CORS Configuration**: Ensure CORS is properly configured if uploading from client
3. **CDN Caching**: Public buckets are automatically served via CDN
4. **Rate Limiting**: Consider implementing rate limiting for uploads
5. **Virus Scanning**: For production, consider adding virus scanning service

## Testing Checklist

- [x] Buckets created in Supabase Dashboard
- [x] Upload policies working
- [x] Public read access working
- [ ] Image optimization working
- [ ] Old file cleanup working
- [ ] Next.js Image component displaying images
- [ ] Error handling for failed uploads
- [ ] File size validation
- [ ] MIME type validation