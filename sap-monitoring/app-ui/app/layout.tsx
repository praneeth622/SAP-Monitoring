import { ThemeProvider } from "@/components/theme-provider";
import { FontProvider } from "@/contexts/FontContext";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FontProvider>
            <div className="bg-background min-h-screen">
              <div className="flex">
                <Sidebar />
                <div className="flex flex-col w-full">{children}</div>
              </div>
            </div>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
