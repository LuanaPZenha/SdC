import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sombras do Contágio",
  description: "Simulador educativo de gestão de uma epidemia de contato em Maricá, RJ.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip" href="#conteudo">
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
