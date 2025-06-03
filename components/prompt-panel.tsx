"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon, Loader2, Check, ChevronsUpDown } from "lucide-react"
import { generateImage } from "@/lib/actions"
import type { ImageGenerationResult } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface PromptPanelProps {
  onGenerateImage: (image: ImageGenerationResult) => void
  setIsGenerating: (isGenerating: boolean) => void
  isGenerating: boolean
  existingCategories?: string[]
}

export default function PromptPanel({ 
  onGenerateImage, 
  setIsGenerating, 
  isGenerating,
  existingCategories = []
}: PromptPanelProps) {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState("")
  const [seed, setSeed] = useState<string>("0")
  const [imageHeight, setImageHeight] = useState<number>(768)
  const [imageWidth, setImageWidth] = useState<number>(512)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(false)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")

  // Initialize categories with existing ones and ensure "Uncategorized" is always present
  useEffect(() => {
    const uniqueCategories = [...new Set([...existingCategories, "Uncategorized"])]
      .filter(cat => cat.trim() !== "")
      .sort()
    setCategories(uniqueCategories)
  }, [existingCategories])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit(e as any);
  };

  const handleCategorySelect = (value: string) => {
    setCategory(value)
    setOpenCombobox(false)
  }

  const handleAddNewCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()].sort()
      setCategories(updatedCategories)
      setCategory(newCategory.trim())
      setNewCategory("")
    }
    setOpenCombobox(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");

    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);

      // Post to webhook
      const webhookData = {
        "Prompt": prompt,
        "Seed": seed,
        "Category": category || "Uncategorized",
        "Height": imageHeight.toString(),
        "Width": imageWidth.toString()
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
        await generateImage(prompt, null);
        
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

  const handleDimensionChange = (dimension: 'height' | 'width', value: number) => {
    // Ensure value is a multiple of 16
    const roundedValue = Math.round(value / 16) * 16
    // Clamp height to maximum of 1792
    const clampedValue = Math.min(roundedValue, 1792)

    if (maintainAspectRatio) {
      const aspectRatio = imageWidth / imageHeight
      if (dimension === 'height') {
        setImageHeight(clampedValue)
        const newWidth = Math.round((clampedValue * aspectRatio) / 16) * 16
        setImageWidth(Math.min(newWidth, 1792))
      } else {
        setImageWidth(clampedValue)
        const newHeight = Math.round((clampedValue / aspectRatio) / 16) * 16
        setImageHeight(Math.min(newHeight, 1792))
      }
    } else {
      if (dimension === 'height') {
        setImageHeight(clampedValue)
      } else {
        setImageWidth(clampedValue)
      }
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
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
                  disabled={isGenerating}
                >
                  {category || "Select category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>
                    <div className="p-2">
                      <Input
                        placeholder="Add new category..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="mb-2"
                      />
                      <Button 
                        onClick={handleAddNewCategory}
                        disabled={!newCategory.trim()}
                        className="w-full"
                      >
                        Add Category
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat}
                        value={cat}
                        onSelect={() => handleCategorySelect(cat)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            category === cat ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {cat}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="imageHeight" className="text-sm font-medium text-gray-700">
                Image Height
              </label>
              <Input
                id="imageHeight"
                type="number"
                value={imageHeight}
                onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
                disabled={isGenerating}
                step="16"
                min="16"
                max="1792"
              />
              <p className="text-xs text-gray-500">Max height: 1792px (multiples of 16)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="imageWidth" className="text-sm font-medium text-gray-700">
                Image Width
              </label>
              <Input
                id="imageWidth"
                type="number"
                value={imageWidth}
                onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-400/20"
                disabled={isGenerating}
                step="16"
                min="16"
                max="1792"
              />
              <p className="text-xs text-gray-500">Max width: 1792px (multiples of 16)</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="aspectRatio"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              disabled={isGenerating}
            />
            <label htmlFor="aspectRatio" className="text-sm font-medium text-gray-700">
              Maintain aspect ratio
            </label>
          </div>
        </form>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          type="submit"
          onClick={handleButtonClick}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          disabled={isGenerating || !prompt.trim()}
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
