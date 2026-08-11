import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // 1. Ambil ID kasir/user dari body request (yang dikirim dari frontend)
    // Gunakan try-catch bawaan json() jaga-jaga kalau request body kosong
    const body = await request.json().catch(() => ({})); 
    const { token } = body;

    // 2. 🔴 UPDATE STATUS KE OFFLINE (is_login = 0)
    if (token) {
      await db.update(users)
        .set({ is_login: false })
        .where(eq(users.token, token));
    }

    // 3. Siapkan Response
    const response = NextResponse.json({ success: true, message: 'Logout berhasil' });
    
    // 4. Hapus cookie dengan mengatur masa berlakunya ke masa lalu (maxAge: 0)
    response.cookies.set('ekasir_session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;

  } catch (error) {
    console.error("Logout DB Error:", error);
    
    // Fallback: Tetap hapus cookie di browser KLIEN meskipun database sedang error,
    // supaya user tidak nyangkut (stuck) di halaman dashboard.
    const errorResponse = NextResponse.json({ success: false, message: 'Logout selesai dengan error DB' }, { status: 500 });
    errorResponse.cookies.set('ekasir_session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    
    return errorResponse;
  }
}