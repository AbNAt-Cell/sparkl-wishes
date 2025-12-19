# AGENTS.md

## Build & Development Commands
- `npm run dev` or `bun dev` - Start Vite dev server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- No test suite configured

## Architecture & Stack
**Frontend**: React 18 + TypeScript + Vite + Shadcn/ui  
**Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)  
**Payments**: Paystack (payment processing)  
**Data Fetching**: React Query v5  
**Forms**: React Hook Form + Zod validation  
**Styling**: Tailwind CSS + Shadcn/ui components  
**Routing**: React Router v6

## Key Codebase Structure
- `src/pages/` - Route pages (Dashboard, Wishlist, Share, Wallet, etc)
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/integrations/` - Supabase & payment integrations
- `src/lib/` - Utility functions
- `supabase/` - DB migrations and RLS policies

## Critical Security & Data Architecture
**User Data Isolation**: All queries must filter by `user_id = session.user.id` for private data  
**Public Sharing**: Wishlists shared via `share_code` with `is_public = true` check  
**Ownership Verification**: Always verify `session.user.id === wishlist.user_id` before edit/delete  
**RLS Policies**: Database enforces access control—never bypass in client code  
*Reference ARCHITECTURE.md for complete data flow, security checklist, and RLS policies*

## Code Style & Conventions
- **Imports**: Use path alias `@/` for src files (e.g., `import { Button } from "@/components/ui/button"`)
- **Components**: Functional React components with TypeScript
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Type Safety**: Enabled but relaxed (noImplicitAny/strictNullChecks disabled)
- **ESLint**: React hooks rules enforced; unused vars disabled
- **Error Handling**: Use Supabase error handling; avoid try-catch for RLS violations
- **Forms**: Use React Hook Form + Zod for all forms with validation schema
