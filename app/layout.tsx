import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "PaperMatch — Research Paper Discovery",
  description: "Intelligent research paper recommendation and discovery system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <NavBar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          PaperMatch — DBMS Level 3 Project · PostgreSQL + pgvector
        </footer>
      </body>
    </html>
  );
}
