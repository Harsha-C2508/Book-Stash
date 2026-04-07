# My Library — Personal Book Collection Tracker

A full-stack web application for managing your personal book collection. Track books you've purchased, maintain a reading wishlist, upload cover images, get AI-generated summaries, and translate your notes — all from a clean, modern dashboard.

---

## Features

### Book Management
- **Add books** with title, author, status, purchase date, star rating, cover image, and personal notes
- **Two collections** — Purchased library and a Wishlist, displayed as separate tabs
- **Book cards** show the cover image, title, author, badge (Purchased / Wishlist), star rating, purchase date, and a snippet of your notes
- **Move books between lists** — promote a wishlist item to Purchased (auto-fills today's date) or demote a purchased book back to Wishlist, directly from the card
- **Star rating** — rate purchased books 1–5 directly on the card, updates instantly
- **Delete books** with a single click from the card

### Book Details Drawer
- Click any book card to open a side drawer with full details
- Displays the cover image, title, author, status badge, rating, purchase date, and your full notes
- **AI Summary** — automatically generated when you open the drawer using GPT-4o; covers plot summary, themes, narrative style, cultural context, awards, and adaptations
- **Translate Notes** — one-click translation of your personal notes into English using GPT-4o; result appears inline below the original

### Cover Image Upload
- Upload a book cover image directly from the Add Book form
- Uses a two-step presigned URL flow: your server obtains a Google Cloud Storage presigned URL, then the image is uploaded directly from the browser to cloud storage
- Image preview appears in the form after a successful upload
- Alternatively, paste any external image URL manually into the Cover Image URL field

### Search
- Expandable search bar in the header — click the search icon to reveal it
- Searches across book title, author, and purchase date in real time
- Collapses automatically when cleared

### Notifications & Reminders
- **Monthly Wishlist Reminder** — once per calendar month, if your wishlist has items, a notification toast appears encouraging you to check your reading goals
- **Notification Bell** — shows a red unread count badge; click to open a dropdown history of all past notifications with their titles and messages
- Notification history is persisted in browser `localStorage` so it survives page refreshes
- Clear all notifications with the trash icon inside the dropdown

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Wouter | Client-side routing |
| TanStack React Query v5 | Server state management and caching |
| Mantine v8 | Primary UI component library (forms, modals, drawers, tabs, cards, notifications) |
| shadcn/ui (Radix UI) | Secondary UI primitives |
| Tailwind CSS | Utility-first styling |
| Uppy | File upload UI with progress |
| Lucide React | Icons |
| Tabler Icons | Additional icons |
| dayjs | Date formatting |
| Playfair Display + Inter | Typography (Google Fonts) |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server |
| TypeScript (ESM modules) | Language |
| Drizzle ORM | Type-safe PostgreSQL queries |
| drizzle-zod | Schema-derived Zod validators |
| Zod | Runtime request validation |
| OpenAI SDK (GPT-4o) | AI summaries and note translation |

### Infrastructure
| Service | Purpose |
|---|---|
| PostgreSQL | Primary database (via `DATABASE_URL`) |
| Google Cloud Storage | Book cover image storage (via Replit Object Storage) |
| Vite | Frontend dev server with Hot Module Replacement |
| esbuild | Production server bundler |

---

## Database Schema

All books are stored in a single `books` table in PostgreSQL:

| Column | Type | Required | Description |
|---|---|---|---|
| `id` | serial (auto-increment) | Yes | Primary key |
| `title` | text | Yes | Book title |
| `author` | text | Yes | Author name |
| `status` | text enum | Yes | `purchased` or `wishlist` |
| `purchase_date` | date | No | Date the book was purchased (YYYY-MM-DD) |
| `rating` | integer | No | Star rating from 1 to 5 |
| `notes` | text | No | Personal notes or thoughts |
| `cover_url` | text | No | Cover image URL (external URL or uploaded path) |
| `image_url` | text | No | Internal path of the uploaded cover image in object storage |
| `created_at` | timestamp | Auto | Record creation timestamp |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/books` | List all books; optional `?status=purchased` or `?status=wishlist` filter |
| `GET` | `/api/books/:id` | Get a single book by ID |
| `POST` | `/api/books` | Create a new book |
| `PUT` | `/api/books/:id` | Update an existing book |
| `DELETE` | `/api/books/:id` | Delete a book |
| `POST` | `/api/books/summary` | Generate an AI summary for a book (`{ title, author }`) |
| `POST` | `/api/translate` | Translate text to English (`{ text, targetLanguage }`) |
| `POST` | `/api/uploads/request-url` | Request a presigned GCS upload URL (`{ name, size, contentType }`) |
| `GET` | `/objects/:objectPath` | Serve a file from object storage |

---

## File Upload Flow

1. User selects an image file in the Uppy modal inside the Add Book form
2. The browser calls `POST /api/uploads/request-url` with the file name, size, and content type
3. The server generates a Google Cloud Storage presigned URL and returns it along with the `objectPath`
4. The browser uploads the file directly to GCS using the presigned URL (no file data passes through the server)
5. On upload completion, the `objectPath` (captured at presign time) is set on both `coverUrl` and `imageUrl` fields in the form
6. When the book is saved, the path is stored in the database and used to serve the image via `/objects/:objectPath`

---

## AI Features

Both AI features use **GPT-4o** via Replit's OpenAI AI Integration (no manual API key required — usage is billed to Replit AI credits).

### AI Book Summary
- Triggered automatically when a book details drawer opens
- System prompt instructs the model to behave as a librarian
- Returns: plot summary, themes, narrative style, cultural context, awards, and notable adaptations
- Displayed in a scrollable area within the drawer
- Supports any language — responds in the most contextually appropriate language

### Note Translation
- Translates the user's personal notes into English
- Uses a professional-translator system prompt to preserve tone and meaning
- Translated result appears inline below the original notes with a violet highlight
- Only shown when the book has notes; translate button disappears once translated

---

## Project Structure

```
├── client/
│   └── src/
│       ├── components/
│       │   ├── BookCard.tsx         # Individual book card with actions
│       │   ├── BookDetailsDrawer.tsx # Side drawer with AI summary & translation
│       │   ├── BookForm.tsx         # Add book form with date picker & uploader
│       │   └── ObjectUploader.tsx   # Uppy-based file upload component
│       ├── hooks/
│       │   ├── use-books.ts         # React Query hooks for book CRUD
│       │   └── use-upload.ts        # Presigned URL upload hook
│       ├── pages/
│       │   └── Dashboard.tsx        # Main dashboard with tabs, search, notifications
│       └── lib/
│           └── queryClient.ts       # Configured TanStack Query client
├── server/
│   ├── index.ts                     # Express app entry point
│   ├── routes.ts                    # API route handlers
│   ├── storage.ts                   # Database access layer (Drizzle)
│   └── replit_integrations/
│       └── object_storage/          # GCS upload route + service
├── shared/
│   ├── schema.ts                    # Drizzle table schema + Zod types (shared)
│   └── routes.ts                    # Typed API route definitions
├── migrations/                      # Drizzle-generated SQL migrations
└── script/
    └── build.ts                     # Production build script
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (managed by Replit AI Integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (managed by Replit AI Integration) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | GCS bucket identifier (managed by Replit Object Storage) |
| `PRIVATE_OBJECT_DIR` | Private upload directory path |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Public asset search paths |
| `SESSION_SECRET` | Session signing secret |

---

## Running Locally

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server (Express + Vite with HMR)
npm run dev
```

The app runs on **port 5000**. The Vite dev server and Express backend are served from the same port — no proxy configuration needed.

### Production Build

```bash
npm run build
npm start
```

- Client is built to `dist/public` by Vite
- Server is bundled to `dist/index.cjs` by esbuild

---

## Seed Data

On first run, if the database is empty, three sample books are automatically inserted:
- *The Pragmatic Programmer* by David Thomas & Andrew Hunt — Purchased, rated 5
- *Clean Code* by Robert C. Martin — Wishlist, with a note
- *Project Hail Mary* by Andy Weir — Purchased, rated 5, with a purchase date
