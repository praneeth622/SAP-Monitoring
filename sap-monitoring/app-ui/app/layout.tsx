import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggleProvider } from "@/contexts/ThemeToggleContext";
import { FontProvider } from "@/contexts/FontContext";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { fontSans } from "@/lib/fonts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider>
          <ThemeToggleProvider>
            <FontProvider>  
              <div className="bg-background min-h-screen">
                <div className="flex">
                  <Sidebar />
                  <div className="flex flex-col w-full">{children}</div>
                </div>
              </div>
            </FontProvider>
          </ThemeToggleProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
