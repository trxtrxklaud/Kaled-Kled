export const compressImageFile = async (
  file: File,
  maxWidth = 1600,
  quality = 0.7
): Promise<string> => {
  // Ne pas traiter les fichiers non-image
  if (!file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 🔧 SEUIL DE SÉCURITÉ : si le fichier dépasse 20 Mo, retour direct sans compression
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo
  if (file.size > MAX_FILE_SIZE) {
    console.warn("[compressImage] Fichier trop volumineux, retour sans compression :", (file.size / 1024 / 1024).toFixed(1), "Mo");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 🔧 Compression adaptative selon la taille du fichier
  let effectiveMaxWidth = maxWidth;
  let effectiveQuality = quality;

  if (file.size > 10 * 1024 * 1024) {
    // > 10 Mo → compression agressive
    effectiveMaxWidth = 1200;
    effectiveQuality = 0.5;
  } else if (file.size > 5 * 1024 * 1024) {
    // > 5 Mo → compression modérée
    effectiveMaxWidth = 1400;
    effectiveQuality = 0.6;
  }

  // 🔧 Utiliser URL.createObjectURL au lieu de readAsDataURL (bien plus léger en mémoire)
  const objectUrl = URL.createObjectURL(file);

  try {
    const compressedDataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // Libérer immédiatement l'URL objet
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;

        if (width > effectiveMaxWidth) {
          height = Math.round((height * effectiveMaxWidth) / width);
          width = effectiveMaxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback : retourner le fichier original
          const fallbackReader = new FileReader();
          fallbackReader.onload = (e) => resolve(e.target?.result as string);
          fallbackReader.onerror = reject;
          fallbackReader.readAsDataURL(file);
          return;
        }

        // Fond blanc pour éviter la transparence en JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", effectiveQuality);

        // 🔧 Nettoyage mémoire explicite
        canvas.width = 0;
        canvas.height = 0;

        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Fallback : retourner le fichier original
        const fallbackReader = new FileReader();
        fallbackReader.onload = (e) => resolve(e.target?.result as string);
        fallbackReader.onerror = reject;
        fallbackReader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });

    return compressedDataUrl;
  } catch (error) {
    console.error("[compressImage] Erreur :", error);
    // Fallback ultime
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
