import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Superadmin | KALOO POS",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}