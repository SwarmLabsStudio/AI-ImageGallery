"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon, Loader2, UploadIcon, XIcon } from "lucide-react"
import { generateImage } from "@/lib/actions"
import type { ImageGenerationResult } from "@/lib/types"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"

interface PromptPanelProps {
  onGenerateImage: (image: ImageGenerationResult) => void
  setIsGenerating: (isGenerating: boolean) => void
  isGenerating: boolean
}

export default function PromptPanel({ onGenerateImage, setIsGenerating, isGenerating }: PromptPanelProps) {
  const { toast } = useToast()
  console.log("PromptPanel component loaded");

  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState<number>(1)
  const [seed, setSeed] = useState<string>("0")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit(e as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");

    if (!prompt.trim() && !imageFile) return;

    try {
      setIsGenerating(true);

      // Post to webhook
      const webhookData = {
        "Prompt": prompt,
        "Image Count": imageCount.toString(),
        "Seed": seed,
        "Category": category
      }

      console.log("Sending webhook data:", webhookData)

      try {
        const webhookResponse = await fetch('http://host.docker.internal:5678/webhook/image-gen-trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors',
          body: JSON.stringify(webhookData)
        });

        console.log("Webhook response status:", webhookResponse.status)
        
        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error('Webhook call failed:', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            body: errorText
          });
          throw new Error("Webhook call failed");
        }

        const responseData = await webhookResponse.json()
        console.log("Webhook success response:", responseData)
        
        if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].Status === "Success") {
          // Add a delay to ensure image is fully rendered
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to fetch the image to verify it's ready
          const checkImage = async (url: string, maxAttempts = 5): Promise<boolean> => {
            for (let i = 0; i < maxAttempts; i++) {
              try {
                const response = await fetch(url);
                if (response.ok) {
                  return true;
                }
              } catch (error) {
                console.log(`Attempt ${i + 1} failed, retrying...`);
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return false;
          };

          const imageUrl = responseData[0].Image;
          const isImageReady = await checkImage(imageUrl);

          if (isImageReady) {
            toast({
              title: "Success",
              description: "Image generation successful",
              duration: 3000,
            });

            // Use the image URL from the webhook response
            onGenerateImage({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              imageUrl: imageUrl,
              prompt: prompt,
              category: category || "Uncategorized",
              createdAt: new Date().toISOString(),
            });
          } else {
            toast({
              title: "Warning",
              description: "Image generated but may take a moment to be available",
              duration: 3000,
            });
          }
        }

        // Call generateImage just to maintain the flow, but we don't use its result
        await generateImage(prompt, imageFile, imageCount, seed);
        
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to generate image",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Error in submission:", error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
        duration: 3000,
      });
      setIsGenerating(false);
    }
  }

  return (
    <Card className="h-full bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 border-purple-200/50 shadow-xl backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-t-lg">
        <CardTitle className="text-xl bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
          Create Image
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium text-gray-700">
              Text Prompt
            </label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-gray-700">
              Category
            </label>
            <Input
              id="category"
              placeholder="image category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="imageCount" className="text-sm font-medium text-gray-700">
                Images to generate
              </label>
              <select
                id="imageCount"
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm ring-offset-background focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                disabled={isGenerating}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="seed" className="text-sm font-medium text-gray-700">
                Image seed
              </label>
              <input
                id="seed"
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm ring-offset-background focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Visual Reference (Optional)</label>

            {imagePreview ? (
              <div className="relative aspect-square w-full max-w-[200px] mx-auto border-2 border-purple-200 rounded-lg overflow-hidden shadow-md">
                <Image src={imagePreview || "/placeholder.svg"} alt="Image preview" fill className="object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600"
                  onClick={removeImage}
                  disabled={isGenerating}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed border-purple-300 rounded-lg p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload Image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          type="submit"
          onClick={handleButtonClick}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          disabled={isGenerating || (!prompt.trim() && !imageFile)}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
