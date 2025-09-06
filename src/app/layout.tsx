import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from '@/components/ui/tooltip';

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WildEnergy - Pole Dance Management System",
  description: "Comprehensive Pole Dance management system for classes, members, and check-ins",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        <TooltipProvider>
          <ThemeProvider>
            <ClientLayout>{children}</ClientLayout>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
