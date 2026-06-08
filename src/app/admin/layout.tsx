export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="manifest" href="/manifest-admin.json" />
      {children}
    </>
  )
}
