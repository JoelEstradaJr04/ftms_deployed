export const formatDisplayText = (text: string): string => {
  if (!text) return '';
  return text.replace(/_/g, ' ');
}; 