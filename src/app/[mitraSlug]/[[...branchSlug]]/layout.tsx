import type { Metadata } from "next";
import { getMitraBySlug } from '@/lib/mitra';
import PwaRegister
  from '@/components/pwa/PwaRegister';

// 🔴 1. Tambahkan 'branchSlug' ke dalam tipe params.
// Karena kita menggunakan [[...branchSlug]], tipenya adalah array opsional (string[])
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
  // 🔴 2. Await seluruh params terlebih dahulu untuk mencegah error hydration/server
  const resolvedParams = await params;
  const slug = resolvedParams.mitraSlug;

  try {
    const mitra = await getMitraBySlug(slug);

    if (mitra) {
      return {
        title: `${mitra.mitra_name} - Ekasir`,
        description:
          mitra.mitra_welcome ||
          `Official digital menu and ordering system for ${mitra.mitra_name}`,
        openGraph: {
          title: `${mitra.mitra_name} - Ekasir`,
          description:
            mitra.mitra_welcome ||
            `Official digital menu and ordering system for ${mitra.mitra_name}`,
        },
      };
    }
  } catch (error) {
    console.error('Gagal mengambil metadata mitra:', error);
  }

  return {
    title: 'Store Not Found - Ekasir',
  };
}

export default function MitraLayout({
  children,
}: Props) {
  return (
    <>
      {/* Stylesheet untuk Rich Text (React Quill) */}
      <link
        rel="stylesheet" href="https://unpkg.com/react-quill@1.3.3/dist/quill.snow.css"
      />
      <PwaRegister />
      {children}
    </>
  );
}