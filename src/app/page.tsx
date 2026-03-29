import LandingClient from "@/components/landing/LandingClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projeto Vida Plena | Oportunidade 4Life Brasil",
  description: "Descubra como transformar sua saúde e sua liberdade financeira com a ciência dos Fatores de Transferência 4Life. Torne-se um afiliado independente agora.",
  keywords: ["4life", "brasil", "renda extra", "marketing multinivel", "imunologia", "vida plena", "saúde", "liberdade financeira"],
  openGraph: {
    title: "Projeto Vida Plena | Transformação e Saúde",
    description: "Recupere o controle da sua vida com a oportunidade 4Life Brasil. Ciência e negócios unidos.",
    type: "website",
    locale: "pt_BR",
    url: "https://vidaplena.app", // Substituir pelo domínio real quando disponível
    images: [
      {
        url: "/og-image.jpg", // Idealmente ter uma imagem de preview
        width: 1200,
        height: 630,
        alt: "Projeto Vida Plena 4Life",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Projeto Vida Plena | 4Life Brasil",
    description: "Ciência imunológica e liberdade financeira.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <LandingClient />;
}
