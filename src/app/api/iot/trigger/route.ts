import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Payload dari frontend kasir, misalnya:
    // { "table_id": 1, "status": "occupied", "order_code": "EVK-001" }
    const { table_id, status, order_code, customer_name } = body;

    // 1. Ambil instance koneksi WebSocket dari Global Memory
    const iotClients = (global as any).iotClients as Map<number, any>;

    // 2. Cek apakah alat di Meja tersebut sedang menyala (online)
    if (iotClients && iotClients.has(table_id)) {
      const ws = iotClients.get(table_id);

      // 3. Tembakkan instruksi JSON ke layar ESP32!
      ws.send(JSON.stringify({
        status: status, // "available", "occupied", atau "reserved"
        order_code: order_code || "",
        customer_name: customer_name || ""
      }));

      console.log(`[API] Perintah layar terkirim ke Meja ID ${table_id}`);
    } else {
      console.log(`[API] Peringatan: Meja ID ${table_id} diupdate, tapi alat IoT sedang offline.`);
    }

    // ==========================================
    // TODO: Lakukan update status meja di database utama Anda di sini
    // ==========================================

    return NextResponse.json({
        success: true,
        message: 'Status IoT Meja berhasil diupdate'
    });

  } catch (error) {
    console.error('[IoT API Error]', error);
    return NextResponse.json(
        { success: false, message: 'Gagal memproses request' },
        { status: 500 }
    );
  }
}