import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import "./globals.css";

const titleFont = Cinzel({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "900"],
  variable: "--font-title",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sombras do Contágio",
  description: "Simulador educativo de gestão de uma epidemia de contato em Maricá, RJ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={titleFont.variable}>
      <body>
        <a className="skip" href="#conteudo">
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
