import Sidebar from "@/components/Sidebar";

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 bg-zinc-50 p-8 dark:bg-black">{children}</main>
    </div>
  );
}
