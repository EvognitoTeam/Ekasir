import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { createPool } from 'mysql2/promise';

const dev = process.env.NODE_ENV !== 'production';
// UBAH INI JADI 0.0.0.0 AGAR BISA DIAKSES DARI LUAR LAPTOP
const hostname = '0.0.0.0'; 
const port = process.env.PORT || 3009;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'evokasir',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

global.iotClients = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // 1. UBAH DI SINI: Gunakan noServer agar tidak membajak rute Next.js
  const wss = new WebSocketServer({ noServer: true });

  // 2. BUAT PINTU KHUSUS UNTUK IOT (/api/iot)
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    // Jika yang datang adalah ESP32 (mengetuk pintu /api/iot)
    if (pathname === '/api/iot') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } 
    // Jika yang datang rute lain (seperti HMR Next.js), biarkan lewat
  });

  wss.on('connection', (ws) => {
    console.log('[IoT] Perangkat baru terhubung, menunggu autentikasi...');
    let connectedTableId = null;

    ws.on('message', async (message) => {
      try {
        // PERBAIKAN: Paksa pesan ke bentuk String sebelum di-parse
        const data = JSON.parse(message.toString());

        if (data.action === 'auth') {
          const { hex_id, secret_key } = data;
          try {
            const [rows] = await pool.query(
              `SELECT id, table_id, status FROM iot_devices WHERE hex_id = ? AND secret_key = ? AND status = 'active' LIMIT 1`,
              [hex_id, secret_key]
            );

            if (rows.length > 0) {
              const device = rows[0];
              connectedTableId = device.table_id;
              
              if (connectedTableId) {
                  global.iotClients.set(connectedTableId, ws);
                  console.log(`[IoT] Auth Sukses! Alat (HEX: ${hex_id}) terikat ke Meja ID: ${connectedTableId}`);
                  ws.send(JSON.stringify({ status: 'connected' }));
              }
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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> KALOO POS IoT Ready on http://${hostname}:${port}`);
  });
});