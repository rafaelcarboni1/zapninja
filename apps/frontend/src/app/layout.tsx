import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZAPNINJA Dashboard",
  description: "Painel de controle para gerenciamento de instâncias WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
