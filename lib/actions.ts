"use server"

export async function generateImage(
  prompt: string,
  imageFile: File | null,
  imageCount = 1,
  seed = "0",
): Promise<{ imageUrl: string }[] | { imageUrl: string }> {
  try {
    // Return a dummy success response since the actual image generation
    // is handled by the webhook now
    return {
      imageUrl: "success"
    }
  } catch (error) {
    console.error("Error in generate image function:", error)
    throw new Error("Failed to generate image")
  }
}
