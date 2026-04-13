import VerProdutoClient from "./VerProdutoClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos Vida Plena | Suplementos e Imunologia",
  description: "Conheça os produtos Vida Plena com Fatores de Transferência. Suplementação de qualidade internacional para sua saúde.",
};

export default function VerProdutoPage() {
  return <VerProdutoClient />;
}
