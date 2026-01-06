# My Library - Book Collection Tracker

## Overview

A personal book collection management application that allows users to track purchased books and maintain a wishlist. Users can add books with details like title, author, cover images, ratings, and notes. The app provides a clean dashboard interface to view and manage books across two categories: purchased and wishlist.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: Dual component library approach
  - Mantine v8 for primary UI components (forms, modals, cards, tabs)
  - shadcn/ui components built on Radix UI primitives (available but secondary)
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Typography**: Playfair Display (headings) and Inter (body text)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Route Definitions**: Centralized in `shared/routes.ts` with Zod validation schemas

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with output to `./migrations`
- **Connection**: Uses `DATABASE_URL` environment variable

### File Upload System
- **Client**: Uppy with AWS S3 presigned URL uploads
- **Backend**: Google Cloud Storage integration via Replit Object Storage
- **Flow**: Two-step presigned URL pattern (request URL, then direct upload)
- **Routes**: `/api/uploads/request-url` for obtaining presigned URLs

### Build System
- **Development**: Vite dev server with HMR
- **Production Build**: 
  - Client: Vite builds to `dist/public`
  - Server: esbuild bundles to `dist/index.cjs`
- **Script**: Custom `script/build.ts` handles full build process

### API Structure
The API follows a typed contract pattern:
- Route definitions in `shared/routes.ts` include method, path, input/output schemas
- Server implements routes in `server/routes.ts`
- Client hooks in `client/src/hooks/use-books.ts` consume the API with type safety

Current endpoints:
- `GET /api/books` - List books (optional status filter)
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

## External Dependencies

### Database
- PostgreSQL (required, via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe queries

### Cloud Storage
- Google Cloud Storage for file uploads
- Replit Object Storage integration (sidecar at `127.0.0.1:1106`)

### UI Libraries
- Mantine v8 (core, dates, notifications, hooks, form)
- Radix UI primitives (via shadcn/ui)
- Lucide React and Tabler Icons for iconography

### Key Runtime Dependencies
- Express for HTTP server
- Zod for runtime validation
- TanStack React Query for data fetching
- dayjs for date handling
- Uppy for file uploads