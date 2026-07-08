import './globals.css';
import 'flag-icons/css/flag-icons.min.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { CeramicProvider } from '@/context/CeramicContext';
import { AuthProvider } from '@/context/AuthContext';
import { RouteGuard } from '@/components/RouteGuard';
import { Arimo, Nunito } from 'next/font/google';

const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-arimo',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
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
    <html lang="en" suppressHydrationWarning className={`${arimo.variable} ${nunito.variable}`}>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <CeramicProvider>
            <TimezoneProvider>
              <AuthProvider>
                <RouteGuard>{children}</RouteGuard>
              </AuthProvider>
            </TimezoneProvider>
          </CeramicProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
