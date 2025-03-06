import { ThemeProvider } from "@/components/theme-provider"
import { nunitoSans, poppins } from "./fonts"
import type React from "react"
import { FontProvider } from "@/contexts/FontContext"
import '../app/globals.css'
import { Sidebar } from "@/components/sidebar"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${nunitoSans.variable} ${poppins.variable} font-sans antialiased`}>
        <ThemeProvider>
          <FontProvider>
            <div className="bg-background min-h-screen">
              <div className="flex">
                <Sidebar />
                <div className="flex flex-col w-full">
                  {children}
                </div>
              </div>
            </div>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
