import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Indie Star Market | The Future of Stories",
  description: "Translate abstract value into emotional experience. A prediction market for the next generation of creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased selection:bg-fuchsia-500/30`} suppressHydrationWarning>
        <WalletContextProvider>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
          <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          ></div>
        </WalletContextProvider>
      </body>
    </html>
  );
}

