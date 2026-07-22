import type { Metadata } from 'next';
import './page.css';

export const metadata: Metadata = {
  title: 'WeekBox',
  description: 'WeekBox is being prepared.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
