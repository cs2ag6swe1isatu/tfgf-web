/**
 * Category shorthand mappings for display in constrained UI spaces.
 * Used when categories are too long to display at maximum width.
 */

const CATEGORY_SHORTHANDS: Record<string, string> = {
  "General Knowledge": "General",
  "Science and Technology": "Sci & Tech",
  "History": "History",
  "Geography": "Geography",
  "Mathematics": "Maths",
  "Language and Literature": "Lang & Lit",
  "Pop Culture": "Pop Culture",
};

const MAX_DISPLAY_LENGTH = 11;

/**
 * Get the appropriate display text for a category.
 * Returns shorthand if the full category name exceeds MAX_DISPLAY_LENGTH characters.
 * @param category The full category name
 * @returns The category name or its shorthand
 */
export function getCategoryDisplay(category: string | null | undefined): string {
  if (!category) return "CATEGORY";
  
  // If the category fits within the max length, use it as-is
  if (category.length <= MAX_DISPLAY_LENGTH) {
    return category;
  }
  
  // Otherwise, use the shorthand if available
  return CATEGORY_SHORTHANDS[category] || category;
}
