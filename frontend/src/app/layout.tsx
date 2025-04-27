'use client'
import './globals.css'
import { createConnectTransport } from '@connectrpc/connect-web'
import { TransportProvider } from '@connectrpc/connect-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const finalTransport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
})
const queryClient = new QueryClient()
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <TransportProvider transport={finalTransport}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </TransportProvider>
      </body>
    </html>
  )
}
