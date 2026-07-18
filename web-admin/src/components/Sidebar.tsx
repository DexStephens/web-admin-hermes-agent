import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview", href: "/portal", active: true },
  { label: "Chat History", href: null, active: false },
  { label: "API Usage", href: null, active: false },
  { label: "Skills", href: null, active: false },
];

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="px-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Admin Portal
      </span>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-400 dark:text-zinc-600"
            >
              {item.label}
              <span className="text-xs">Soon</span>
            </span>
          )
        )}
      </nav>
    </aside>
  );
}
