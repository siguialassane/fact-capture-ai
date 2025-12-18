/**
 * Utilitaires pour le traitement d'image client-side
 * Permet de redimensionner, compresser et rogner les images avant upload
 */

// Rogner une image basé sur des coordonnées de pixels
export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("No 2d context");
    }

    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw the rotated image
    ctx.drawImage(image, 0, 0);

    // croppedAreaPixels values are bounding-box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0);

    // Return base64 result
    return canvas.toDataURL("image/jpeg", 0.95);
}

// Compresser et redimensionner l'image pour l'upload (Optimisation Vitesse)
export async function compressImageForUpload(
    imageSrc: string,
    maxWidth = 1600, // Suffisant pour l'OCR, beaucoup plus léger que 12MP
    quality = 0.75   // Bon équilibre qualité/poids
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");

    let width = image.width;
    let height = image.height;

    // Resize logic
    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No context");

    ctx.drawImage(image, 0, 0, width, height);

    // High compression for speed
    return canvas.toDataURL("image/jpeg", quality);
}

// Helper to load image
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
        image.src = url;
    });

function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

// Returns the new bounding area of a rotated rectangle
function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}
