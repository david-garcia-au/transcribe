# Project Structure

## Directory Organization

```
/app                 # Next.js App Router directory
  layout.tsx         # Root layout with font configuration
  page.tsx           # Home page component
  globals.css        # Global styles
  favicon.ico        # Site favicon

/public              # Static assets (SVGs, images)

/node_modules        # Dependencies (managed by npm)
```

## Architecture Patterns

- **App Router**: Using Next.js 14+ App Router convention
- **Server Components**: Default to React Server Components
- **File-based Routing**: Routes defined by file structure in `/app`
- **Colocation**: Components, styles, and logic colocated within `/app`

## Conventions

- TypeScript for all code files (`.tsx` for components, `.ts` for utilities)
- React functional components with TypeScript types
- CSS modules or Tailwind classes for styling
- Font configuration using `next/font/google` (Geist Sans, Geist Mono)

## Path Aliases

- `@/*` - Root directory alias for cleaner imports
