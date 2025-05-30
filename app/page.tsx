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
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <header className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
            AI Image Gallery
          </h1>
          <p className="text-purple-100 mt-2">Create stunning images with AI using text and visual prompts</p>
        </div>
      </header>

      <div className="container mx-auto px-8 flex-1 flex flex-col md:flex-row gap-6 py-8">
        <div className="md:w-1/3 lg:w-1/4">
          <PromptPanel onGenerateImage={handleNewImage} setIsGenerating={setIsGenerating} isGenerating={isGenerating} />
        </div>

        <Separator orientation="vertical" className="hidden md:block bg-gradient-to-b from-purple-200 to-blue-200" />
        <Separator className="md:hidden bg-gradient-to-r from-purple-200 to-blue-200" />

        <div className="md:w-2/3 lg:w-3/4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <ImageGallery 
            images={allImages} 
            isLoading={isGenerating || isLoadingExisting}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </main>
  )
}
