import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/AntdRegistry";
import { ConfigProvider } from "antd";
import theme from "@/theme/themeConfig";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Immersa 3D",
  description: "Create 3D scenes from images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StyledComponentsRegistry>
            <ConfigProvider theme={theme}>
                {children}
            </ConfigProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
