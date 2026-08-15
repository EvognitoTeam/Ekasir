import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mitra, settings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getWIBDate } from '@/utils/formatters';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rahasia-super-aman-evokasir-2026'
);

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ekasir_session')?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, SECRET_KEY)).payload as any; } catch (err) { return null; }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const reqBranchId = searchParams.get('branch_id'); // Jika dibuka publik

    if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const mitraData = foundMitra[0];

    const payload = await getAuthPayload();
    let isAuthenticated = false;
    let finalBranchId = reqBranchId ? Number(reqBranchId) : null;

    if (payload) {
      if (payload.role === 'User' || payload.slug === slug) {
        isAuthenticated = true;
        // Prioritaskan branchId dari token admin
        if (payload.branchId) finalBranchId = Number(payload.branchId);
      }
    }

    const conds = [eq(settings.mitraId, mitraData.id)];
    if (finalBranchId) conds.push(eq(settings.branch_id, finalBranchId)); // 🔴 Cari setting spesifik cabang ini

    const foundSettings = await db.select().from(settings).where(and(...conds)).limit(1);
    const dbSettings = foundSettings.length > 0 ? foundSettings[0] : null;

    const publicData = {
      cafeName: mitraData.mitra_name || '',
      mitraAddress: mitraData.mitra_address || '',
      mitraWelcome: mitraData.mitra_welcome || '',
      banner: mitraData.banner || '',
      bankName: mitraData.bank_name || '', 
      bankNumber: mitraData.no_rek || '',
      bankOwner: mitraData.nama_rek || '',
      taxRate: dbSettings?.taxRate ?? 0,
      serviceRate: dbSettings?.serviceRate ?? 0,
      isTaxIncluded: dbSettings?.isTaxIncluded ?? 0,
      wifiSSID: dbSettings?.wifiSSID || '',
      wifiPassword: dbSettings?.wifiPassword || '',
      facilities: dbSettings?.facility || [],
      faq: dbSettings?.faq || [],
      platformFeeRate: mitraData.cashout ?? 0,
    };

    const privateData = isAuthenticated ? { email: typeof payload?.email === 'string' ? payload.email : '', role: payload?.role || '' } : {};

    return NextResponse.json({ success: true, isAuthenticated, data: { ...publicData, ...privateData } });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // 🔴 1. Amankan API PUT agar hanya yang login yang bisa ubah setting
    const payload = await getAuthPayload();
    if (!payload || payload.role === 'User') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ success: false, message: 'Slug diperlukan' }, { status: 400 });

    const body = await request.json();
    const { taxRate, serviceRate, is_tax_included, wifiSSID, wifiPassword, facilities, faq, bankName, bankNumber, bankOwner, cafeName, mitraAddress, mitraWelcome, branch_id } = body;

    const foundMitra = await db.select().from(mitra).where(eq(mitra.mitra_slug, slug)).limit(1);
    if (foundMitra.length === 0) return NextResponse.json({ success: false, message: 'Mitra tidak ditemukan' }, { status: 404 });
    const mitraId = foundMitra[0].id;

    // 🔴 2. Tentukan Branch (Dari token staff atau input UI jika Owner)
    const finalBranchId = payload.branchId ? Number(payload.branchId) : (branch_id ? Number(branch_id) : null);

    // 3. Update Mitra (Data Global)
    await db.update(mitra).set({
      bank_name: bankName || null,
      no_rek: bankNumber || null,
      nama_rek: bankOwner ? bankOwner.toUpperCase() : null, 
      rek_added_at: getWIBDate(),
      updatedAt: getWIBDate(), 
      mitra_name: cafeName || foundMitra[0].mitra_name,
      mitra_address: mitraAddress || foundMitra[0].mitra_address,
      mitra_welcome: mitraWelcome || foundMitra[0].mitra_welcome,
    }).where(eq(mitra.id, mitraId));

    // 4. Update / Insert Settings (Data Spesifik Cabang)
    const conds = [eq(settings.mitraId, mitraId)];
    if (finalBranchId) conds.push(eq(settings.branch_id, finalBranchId));

    const foundSettings = await db.select().from(settings).where(and(...conds)).limit(1);

    if (foundSettings.length === 0) {
      await db.insert(settings).values({
        mitraId: mitraId,
        branch_id: finalBranchId, // 🔴
        taxRate: Number(taxRate || 0),
        serviceRate: Number(serviceRate || 0), 
        isTaxIncluded: Number(is_tax_included || 0), 
        wifiSSID: wifiSSID || null,
        wifiPassword: wifiPassword || null,
        facility: facilities || [], 
        faq: faq || [],             
        createdAt: getWIBDate(),
      });
    } else {
      await db.update(settings).set({
        taxRate: Number(taxRate || 0),
        serviceRate: Number(serviceRate || 0), 
        isTaxIncluded: Number(is_tax_included || 0), 
        wifiSSID: wifiSSID || null,
        wifiPassword: wifiPassword || null,
        facility: facilities || [], 
        faq: faq || [],             
        updatedAt: getWIBDate(),
      }).where(and(...conds));
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil diperbarui' });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat menyimpan pengaturan' }, { status: 500 });
  }
}