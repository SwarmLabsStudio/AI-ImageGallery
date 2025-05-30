"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ImageGenerationResult } from "@/lib/types"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Download, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { deleteImage } from "@/lib/baserow"
import { useState } from "react"

interface ImageModalProps {
  image: ImageGenerationResult | null
  onClose: () => void
  onDelete?: (imageId: string) => void
}

export default function ImageModal({ image, onClose, onDelete }: ImageModalProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  
  if (!image) return null

  const formattedDate = formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })

  const handleDelete = async () => {
    if (!image.id || !onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete(image.id);
      onClose();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      // First try to fetch the image directly
      const response = await fetch(image.imageUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get the file extension from the content type or default to .png
      const contentType = response.headers.get('content-type');
      const extension = contentType?.split('/')[1] || 'png';
      
      a.download = `generated-image-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Image downloaded successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Error",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 border-purple-200">
        <DialogTitle className="sr-only">Image Details</DialogTitle>
        <div className="grid md:grid-cols-[2fr_1fr]">
          <div className="relative aspect-square bg-black">
            <Image
              src={image.imageUrl || "/placeholder.svg"}
              alt={image.prompt || "Generated image"}
              fill
              priority
              className="object-contain"
            />
          </div>
          <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-lg text-gray-800">Category</h3>
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">{image.category}</Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Prompt</h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-purple-100">
                {image.prompt || "No prompt provided"}
              </p>
            </div>
            {image.agentPrompt && (
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">Agent Prompt</h3>
                <div className="max-h-[100px] overflow-y-auto">
                  <p className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-purple-100">
                    {image.agentPrompt}
                  </p>
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Created</h3>
              <p className="text-sm text-purple-600 bg-purple-100/50 px-3 py-2 rounded-lg mb-4">{formattedDate}</p>
              <div className="flex items-center gap-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
