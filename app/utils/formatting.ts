export const formatDisplayText = (text: unknown): string => {
  if (typeof text !== 'string') {
    if (text === null || text === undefined) return '';
    return String(text).replace(/_/g, ' ');
  }
  return text.replace(/_/g, ' ');
};
