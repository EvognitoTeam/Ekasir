import { useInventoryStore } from '../store/inventory.store';

export function useStockReport() {
  const { materials } = useInventoryStore();

  const stockData = materials.map(item => {
    const isLow = item.stock <= item.lowStockThreshold && item.stock > 0;
    const isOutOfStock = item.stock <= 0;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      currentStock: item.stock,
      unit: item.unit,
      isLow,
      isOutOfStock
    };
  });

  const lowStockItems = stockData.filter(i => i.isLow);
  const outOfStockItems = stockData.filter(i => i.isOutOfStock);

  return {
    stockData,
    lowStockItems,
    outOfStockItems
  };
}
