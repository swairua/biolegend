# Supabase Storage Setup for Company Logos

## Storage Bucket Setup

To enable logo uploads, you need to create a storage bucket in your Supabase project:

### 1. Create the Storage Bucket

Go to your Supabase Dashboard > Storage and create a new bucket:

```sql
-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);
```

Or use the Supabase Dashboard:
1. Navigate to Storage
2. Click "Create bucket"
3. Name: `company-logos`
4. Make it public: ✅ (checked)
5. Click "Create"

### 2. Set up Storage Policies

Apply these Row Level Security (RLS) policies:

```sql
-- Policy to allow uploads for authenticated users
CREATE POLICY "Users can upload company logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow public read access
CREATE POLICY "Public read access for company logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- Policy to allow updates for authenticated users
CREATE POLICY "Users can update company logos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow delete for authenticated users
CREATE POLICY "Users can delete company logos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'company-logos');
```

### 3. Verify Setup

After setup, test the upload functionality:
1. Go to Company Settings
2. Click "Upload Logo"
3. Select an image file
4. Verify it uploads and displays correctly

The uploaded logo will be accessible at:
`https://[your-project].supabase.co/storage/v1/object/public/company-logos/[file-path]`

### File Organization

Files are stored with the pattern:
`company-{companyId}/logo-{timestamp}.{extension}`

This ensures:
- Each company has its own folder
- Logo files don't conflict
- Old logos are preserved (can be cleaned up separately)

## Troubleshooting

### Upload Fails
- Check if the bucket exists
- Verify storage policies are applied
- Ensure user is authenticated
- Check file size (5MB limit)
- Verify file type is an image

### Logo Not Displaying
- Check if the file uploaded successfully
- Verify the public URL is correct
- Check browser console for errors
- Ensure the bucket is set to public

### Storage Quota
- Monitor storage usage in Supabase Dashboard
- Consider implementing cleanup for old logo files
- Set up file size limits as needed
