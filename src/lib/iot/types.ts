export type IoTTablePhysicalStatus =
  | 'available'
  | 'occupied'
  | 'unknown';

export type IoTOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type IoTReservationSnapshot = {
  id: number;
  status: string;
  reservedAt: string;
  guestName: string | null;
  guestCount: number | null;
} | null;

export type IoTTableSnapshot = {
  type: 'table.snapshot';
  revision: number;
  generatedAt: string;

  table: {
    id: number;
    mitraId: number;
    branchId: number | null;
    code: string;
    name: string;
    status: IoTTablePhysicalStatus;
    rawStatus: number | null;
  };

  order: {
    id: number;
    code: string;
    status: IoTOrderStatus;
    paymentStatus: '1' | '2' | '3' | '4';
    paymentMethod: string | null;
    customerName: string | null;
    createdAt: string | null;
    confirmedAt: string | null;
    preparingAt: string | null;
    readyAt: string | null;
  } | null;

  /**
   * Sudah disiapkan di protocol.
   * Pada Phase 1 nilainya null sampai schema reservasi
   * KALOO dipetakan ke snapshot ini.
   */
  reservation: IoTReservationSnapshot;

  pager: {
    active: boolean;
    type: 'order_ready' | null;
    message: string | null;
  };

  leds: {
    red: 'off' | 'on' | 'slow_blink' | 'fast_blink';
    yellow: 'off' | 'on' | 'slow_blink' | 'fast_blink';
    blue: 'off' | 'on' | 'slow_blink' | 'fast_blink';
  };
};

export type IoTGatewayHello = {
  type: 'gateway.hello';
  deviceId: string;
  tableId: number;
  serverTime: string;
  heartbeatSeconds: number;
};

export type IoTGatewayMessage =
  | IoTGatewayHello
  | IoTTableSnapshot
  | {
      type: 'gateway.error';
      code: string;
      message: string;
    };
