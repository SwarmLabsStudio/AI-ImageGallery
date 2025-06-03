"use client"

import { useState } from "react"
import Image from "next/image"
import type { ImageGenerationResult } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, SortAsc, SortDesc } from "lucide-react"
import ImageModal from "./image-modal"
import { ImageIcon } from "lucide-react"
import { deleteImage } from "@/lib/baserow"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ImageGalleryProps {
  images: ImageGenerationResult[]
  isLoading: boolean
  onDelete?: (imageId: string) => void
}

export default function ImageGallery({ images, isLoading, onDelete }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageGenerationResult | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const { toast } = useToast()

  // Get unique categories from images and ensure no empty strings
  const categories = ["all", ...new Set(images.map(img => img.category || "Uncategorized"))]
    .filter(category => category.trim() !== "")

  // Filter and sort images
  const filteredAndSortedImages = [...images]
    .filter(image => selectedCategory === "all" || image.category === selectedCategory)
    .sort((a, b) => {
      const aId = Number(a.id);
      const bId = Number(b.id);
      return sortOrder === "newest" ? bId - aId : aId - bId;
    });

  const handleDelete = async (imageId: string) => {
    try {
      setDeletingId(imageId);
      await deleteImage(Number(imageId));
      
      toast({
        title: "Success",
        description: "Image deleted successfully",
        duration: 3000,
      });
      
      onDelete?.(imageId);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCardDelete = async (e: React.MouseEvent, image: ImageGenerationResult) => {
    e.stopPropagation();
    await handleDelete(image.id);
  };

  return (
    <div className="h-full">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
            Generated Images
          </h2>
          {isLoading && (
            <div className="flex items-center text-sm text-purple-600 bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-2 rounded-full">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating new image...
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-2"
            >
              {sortOrder === "newest" ? (
                <>
                  <SortDesc className="h-4 w-4" />
                  Newest First
                </>
              ) : (
                <>
                  <SortAsc className="h-4 w-4" />
                  Oldest First
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {filteredAndSortedImages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-purple-200 rounded-xl bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-700">No images found</h3>
            <p className="text-gray-500 text-sm max-w-[300px]">
              {selectedCategory === "all" 
                ? "Generate your first AI image to see it here"
                : "No images found in this category"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {filteredAndSortedImages.map((image, index) => (
            <Card
              key={image.id}
              className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-white via-purple-50/20 to-blue-50/20 border-purple-200/50 group relative"
              onClick={() => setSelectedImage(image)}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <Image
                    src={image.imageUrl || "/placeholder.svg"}
                    alt={image.prompt || "Generated image"}
                    fill
                    priority={index < 4}
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-purple-700 border-purple-200 backdrop-blur-sm"
                    >
                      {image.category}
                    </Badge>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => handleCardDelete(e, image)}
                    disabled={deletingId === image.id}
                  >
                    {deletingId === image.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {image.prompt || "Generated image"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ImageModal 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onDelete={handleDelete}
      />
    </div>
  )
}
