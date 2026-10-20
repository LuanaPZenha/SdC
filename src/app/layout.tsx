import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Trilha } from "@/components/Trilha";
import "./globals.css";

const titleFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-title",
  display: "swap",
});

const bodyFont = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sombras do Contágio",
  description: "Simulador educativo de gestão de uma epidemia de contato em Maricá, RJ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titleFont.variable} ${bodyFont.variable}`}>
      <body>
        <a className="skip" href="#conteudo">
          Ir para o conteúdo
        </a>
        {children}
        <Trilha />
      </body>
    </html>
  );
}
