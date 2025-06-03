"use client"

import { useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"
import PromptPanel from "@/components/prompt-panel"
import ImageGallery from "@/components/image-gallery"
import { useImages } from "@/hooks/useImages"
import type { ImageGenerationResult } from "@/lib/types"

export default function Home() {
  const [generatedImages, setGeneratedImages] = useState<ImageGenerationResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const { images: existingImages, isLoading: isLoadingExisting, error, refresh } = useImages()

  // Get unique categories from existing images
  const existingCategories = [...new Set(existingImages.map(img => img.category))]

  // Set up periodic refresh while generating
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isGenerating) {
      intervalId = setInterval(() => {
        refresh();
      }, 2000); // Refresh every 2 seconds while generating
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGenerating, refresh]);

  const handleNewImage = async (image: ImageGenerationResult) => {
    setGeneratedImages((prev) => [image, ...prev]);
    // Trigger an immediate refresh
    refresh();
    
    // Schedule a few more refreshes to ensure we catch the update
    const refreshTimes = [2000, 4000, 6000]; // Refresh after 2, 4, and 6 seconds
    for (const delay of refreshTimes) {
      setTimeout(() => {
        refresh();
      }, delay);
    }
  }

  const handleDelete = (imageId: string) => {
    // Remove from generated images if it exists there
    setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    // Refresh to update the list from Baserow
    refresh();
  }

  // Combine both generated and existing images
  const allImages = [
    ...generatedImages,
    ...existingImages.map(img => ({
      id: String(img.id),
      imageUrl: img['image-url'],
      prompt: img['user-pompt'] || '',
      category: img.category,
      createdAt: img.createdon,
      agentPrompt: img['agent-prompt'] || ''
    }))
  ]

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        <PromptPanel 
          onGenerateImage={handleNewImage} 
          setIsGenerating={setIsGenerating} 
          isGenerating={isGenerating}
          existingCategories={existingCategories}
        />
        <div className="space-y-6">
          <ImageGallery 
            images={allImages} 
            isLoading={isGenerating} 
            onDelete={handleDelete}
          />
        </div>
      </div>
    </main>
  )
}
