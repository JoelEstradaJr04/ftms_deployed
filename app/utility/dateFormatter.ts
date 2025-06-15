// utility\dateFormatter.ts
export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

// For input type="date" fields, we need ISO format
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
}; 