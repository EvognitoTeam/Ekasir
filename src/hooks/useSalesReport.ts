import { Order } from '../types/menu';
import { isSameDay, isWithinInterval, subDays, startOfDay, endOfDay, getHours } from 'date-fns';
import { useMenuStore } from '../store/menu.store';
import { useInventoryStore } from '../store/inventory.store';

export type TimeFilter = 'today' | '7days' | '30days' | 'custom';

export function useSalesReport(orders: Order[], filter: TimeFilter, customRange?: { start: Date; end: Date }) {
  const { items: menuItems } = useMenuStore();
  const { expenses } = useInventoryStore();

  const isDateInRange = (date: Date) => {
    const now = new Date();
    if (filter === 'today') return isSameDay(date, now);
    if (filter === '7days') return isWithinInterval(date, { start: subDays(now, 7), end: now });
    if (filter === '30days') return isWithinInterval(date, { start: subDays(now, 30), end: now });
    if (filter === 'custom' && customRange) return isWithinInterval(date, { start: startOfDay(customRange.start), end: endOfDay(customRange.end) });
    return true;
  };

  const getFilteredOrders = () => {
    // 🔴 Perbaikan: Filter out data yang tidak memiliki createdAt
    return orders.filter(o => o.createdAt && isDateInRange(new Date(o.createdAt)));
  };

  const getFilteredExpenses = () => {
    // 🔴 Perbaikan: Filter out data yang tidak memiliki timestamp
    return expenses.filter(e => e.timestamp && isDateInRange(new Date(e.timestamp)));
  };

  const filteredOrders = getFilteredOrders();
  const filteredExpenses = getFilteredExpenses();
  const completedOrders = filteredOrders.filter(o => o.status === 'ready');

  // Metrik Utama Keuangan
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  const totalTransactions = completedOrders.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Laporan Menu Terlaris
  const topItemsMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const product = menuItems.find(m => String(m.id) === String(item.menuItemId));
      if (product) {
        if (!topItemsMap[product.id]) {
          topItemsMap[product.id] = { name: product.name, quantity: 0, revenue: 0 };
        }
        topItemsMap[product.id].quantity += item.quantity;
        topItemsMap[product.id].revenue += (Number(product.basePrice) * item.quantity);
      }
    });
  });
  const topItems = Object.values(topItemsMap).sort((a, b) => b.quantity - a.quantity);

  // Laporan Jam Sibuk
  const hourlyDataMap: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hourlyDataMap[i] = 0;
  
  filteredOrders.forEach(order => {
    // 🔴 Perbaikan: Cek lagi sebelum getHours
    if (order.createdAt) {
      const hour = getHours(new Date(order.createdAt));
      hourlyDataMap[hour]++;
    }
  });
  
  const hourlyData = Object.entries(hourlyDataMap).map(([hour, count]) => ({
    hour: `${hour}:00`,
    orders: count
  }));

  // 🔴 Laporan Tipe Pesanan (Diset 0 sesuai permintaan)
  const orderTypeData = [
    { name: 'Dine In', value: 0 },
    { name: 'Take Away', value: 0 }
  ];

  // Laporan Pembatalan
  const cancelledOrders = filteredOrders.filter(o => o.status === 'failed');
  const cancelCount = cancelledOrders.length;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalTransactions,
    averageOrderValue,
    topItems,
    hourlyData,
    orderTypeData,
    cancelCount,
    completedOrders
  };
}