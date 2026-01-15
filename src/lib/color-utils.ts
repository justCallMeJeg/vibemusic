/**
 * Extracts the dominant color from an image URL by drawing it to a 1x1 canvas.
 * @param {string} imageUrl - The URL of the image.
 * @returns {Promise<string>} The dominant color as an RGB string or hex fallback.
 */
export async function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("#000000"); // Fallback
        return;
      }

      // Resize to 1x1 to get average color
      canvas.width = 1;
      canvas.height = 1;

      // Draw image to 1x1 pixel
      ctx.drawImage(img, 0, 0, 1, 1);

      try {
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        // Can happen with CORS issues even with crossOrigin set
        console.warn("Failed to extract color", e);
        resolve("#000000");
      }
    };

    img.onerror = () => {
      console.warn("Failed to load image for color extraction");
      resolve("#000000");
    };
  });
}
