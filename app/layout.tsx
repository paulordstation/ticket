import type { Metadata } from "next";
import { Martel_Sans } from "next/font/google";
import "./globals.css";

const martelSans = Martel_Sans({
  variable: "--font-martel-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Flecha Consultoria — Central de Tickets",
  description: "Abra solicitações de demanda diretamente para a equipe da Flecha Consultoria.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${martelSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
