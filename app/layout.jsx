// This is the simplified root layout.
// It no longer imports the Header or Footer components.

import './globals.css';

export const metadata = {
  title: 'YouTube Downloader',
  description: 'A simple app to download YouTube videos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
