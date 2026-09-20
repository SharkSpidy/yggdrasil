export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Renders the selected crop region onto a fixed-size square canvas and
 * returns it as a compressed JPEG blob. Every photo that comes out of the
 * upload flow ends up the same OUTPUT_SIZE x OUTPUT_SIZE, 1:1, regardless of
 * the source photo's dimensions — so 300 uploads from 300 different phones
 * still land as a uniform, storage-friendly set.
 */
export async function getCroppedSquareJpeg(
  imageSrc: string,
  crop: PixelCrop,
  outputSize = 800,
  quality = 0.9
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't render the crop canvas.");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the cropped image."))),
      "image/jpeg",
      quality
    );
  });
}
