import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { Arimo } from 'next/font/google';

const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-arimo',
  display: 'swap',
});

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
    <html lang="en" suppressHydrationWarning className={arimo.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
