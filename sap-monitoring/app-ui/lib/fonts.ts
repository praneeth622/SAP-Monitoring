import { Inter as FontSans } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export type FontVariant = "sans";

export const fonts: Record<FontVariant, typeof fontSans> = {
  sans: fontSans,
}; 