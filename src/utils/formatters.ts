export const formatPrice = (price: number) => {
  // Editorial Bistro Sleek Formatting
  // Standardizes across the app (Journal style: simplified IDR)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  .format(price)
  .replace(/\s/g, '');
};

export const getWIBDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
};