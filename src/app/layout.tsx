export const metadata = {
  title: 'LinkedIn Jobs Monitor',
  description: 'Automated job monitoring and Telegram notifications',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
