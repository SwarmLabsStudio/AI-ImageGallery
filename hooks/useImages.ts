import { useState, useEffect, useCallback } from 'react';
import { fetchImages } from '@/lib/baserow';

interface BaserowThumbnail {
  url: string;
  width: number;
  height: number;
}

interface BaserowImageFile {
  url: string;
  thumbnails: {
    tiny: BaserowThumbnail;
    small: BaserowThumbnail;
  };
  name: string;
  size: number;
  mime_type: string;
  is_image: boolean;
  image_width: number;
  image_height: number;
  uploaded_at: string;
}

interface BaserowImage {
  id: number;
  order: string;
  image: BaserowImageFile[];
  'user-pompt': string;
  'agent-prompt': string;
  category: string;
  createdon: string;
  seed: string;
  'image-url': string;
}

export function useImages() {
  const [images, setImages] = useState<BaserowImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    async function loadImages() {
      try {
        setIsLoading(true);
        const fetchedImages = await fetchImages();
        setImages(fetchedImages);
        setError(null);
      } catch (err) {
        setError('Failed to fetch images');
        console.error('Error loading images:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadImages();
  }, [version]);

  return { images, isLoading, error, refresh };
} 