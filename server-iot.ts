import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from './src/db'; 
import { tableDevice, tableList, orders, reservations } from './src/db/schema'; 

const PORT = 3009;

// Buat HTTP Server mandiri di port 3009 agar bisa menerima fetch dari POS
const httpServer = createServer(async (req, res) => {
  // Endpoint internal untuk menerima trigger push dari POS
  if (req.url === '/api/internal/push-iot' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { tableId, status, order_code, customer_name } = JSON.parse(body);
        
        if (global.iotClients && global.iotClients.has(tableId)) {
          const wsClient = global.iotClients.get(tableId);
          wsClient.send(JSON.stringify({ status, order_code, customer_name }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Pushed to ESP32' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Device not connected' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

// Inisialisasi memori global untuk komunikasi dengan API POS nanti
declare global {
  var iotClients: Map<number, any>;
}
global.iotClients = global.iotClients || new Map();

wss.on('connection', (ws) => {
  console.log('[IoT] Perangkat ESP32 terhubung ke port 3009, menunggu autentikasi...');
  let connectedTableId: number | null = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.action === 'auth') {
        const { hex_id, secret_key } = data;

        try {
          // 1. Validasi hardware di tabel Superadmin (table_device)
          const result = await db
            .select({
              tableId: tableDevice.table_id,
              deviceStatus: tableDevice.status
            })
            .from(tableDevice)
            .where(
              and(
                eq(tableDevice.hex_id, hex_id),
                eq(tableDevice.secret_key, secret_key),
                eq(tableDevice.status, 'active')
              )
            )
            .limit(1);

          const device = result[0];

          if (device && device.tableId) {
            connectedTableId = device.tableId;
            global.iotClients.set(connectedTableId, ws);
            console.log(`[IoT] Auth Sukses! Alat (HEX: ${hex_id}) terikat ke Meja ID: ${connectedTableId}`);

            // 2. Cek status operasional di tabel kasir (table_list)
            const tableInfo = await db
              .select({ status: tableList.status })
              .from(tableList)
              .where(eq(tableList.id, connectedTableId))
              .limit(1);

            const currentStatusInt = tableInfo[0]?.status ?? 1;
            const statusMap = ["disabled", "available", "occupied", "reserved"];
            
            let orderCode = "";
            let customerName = "";

            if (currentStatusInt === 2) {
              const activeOrder = await db
                .select({
                  order_code: orders.order_code,
                  customer_name: orders.name
                })
                .from(orders)
                .where(eq(orders.table_number, connectedTableId))
                .orderBy(desc(orders.createdAt))
                .limit(1);

              if (activeOrder.length > 0) {
                orderCode = activeOrder[0].order_code || "";
                customerName = activeOrder[0].customer_name || "Tamu Umum";
              }
            } else if (currentStatusInt === 3) {
              const upcomingRes = await db
                .select({
                  customer_name: reservations.customer_name,
                  arrival_time: reservations.reserved_start
                })
                .from(reservations)
                .where(
                  and(
                    eq(reservations.table_id, connectedTableId),
                    eq(reservations.status, 'pending')
                  )
                )
                .orderBy(asc(reservations.reserved_start))
                .limit(1);

              if (upcomingRes.length > 0) {
                customerName = `${upcomingRes[0].customer_name} (${upcomingRes[0].arrival_time})`;
              } else {
                customerName = "Belum ada tamu";
              }
            }

            ws.send(JSON.stringify({ 
              status: statusMap[currentStatusInt],
              order_code: orderCode,
              customer_name: customerName
            }));

          } else {
            console.log(`[IoT] Auth Gagal! Koneksi ditolak untuk HEX: ${hex_id}`);
            ws.send(JSON.stringify({ error: 'unauthorized' }));
            ws.close();
          }
        } catch (dbError) {
          console.error('[IoT] Error querying database:', dbError);
          ws.close();
        }
      }
    } catch (error) {
      console.error('[IoT] Error parsing JSON:', error);
    }
  });

  ws.on('close', () => {
    if (connectedTableId) {
      global.iotClients.delete(connectedTableId);
      console.log(`[IoT] Alat di Meja ID: ${connectedTableId} terputus.`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`> IoT WebSocket & HTTP Trigger Server running cleanly on port ${PORT}`);
});