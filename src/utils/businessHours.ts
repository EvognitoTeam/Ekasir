
/**
 * Checks if the current time is within business hours.
 * @param currentTime Date object
 * @param openingTime "HH:mm" format
 * @param closingTime "HH:mm" format
 * @returns boolean
 */
export const isWithinBusinessHours = (currentTime: Date, openingTime: string, closingTime: string): boolean => {
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);
  
  const now = currentTime.getHours() * 60 + currentTime.getMinutes();
  const open = openHour * 60 + openMin;
  const close = closeHour * 60 + closeMin;
  
  // Handle cases where closing time is after midnight (e.g. 08:00 - 02:00)
  if (close < open) {
    return now >= open || now <= close;
  }
  
  return now >= open && now <= close;
};

export const formatTimeDisplay = (timeStr: string): string => {
  const [hour, min] = timeStr.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};
