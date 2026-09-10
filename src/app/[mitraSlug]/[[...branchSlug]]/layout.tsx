import type { Metadata } from 'next';
import { getMitraBySlug } from '@/lib/mitra';

type Props = {
  params: Promise<{
    mitraSlug: string;
    branchSlug?: string[];
  }>;
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { mitraSlug } = await params;

  try {
    const mitra = await getMitraBySlug(mitraSlug);

    if (mitra) {
      const description =
        mitra.mitra_welcome ||
        `Official digital menu and ordering system for ${mitra.mitra_name}`;

      return {
        title: `${mitra.mitra_name} - KALOO POS`,
        description,
        openGraph: {
          title: `${mitra.mitra_name} - KALOO POS`,
          description,
        },
      };
    }
  } catch (error) {
    console.error('Gagal mengambil metadata mitra:', error);
  }

  return {
    title: 'Store Not Found - KALOO POS',
  };
}

export default function MitraBranchLayout({
  children,
}: Props) {
  return children;
}
