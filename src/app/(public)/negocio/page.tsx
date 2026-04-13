import LandingClient from "@/components/landing/LandingClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oportunidade de Negócio Vida Plena | Seja um Afiliado Independente",
  description: "Faça parte da maior oportunidade de negócio em saúde e bem-estar. Seja um Afiliado Independente Vida Plena e construa sua renda vitalícia.",
};

export default function NegocioPage() {
  return <LandingClient />;
}
