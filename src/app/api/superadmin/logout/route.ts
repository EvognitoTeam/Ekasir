import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logout berhasil.' });
    
    // Hapus cookie sesi ekasir_session
    response.cookies.set({
      name: 'ekasir_session',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Set tanggal kadaluarsa ke masa lalu
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Gagal logout.' }, { status: 500 });
  }
}