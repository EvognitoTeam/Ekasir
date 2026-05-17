import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil' });
  
  // Hapus cookie dengan mengatur masa berlakunya ke masa lalu (maxAge: 0)
  response.cookies.set('ekasir_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}