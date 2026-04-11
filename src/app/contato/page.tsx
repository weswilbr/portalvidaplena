import LandingClient from "@/components/landing/LandingClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato | Projeto Vida Plena",
  description: "Entre em contato com o Projeto Vida Plena e descubra como transformar sua saúde e sua liberdade financeira.",
  keywords: ["Vida Plena", "contato", "brasil", "renda extra", "marketing multinivel", "imunologia", "vida plena", "saúde", "liberdade financeira"],
  openGraph: {
    title: "Contato | Projeto Vida Plena",
    description: "Recupere o controle da sua vida com a oportunidade Vida Plena.",
    type: "website",
    locale: "pt_BR",
    url: "https://portalfvp.duckdns.org/contato",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Projeto Vida Plena",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contato | Projeto Vida Plena",
    description: "Ciência imunológica e liberdade financeira.",
  },
  alternates: {
    canonical: "/contato",
  },
};

export default function ContatoPage() {
  return <LandingClient />;
}
