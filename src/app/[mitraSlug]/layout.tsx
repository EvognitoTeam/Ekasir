import type { Metadata } from "next";

// 1. Ubah tipe params menjadi Promise
type Props = {
  params: Promise<{ mitraSlug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 2. Wajib "await" params sebelum mengambil nilainya!
  const resolvedParams = await params;
  const slug = resolvedParams.mitraSlug;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}/api/products?slug=${slug}`);
    const data = await res.json();

    if (data.success && data.mitraName) {
      return {
        title: `${data.mitraName} - Ekasir`,
        description: data.mitraWelcome || `Official digital menu and ordering system for ${data.mitraName}`,
        openGraph: {
          title: `${data.mitraName} - Ekasir`,
          description: `Official digital menu and ordering system for ${data.mitraName}`,
        }
      };
    }
  } catch (error) {
    console.error("Gagal melakukan fetch metadata mitra:", error);
  }

  return {
    title: "Store Not Found - Ekasir",
  };
}

export default function MitraLayout({
  children,
}: Props) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/react-quill@1.3.3/dist/quill.snow.css"
      />

      {children}
    </>
  );
}