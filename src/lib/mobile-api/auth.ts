import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const accessSecret = new TextEncoder().encode(
  process.env.MOBILE_ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    'ganti-mobile-access-secret-di-production',
);

const refreshSecret = new TextEncoder().encode(
  process.env.MOBILE_REFRESH_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    'ganti-mobile-refresh-secret-di-production',
);

export type MobileRole = 'owner' | 'cashier' | 'kitchen';

export type MobileTokenPayload = JWTPayload & {
  userId: number;
  mitraId: number;
  branchId: number | null;
  slug: string;
  role: MobileRole;
  name: string;
  email: string;
  memberId: string | null;
  tokenType: 'access' | 'refresh';
};

function normalizeRole(role: unknown): MobileRole | null {
  const normalized = String(role ?? '').toLowerCase();
  if (
    normalized === 'owner' ||
    normalized === 'cashier' ||
    normalized === 'kitchen'
  ) {
    return normalized;
  }
  return null;
}

export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

export async function createMobileTokens(input: {
  userId: number;
  mitraId: number;
  branchId: number | null;
  slug: string;
  role: unknown;
  name: string;
  email: string;
  memberId: string | null;
}) {
  const role = normalizeRole(input.role);
  if (!role) throw new Error('Role tidak didukung oleh POS mobile.');

  const base = {
    userId: input.userId,
    mitraId: input.mitraId,
    branchId: input.branchId,
    slug: input.slug,
    role,
    name: input.name,
    email: input.email,
    memberId: input.memberId,
  };

  const accessToken = await new SignJWT({
    ...base,
    tokenType: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setAudience('ekasir-mobile')
    .setIssuer('ekasir-api')
    .setExpirationTime('15m')
    .sign(accessSecret);

  const refreshToken = await new SignJWT({
    ...base,
    tokenType: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setAudience('ekasir-mobile')
    .setIssuer('ekasir-api')
    .setExpirationTime('30d')
    .sign(refreshSecret);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };
}

async function verifyToken(
  token: string,
  tokenType: 'access' | 'refresh',
): Promise<MobileTokenPayload> {
  const secret = tokenType === 'access' ? accessSecret : refreshSecret;

  const result = await jwtVerify(token, secret, {
    audience: 'ekasir-mobile',
    issuer: 'ekasir-api',
  });

  const payload = result.payload as MobileTokenPayload;
  if (payload.tokenType !== tokenType) {
    throw new Error('Jenis token tidak valid.');
  }

  const role = normalizeRole(payload.role);
  if (!role) throw new Error('Role token tidak valid.');

  return {
    ...payload,
    userId: Number(payload.userId),
    mitraId: Number(payload.mitraId),
    branchId: payload.branchId == null ? null : Number(payload.branchId),
    role,
  };
}

export async function requireMobileAuth(
  request: Request,
): Promise<MobileTokenPayload> {
  const token = readBearerToken(request);
  if (!token) throw new Error('MISSING_ACCESS_TOKEN');
  return verifyToken(token, 'access');
}

export async function verifyMobileRefreshToken(token: string) {
  return verifyToken(token, 'refresh');
}

export function resolveMobileBranch(
  payload: MobileTokenPayload,
  requestedBranchId?: unknown,
): number | null {
  if (payload.role !== 'owner') return payload.branchId;

  if (
    requestedBranchId === undefined ||
    requestedBranchId === null ||
    requestedBranchId === '' ||
    requestedBranchId === 'main'
  ) {
    return payload.branchId;
  }

  const branchId = Number(requestedBranchId);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new Error('BRANCH_ID_INVALID');
  }

  return branchId;
}
