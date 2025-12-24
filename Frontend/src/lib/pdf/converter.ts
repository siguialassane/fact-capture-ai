/**
 * Utilitaires pour la conversion de PDF en image
 * Utilisé côté client pour le preview, l'analyse se fait côté serveur
 */

/**
 * Convertit la première page d'un PDF en image JPEG
 */
export async function pdfToImage(pdfBase64: string): Promise<string | null> {
  try {
    // Import dynamique de pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");

    // Import du worker avec le suffix ?url de Vite
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

    // Extraire les données base64
    const base64Data = pdfBase64.split(",")[1] || pdfBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Charger le PDF
    const pdf = await pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
    }).promise;

    // Récupérer la première page
    const page = await pdf.getPage(1);

    // Rendre à haute résolution
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Impossible de créer le contexte canvas");
    }

    // Rendre la page dans le canvas
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    // Convertir en JPEG
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (err) {
    console.error("Erreur lors de la conversion PDF → Image:", err);
    return null;
  }
}

/**
 * Vérifie si un fichier est un PDF basé sur son type MIME ou son contenu
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

/**
 * Vérifie si une chaîne base64 représente un PDF
 */
export function isPdfBase64(base64: string): boolean {
  return base64.startsWith("data:application/pdf");
}

/**
 * Extrait le nombre de pages d'un PDF
 */
export async function getPdfPageCount(pdfBase64: string): Promise<number> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

    const base64Data = pdfBase64.split(",")[1] || pdfBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    return pdf.numPages;
  } catch {
    return 0;
  }
}
