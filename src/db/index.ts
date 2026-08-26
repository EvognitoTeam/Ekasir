import { drizzle } from 'drizzle-orm/mysql2';
import mysql, { type Pool } from 'mysql2/promise';

import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL belum dikonfigurasi.',
  );
}

declare global {
  // Mencegah pool baru dibuat setiap hot reload Next.js.
   
  var ekasirMysqlPool: Pool | undefined;
}

const poolConnection =
  global.ekasirMysqlPool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,

    waitForConnections: true,

    // Mulai kecil, terutama jika memakai shared hosting.
    connectionLimit: 5,

    // Batasi koneksi idle yang dipertahankan.
    maxIdle: 3,

    // Tutup koneksi idle setelah 60 detik.
    idleTimeout: 60_000,

    // Request menunggu koneksi tersedia.
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== 'production') {
  global.ekasirMysqlPool = poolConnection;
}

export const db = drizzle(
  poolConnection,
  {
    mode: 'default',
    schema,
  },
);

export { poolConnection };