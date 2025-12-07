"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Transcribe" },
    { href: "/transcriptions", label: "My Transcriptions" },
  ]

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-zinc-900" />
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                AWS Transcribe Medical
              </h1>
              <p className="text-sm text-zinc-600">
                Medical transcription proof of concept
              </p>
            </div>
          </Link>

          <nav className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
