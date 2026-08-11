import { requireMobileAuth } from '@/lib/mobile-api/auth';
import { getMemberSummary } from '@/lib/mobile-api/member';
import { mobileError, mobileSuccess } from '@/lib/mobile-api/response';

export async function POST(request: Request) {
  try {
    const auth = await requireMobileAuth(request);
    const body = await request.json();
    const memberId = String(body.memberId ?? body.qrValue ?? '')
      .trim()
      .toUpperCase();

    if (!memberId) {
      return mobileError(
        'MEMBER_ID_REQUIRED',
        'Member ID atau nilai QR wajib dikirim.',
        422,
      );
    }

    const member = await getMemberSummary({
      memberId,
      mitraId: auth.mitraId,
    });

    if (!member) {
      return mobileError(
        'MEMBER_NOT_FOUND',
        'Member tidak ditemukan pada mitra ini.',
        404,
      );
    }

    return mobileSuccess(member, {
      message: 'Member ditemukan.',
    });
  } catch (error) {
    console.error('POST mobile identify member error:', error);
    return mobileError('MEMBER_IDENTIFY_FAILED', 'Gagal mengidentifikasi member.', 500);
  }
}
