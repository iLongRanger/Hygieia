import { useCallback, useEffect, useState } from 'react';
import { Camera, ExternalLink, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiErrorMessage } from '../../lib/api';
import {
  archivePhotoAsset,
  getPhotoViewUrl,
  listPhotoAssets,
  uploadPhotoAsset,
} from '../../lib/photos';
import type { PhotoAsset, PhotoCategory, PhotoTargetType } from '../../types/photo';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const PHOTO_CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'parking', label: 'Parking' },
  { value: 'access', label: 'Access' },
  { value: 'walkthrough', label: 'Walkthrough' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'issue', label: 'Issue' },
];

interface PhotoGalleryCardProps {
  targetType: PhotoTargetType;
  targetId: string;
  title?: string;
  description?: string;
}

const formatBytes = (sizeBytes: number): string => {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function PhotoGalleryCard({
  targetType,
  targetId,
  title = 'Photos',
  description = 'Upload photos for this record. Files are stored in Cloudflare R2 and linked here.',
}: PhotoGalleryCardProps) {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<PhotoCategory>('general');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPhotoAssets({ targetType, targetId });
      setPhotos(data);
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to load photos'));
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Choose a photo first');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      toast.error('Upload a JPG, PNG, or WebP image');
      return;
    }

    try {
      setUploading(true);
      await uploadPhotoAsset(
        {
          targetType,
          targetId,
          category,
          caption: caption.trim() || null,
        },
        selectedFile
      );
      setSelectedFile(null);
      setCaption('');
      toast.success('Photo uploaded');
      await loadPhotos();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to upload photo'));
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (photoId: string) => {
    try {
      const { url } = await getPhotoViewUrl(photoId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to open photo'));
    }
  };

  const handleArchive = async (photoId: string) => {
    try {
      await archivePhotoAsset(photoId);
      toast.success('Photo removed');
      await loadPhotos();
    } catch (error) {
      toast.error(extractApiErrorMessage(error, 'Failed to remove photo'));
    }
  };

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/40">
          <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
            <Select
              label="Category"
              value={category}
              options={PHOTO_CATEGORIES}
              onChange={(value) => setCategory(value as PhotoCategory)}
            />
            <Input
              label="Photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Textarea
            label="Caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={2}
            className="mt-3"
            placeholder="Optional note for this photo"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={handleUpload} isLoading={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-xl skeleton" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 p-8 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
            No photos uploaded yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold capitalize text-surface-900 dark:text-white">
                      {photo.category.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                      {photo.originalFilename || 'Photo'} - {formatBytes(photo.sizeBytes)}
                    </div>
                  </div>
                  <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                    {photo.status}
                  </span>
                </div>
                {photo.caption ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-surface-600 dark:text-surface-300">
                    {photo.caption}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleOpen(photo.id)}>
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(photo.id)}>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
