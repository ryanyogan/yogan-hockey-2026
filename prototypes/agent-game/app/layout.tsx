export const metadata = { title: "PROTOTYPE: one Agent per game" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-monospace, monospace", margin: "1.5rem", maxWidth: 900 }}>
        <p style={{ background: "#fde68a", padding: "4px 8px" }}>PROTOTYPE, throwaway. One Agent per game, pushed to this page.</p>
        {children}
      </body>
    </html>
  );
}
