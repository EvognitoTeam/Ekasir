import { useState, useEffect } from 'react';
import { Order } from '@/types/menu';

export function useKitchenTicket(order: Order) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [timeText, setTimeText] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      setElapsedMinutes(diff);
      
      if (diff < 1) setTimeText('Baru saja');
      else if (diff < 60) setTimeText(`${diff} mnt`);
      else setTimeText(`${Math.floor(diff / 60)}j ${diff % 60}m`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [order.createdAt, order.status]);

  // Determine urgency level for color coding
  // 0-5 mins: normal
  // 5-10 mins: warning
  // > 10 mins: urgent
  let urgency: 'normal' | 'warning' | 'urgent' = 'normal';
  if (order.status === 'confirmed' || order.status === 'preparing') {
    if (elapsedMinutes >= 10) urgency = 'urgent';
    else if (elapsedMinutes >= 5) urgency = 'warning';
  }

  return {
    elapsedMinutes,
    timeText,
    urgency
  };
}
