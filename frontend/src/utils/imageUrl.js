const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export const resolveAnimalImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "";
  }

  if (ABSOLUTE_URL_PATTERN.test(imageUrl) || imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("uploads/")) {
    const normalized = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${process.env.NODE_ENV !== "production" ? "http://localhost:5000" : ""}${normalized}`;
  }

  if (imageUrl.startsWith("/animals/")) {
    return imageUrl;
  }

  return `/animals/${imageUrl}`;
};
