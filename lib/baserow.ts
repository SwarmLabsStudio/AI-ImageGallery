import axios from 'axios';

const BASEROW_API_TOKEN = process.env.NEXT_PUBLIC_BASEROW_API_TOKEN;
const IMAGES_TABLE_ID = process.env.NEXT_PUBLIC_BASEROW_IMAGES_TABLE_ID || '693';

// Log environment variables on initialization
console.log('Baserow Configuration:');
console.log('Table ID:', IMAGES_TABLE_ID);
console.log('API Token:', BASEROW_API_TOKEN ? 'Set' : 'Not Set');

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

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Function to transform Docker internal URLs to our proxy URLs
function transformImageUrl(url: string): string {
  if (!url) return url;
  
  // Extract the media path from the Docker internal URL
  const match = url.match(/\/media\/(.+)$/);
  if (!match) return url;
  
  // Return the URL that points to our proxy
  return `/api/baserow/media?path=${encodeURIComponent(match[1])}`;
}

// Function to map Baserow fields to our interface
function mapBaserowFields(rawData: any): BaserowImage {
  return {
    id: rawData.id,
    order: rawData.order,
    image: rawData.field_6699 || [],
    'user-pompt': rawData.field_6700 || '',
    'agent-prompt': rawData.field_6701 || '',
    category: rawData.field_6702 || '',
    createdon: rawData.field_6703 || '',
    seed: rawData.field_6704 || '',
    'image-url': transformImageUrl(rawData.field_6705) || ''
  };
}

export async function fetchImages(page = 1, size = 100): Promise<BaserowImage[]> {
  try {
    console.log('Attempting to fetch images...');
    
    const response = await api.get(`/api/baserow`, {
      params: {
        tableId: IMAGES_TABLE_ID,
        page,
        size
      }
    });
    
    console.log('Response received:', response.status);
    console.log('Raw response data:', JSON.stringify(response.data, null, 2));
    
    // Transform the image URLs in the response
    const images = response.data.results || [];
    console.log('First image data:', JSON.stringify(images[0], null, 2));
    
    const transformedImages = images.map((image: any) => {
      const transformed = mapBaserowFields(image);
      console.log('Transformed image:', JSON.stringify(transformed, null, 2));
      return transformed;
    });
    
    return transformedImages;
  } catch (error) {
    console.error('Error fetching images from Baserow:', error);
    if (axios.isAxiosError(error) && error.config) {
      console.error('Full error details:');
      console.error('- Response data:', error.response?.data);
      console.error('- Response status:', error.response?.status);
      console.error('- Response headers:', error.response?.headers);
      console.error('- Full URL:', (error.config.baseURL || '') + (error.config.url || ''));
      console.error('- Request headers:', JSON.stringify(error.config.headers, null, 2));
      
      if (error.response?.data?.error) {
        console.error('- Error message:', error.response.data.error);
      }
    }
    throw error;
  }
}

export async function deleteImage(id: number): Promise<void> {
  try {
    console.log('Attempting to delete image:', id);
    console.log('Using table ID:', IMAGES_TABLE_ID);
    
    // Test the API routing first
    try {
      const testResponse = await api.delete(`/api/test?tableId=${IMAGES_TABLE_ID}&rowId=${id}`);
      console.log('Test route response:', testResponse.data);
    } catch (testError) {
      console.error('Test route failed:', testError);
    }
    
    const deleteUrl = `/api/baserow?tableId=${IMAGES_TABLE_ID}&rowId=${id}`;
    console.log('Making delete request to:', deleteUrl);
    
    const response = await api.delete(deleteUrl);
    
    console.log('Delete response:', {
      status: response.status,
      data: response.data,
      headers: response.headers,
      url: response.config?.url
    });
    
    // 204 is the expected status code for a successful DELETE operation
    if (response.status === 204) {
      console.log('Delete successful');
      return;
    }
    
    // If we get here, something unexpected happened
    console.error('Delete failed with unexpected status:', response.status);
    console.error('Response data:', response.data);
    throw new Error(`Failed to delete image. Status: ${response.status}`);
  } catch (error) {
    console.error('Error deleting image from Baserow:', error);
    if (axios.isAxiosError(error) && error.response) {
      // If we get a 204, the delete was actually successful despite the error
      if (error.response.status === 204) {
        console.log('Delete successful (204 status code)');
        return;
      }
      
      console.error('Error details:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
          baseURL: error.config?.baseURL
        }
      });
    }
    throw error;
  }
} 