"use client"

import { usePathname, useRouter } from "next/navigation"
import TopNavigation from "@cloudscape-design/components/top-navigation"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <TopNavigation
      identity={{
        href: "/",
        title: "AWS Transcribe Medical",
        logo: {
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23232f3e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z'/%3E%3C/svg%3E",
          alt: "Medical",
        },
      }}
      utilities={[
        {
          type: "button",
          text: "Transcribe",
          iconName: "microphone",
          onClick: () => router.push("/"),
          variant: pathname === "/" ? "primary-button" : undefined,
        },
        {
          type: "button",
          text: "My Transcriptions",
          iconName: "folder",
          onClick: () => router.push("/transcriptions"),
          variant: pathname === "/transcriptions" ? "primary-button" : undefined,
        },
      ]}
      i18nStrings={{
        overflowMenuTriggerText: "Menu",
        overflowMenuTitleText: "Navigation",
        overflowMenuBackIconAriaLabel: "Back",
        overflowMenuDismissIconAriaLabel: "Close",
      }}
    />
  )
}
