import { Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap CSS
import "./globals.css";
import BootstrapClient from "../components/BootstrapClient";
import ThemeProvider from "../components/ThemeProvider";
import AutoLogout from "../components/AutoLogout";
import ScrollPreserver from "../components/ScrollPreserver";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "POLLOS AL DÍA APP",
  description: "GENERADO POR CREATE NEXT APP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          html {
            background: #ffffff;
            scroll-behavior: auto;
          }
          @media (prefers-color-scheme: dark) {
            html {
              background: #1a1a1a;
            }
          }
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <BootstrapClient />
        {/* Restaurar scroll en toda la app */}
        <ScrollPreserver />
        {/* Logout automático tras inactividad */}
        <AutoLogout timeout={15 * 60 * 1000} />
        <ThemeProvider>
          <div style={{ flex: 1 }}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
