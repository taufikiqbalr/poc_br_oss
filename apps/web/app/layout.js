import './globals.css';

export const metadata = {
  title: 'OSS v2 Business Rules PoC',
  description: 'B1 Business Rules PoC for OSS v2 Zone B Orchestrator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
