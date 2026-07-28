import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview", href: "/portal" },
  { label: "Chat History", href: "/portal/chat-history" },
  { label: "API Usage", href: "/portal/usage" },
  { label: "Skills", href: "/portal/skills" },
  { label: "Pairing", href: "/portal/pairing" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="px-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Admin Portal
      </span>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-md px-2 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
