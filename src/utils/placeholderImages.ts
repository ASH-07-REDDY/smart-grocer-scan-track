// Utility to generate placeholder images for products based on category
export const generatePlaceholderImage = (productName: string, category: string): string => {
  const categoryMap: Record<string, string> = {
    // Food categories
    'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
    'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
    'meat': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
    'snacks': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'frozen': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=400&fit=crop',
    'household': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    'personal care': 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop',
    'cleaning': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop',
  };

  // Normalize category name for lookup
  const normalizedCategory = category.toLowerCase();
  
  // Try exact match first
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  
  // Try partial matches
  for (const [key, image] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return categoryMap[key];
    }
  }
  
  // Fallback: Use a generic product placeholder based on product name hash
  const productHash = productName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallbackImages = [
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1604719312566-878dd75f2b09?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1607824111414-f75aad6ad3f0?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=400&fit=crop',
  ];
  
  return fallbackImages[productHash % fallbackImages.length];
};

// Generate SVG placeholder as ultimate fallback
export const generateSVGPlaceholder = (productName: string, category: string): string => {
  const initials = productName.slice(0, 2).toUpperCase();
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  const hash = productName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgColor = colors[hash % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${bgColor}"/>
      <text x="200" y="220" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
            text-anchor="middle" fill="white" opacity="0.9">${initials}</text>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="24" 
            text-anchor="middle" fill="white" opacity="0.7">${category}</text>
    </svg>
  `)}`;
};