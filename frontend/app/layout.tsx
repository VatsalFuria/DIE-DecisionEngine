import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { DecisionProvider } from "@/context/DecisionContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision Intelligence Engine",
  description: "AI-assisted decision auditing and scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <DecisionProvider>{children}</DecisionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
