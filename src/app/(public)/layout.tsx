import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vida Plena",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
