// utils/validation.ts

/**
 * Validates the category field.
 * Accepts only predefined options.
 */
export const isValidCategory = (category: string): boolean => {
    category = category.trim().toUpperCase(); // Remove leading/trailing spaces and convert to uppercase
    return /^(BOUNDARY|PERCENTAGE|BUS RENTAL|OTHERS|OTHER)$/.test(category);
};
  

/**
 * Validates the source field.
 * Allows letters, numbers, spaces, and common punctuation.
 * Must be between 2 and 50 characters.
 */
export const isValidSource = (source: string): boolean => {
    return /^[A-Za-z0-9\s.,'-]{2,50}$/.test(source);
};
  

/**
 * Validates the amount field.
 * Allows whole numbers or decimals with up to 2 places.
 */

export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0;
}
