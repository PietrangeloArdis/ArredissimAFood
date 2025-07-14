// Levenshtein distance calculation
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

// Normalize string for comparison
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Check if two strings are similar
export function areSimilarStrings(str1: string, str2: string, threshold = 0.8): boolean {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return true;
  
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const distance = levenshteinDistance(normalized1, normalized2);
  const similarity = 1 - distance / maxLength;
  
  return similarity >= threshold;
}

// Find similar dishes
export function findSimilarDishes(dishName: string, dishes: { dishName: string }[]): { dishName: string }[] {
  return dishes.filter(dish => 
    dish.dishName !== dishName && areSimilarStrings(dish.dishName, dishName)
  );
}