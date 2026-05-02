import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// ── Curated verified books by language ────────────────────────────────────────
// These are hand-verified real books used to seed recommendations when the user
// prefers a language where the AI tends to hallucinate specific titles.
// Only add books you are 100% certain exist with the correct title/author/year.
const VERIFIED_BOOKS_BY_LANGUAGE: Record<string, Array<{
  title: string; searchTitle: string; author: string;
  description: string; language: string; year: string; genre: string;
}>> = {
  Malayalam: [
    {
      title: "Aadujeevitham",
      searchTitle: "Goat Days",
      author: "Benyamin",
      description: "Based on a true story, a Keralite migrant worker is trapped in the Saudi Arabian desert as a goat herder. A harrowing tale of survival, isolation, and the indomitable human spirit.",
      language: "Malayalam", year: "2008", genre: "Fiction",
    },
    {
      title: "Aarachar",
      searchTitle: "Hangwoman",
      author: "K.R. Meera",
      description: "Chetna Grddha Mullick, descendant of a long line of executioners, is forced to become a hangwoman. A powerful meditation on justice, patriarchy, and power in modern India.",
      language: "Malayalam", year: "2012", genre: "Fiction",
    },
    {
      title: "Meesha",
      searchTitle: "Moustache",
      author: "S. Hareesh",
      description: "Winner of the Kerala Sahitya Akademi Award. A Dalit man's legendary moustache becomes a symbol of his power and a source of terror for the upper castes around him.",
      language: "Malayalam", year: "2018", genre: "Fiction",
    },
    {
      title: "Khasakkinte Itihasam",
      searchTitle: "The Legends of Khasak",
      author: "O.V. Vijayan",
      description: "A landmark of Malayalam literature. Set in the fictional village of Khasak, it weaves mythology, philosophy, and human longing into luminous prose.",
      language: "Malayalam", year: "1969", genre: "Fiction",
    },
    {
      title: "Chemmeen",
      searchTitle: "Chemmeen",
      author: "Thakazhi Sivasankara Pillai",
      description: "One of the greatest Malayalam novels, set among Kerala's fishing communities. A doomed love story between Karuthamma and Pareekutty that crosses the lines of caste and faith.",
      language: "Malayalam", year: "1956", genre: "Fiction",
    },
    {
      title: "Randamoozham",
      searchTitle: "Second Turn",
      author: "M.T. Vasudevan Nair",
      description: "A retelling of the Mahabharata from Bhima's perspective — the warrior who wins every battle yet lives in his brother Arjuna's shadow. A classic of Malayalam literature.",
      language: "Malayalam", year: "1984", genre: "Fiction",
    },
    {
      title: "Nalukettu",
      searchTitle: "Nalukettu",
      author: "M.T. Vasudevan Nair",
      description: "The story of Appunni, a young man who returns to reclaim his ancestral home and discovers the bitter legacy of a decaying joint family system in mid-century Kerala.",
      language: "Malayalam", year: "1958", genre: "Fiction",
    },
    {
      title: "Balyakalasakhi",
      searchTitle: "Balyakalasakhi",
      author: "Vaikom Muhammad Basheer",
      description: "A tender semi-autobiographical novella about a childhood friendship between a Hindu boy and a Muslim girl that blossoms into love, only to be separated by poverty and society.",
      language: "Malayalam", year: "1944", genre: "Fiction",
    },
    {
      title: "Francis Itty Cora",
      searchTitle: "Francis Itty Cora",
      author: "T.D. Ramakrishnan",
      description: "A dazzling postmodern thriller that spans three continents, blending history, mythology, and detective fiction as investigators trace a murder across time.",
      language: "Malayalam", year: "2009", genre: "Thriller",
    },
    {
      title: "Sugandhi Alias Andal Devanayaki",
      searchTitle: "Sugandhi Alias Andal Devanayaki",
      author: "T.D. Ramakrishnan",
      description: "A gripping political thriller that interweaves the story of an ancient Tamil freedom fighter with that of a modern woman fighting state violence, examining identity and sacrifice.",
      language: "Malayalam", year: "2012", genre: "Thriller",
    },
    {
      title: "Al Arabian Novel Factory",
      searchTitle: "Al Arabian Novel Factory",
      author: "T.D. Ramakrishnan",
      description: "A satirical meta-fiction set in Dubai, following a group of Keralite migrant workers who decide to write a novel. A sharp commentary on Gulf migration and literary ambition.",
      language: "Malayalam", year: "2013", genre: "Fiction",
    },
    {
      title: "Yakshi",
      searchTitle: "Yakshi",
      author: "Malayattoor Ramakrishnan",
      description: "A classic Malayalam horror thriller in which a scientist encounters a mysterious and seductive woman in his bungalow, drawing on deep Kerala folklore about the Yakshi spirit.",
      language: "Malayalam", year: "1967", genre: "Thriller",
    },
    {
      title: "Ntuppuppakkoranendarnnu",
      searchTitle: "Me Grandad Had an Elephant",
      author: "Vaikom Muhammad Basheer",
      description: "A beloved tragicomic masterpiece about the eccentric members of a Muslim family in Kerala — a story of love, loss, and the absurdity of everyday life told with irresistible charm.",
      language: "Malayalam", year: "1951", genre: "Fiction",
    },
    {
      title: "Ormayude Njarambu",
      searchTitle: "Yellow Is the Colour of Longing",
      author: "C.V. Balakrishnan",
      description: "A reflective novel tracing memories of a vanishing Kerala, its landscapes, communities, and ways of life as seen through the eyes of a man returning to his roots.",
      language: "Malayalam", year: "2016", genre: "Fiction",
    },
    {
      title: "Piravi",
      searchTitle: "Birth",
      author: "K.R. Meera",
      description: "A collection of short stories by K.R. Meera that explore the interior lives of women navigating grief, desire, and resistance in contemporary Kerala.",
      language: "Malayalam", year: "2015", genre: "Fiction",
    },
  ],
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerObjectStorageRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Public endpoint — called during onboarding before account creation
  app.get("/api/authors/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const languages = String(req.query.languages || "").trim();
      const genres = String(req.query.genres || "").trim();
      if (!q) return res.json([]);

      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const contextParts: string[] = [];
      if (languages) contextParts.push(`preferred languages: ${languages}`);
      if (genres) contextParts.push(`preferred genres: ${genres}`);
      const context = contextParts.length ? ` (User context — ${contextParts.join(", ")})` : "";

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a literary expert. Return a JSON object with an "authors" array of up to 8 REAL authors that best match the search query.${context} Each object must have exactly:
- name: string (full author name)
- knownFor: string (genre/style, e.g. "Literary Fiction, Short Stories")
- language: string (the primary language they write in)
Only include real, verifiable authors. If the query looks like a partial name, return authors whose names start with or closely match it. Return ONLY valid JSON: { "authors": [...] }`,
          },
          {
            role: "user",
            content: `Find authors matching: "${q}"`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0].message.content || '{"authors":[]}';
      const parsed = JSON.parse(raw);
      res.json(Array.isArray(parsed.authors) ? parsed.authors : []);
    } catch (err) {
      console.error("Author search error:", err);
      res.status(500).json({ error: "Failed to search authors" });
    }
  });

  app.put("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { preferredLanguages, preferredGenres, favoriteAuthors } = req.body;
      const updated = await storage.updateUserPreferences(userId, {
        preferredLanguages: preferredLanguages || [],
        preferredGenres: preferredGenres || [],
        favoriteAuthors: favoriteAuthors || [],
      });
      res.json(updated);
    } catch (err) {
      console.error("Preferences error:", err);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  app.post("/api/books/summary", requireAuth, async (req, res) => {
    try {
      const { title, author } = req.body;
      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful librarian. Provide a concise summary and key insights for the requested book. Always respond in the language the user might prefer based on context, or English as default."
          },
          {
            role: "user",
            content: `Please provide a summary and key details for the book "${title}" by ${author}.`
          }
        ],
      });

      const summary = response.choices[0].message.content || "Sorry, I couldn't generate a summary for this book.";
      res.json({ summary });
    } catch (error) {
      console.error("AI Summary error:", error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text, targetLanguage = "English" } = req.body;
      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text into ${targetLanguage}. Maintain the original tone and meaning.`
          },
          {
            role: "user",
            content: text
          }
        ],
      });

      const translation = response.choices[0].message.content || "Translation failed.";
      res.json({ translation });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Failed to translate text" });
    }
  });

  app.get(api.books.list.path, requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const status = req.query.status as "purchased" | "wishlist" | undefined;
    const books = await storage.getBooks(userId, status);
    res.json(books);
  });

  app.get(api.books.get.path, requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const book = await storage.getBook(Number(req.params.id), userId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  });

  app.post(api.books.create.path, requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const input = api.books.create.input.parse(req.body);
      const book = await storage.createBook({ ...input, userId });
      res.status(201).json(book);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.books.update.path, requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const input = api.books.update.input.parse(req.body);
      const book = await storage.updateBook(Number(req.params.id), userId, input);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
      res.json(book);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.books.delete.path, requireAuth, async (req, res) => {
    const userId = req.user!.id;
    await storage.deleteBook(Number(req.params.id), userId);
    res.status(204).send();
  });

  app.get("/api/recommendations", requireAuth, async (req, res) => {
    try {
      // Load user preferences so we can tailor the recommendations
      const userId = (req.user as any).id;
      const userRecord = await storage.getUser(userId);
      const preferredLanguages: string[] = userRecord?.preferredLanguages ?? [];
      const preferredGenres: string[] = userRecord?.preferredGenres ?? [];

      const hasPreferences = preferredLanguages.length > 0 || preferredGenres.length > 0;

      // ── Step 1: seed verified curated books for preferred languages ──────────
      // For regional languages (e.g. Malayalam) the AI hallucinates titles, so we
      // always anchor the list with hand-verified real books from our curated set.
      const seededBooks: typeof VERIFIED_BOOKS_BY_LANGUAGE[string] = [];
      for (const lang of preferredLanguages) {
        const verified = VERIFIED_BOOKS_BY_LANGUAGE[lang];
        if (verified) seededBooks.push(...verified);
      }

      // How many more books should the AI fill in?
      const TARGET_TOTAL = 50;
      const aiTarget = Math.max(TARGET_TOTAL - seededBooks.length, 15);

      // ── Step 2: build AI prompt for the remaining slots ──────────────────────
      const languagesForAI = preferredLanguages.length > 0
        // Exclude languages already covered by the curated set — AI fills the rest
        ? preferredLanguages.filter(l => !VERIFIED_BOOKS_BY_LANGUAGE[l])
        : [];

      const parts: string[] = [];
      if (languagesForAI.length > 0) {
        parts.push(`Preferred languages: ${languagesForAI.join(", ")}.`);
      }
      if (preferredGenres.length > 0) {
        parts.push(`Preferred genres: ${preferredGenres.join(", ")}.`);
      }
      // Do NOT ask the AI to recommend by specific author names — it reliably
      // hallucinates titles for regional/popular fiction authors it doesn't know well.
      const personalisationNote = parts.length > 0
        ? "\n\nUser preferences:\n" + parts.join("\n")
        : "";

      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a world-class librarian. Return a JSON object with a "books" array of exactly ${aiTarget} book recommendations. Each object must have:
- title: string (exact original-language title)
- searchTitle: string (English title or romanized version for cover image lookup)
- author: string (exact real author name)
- description: string (2–3 sentences in English)
- language: string (e.g. "English", "Spanish", "French", "Japanese", "Arabic", "German", "Hindi", "Korean", "Portuguese", "Italian", "Turkish", "Russian", "Chinese", "Bengali")
- year: string (4-digit publication year)
- genre: string

RULES — strictly follow:
1. Every book must be 100% real. Never invent a title or author.
2. Do NOT recommend books in Malayalam, Tamil, or other Indian regional languages — those are handled separately.
3. Recommend widely-known books from major world languages (English, Spanish, French, Japanese, Arabic, German, Korean, Portuguese, etc.).
4. Match the user's preferred genres as closely as possible.
5. Prefer books available on Google Books or Open Library.

Return ONLY valid JSON: { "books": [...] }${personalisationNote}`
          },
          {
            role: "user",
            content: `Give me ${aiTarget} book recommendations. Preferred genres: ${preferredGenres.length ? preferredGenres.join(", ") : "any"}. Only include books you are 100% certain are real.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0].message.content || '{"books":[]}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { books: [] };
      }

      // Robustly find the books array regardless of key name
      let bookList: any[] = [];
      if (Array.isArray(parsed)) {
        bookList = parsed;
      } else if (Array.isArray(parsed.books)) {
        bookList = parsed.books;
      } else if (Array.isArray(parsed.recommendations)) {
        bookList = parsed.recommendations;
      } else {
        const firstArray = Object.values(parsed).find(Array.isArray);
        bookList = (firstArray as any[]) || [];
      }

      // Helper: check whether two strings share at least one significant word
      function wordsOverlap(a: string, b: string): boolean {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const wa = norm(a).split(/\s+/).filter(w => w.length > 2);
        const wb = new Set(norm(b).split(/\s+/).filter(w => w.length > 2));
        return wa.some(w => wb.has(w));
      }

      // ── Step 3: combine seeded + AI books, then fetch covers ─────────────────
      // Seeded books come first (preferred language), AI books fill the rest.
      const allBooks = [...seededBooks, ...bookList];

      // Helper: check whether two strings share at least one significant word
      // Fetch cover images: try Google Books first, fall back to Open Library.
      // IMPORTANT: validate that the returned result actually matches the
      // requested book before accepting its cover — mismatches mean a wrong cover.
      const withCovers = await Promise.all(
        allBooks.map(async (book: any) => {
          const lookupTitle = (book.searchTitle || book.title).slice(0, 80);
          // Use full author name for better precision (not just last name)
          const lookupAuthor = book.author.slice(0, 60);

          // ── Step 1: Google Books API ──────────────────────────────────────
          try {
            const q = encodeURIComponent(`intitle:${lookupTitle} inauthor:${lookupAuthor}`);
            const gbRes = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (gbRes.ok) {
              const gbData = await gbRes.json();
              const items: any[] = gbData?.items || [];
              for (const item of items) {
                const info = item?.volumeInfo || {};
                const returnedTitle: string = info.title || '';
                const returnedAuthors: string[] = info.authors || [];
                // Validate: BOTH title AND author must overlap with what we
                // requested — a title-only match (e.g. "Sherlock" matching
                // Sherlock Holmes by Doyle) is not enough to trust the cover.
                const titleOk = wordsOverlap(returnedTitle, lookupTitle);
                const authorOk = returnedAuthors.some(a => wordsOverlap(a, lookupAuthor));
                if (!titleOk || !authorOk) continue; // skip — wrong book
                const imageLinks = info.imageLinks;
                const rawUrl = imageLinks?.thumbnail || imageLinks?.smallThumbnail;
                if (rawUrl) {
                  const coverUrl = rawUrl.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
                  return { ...book, coverUrl };
                }
              }
            }
          } catch { /* timeout — try next source */ }

          // ── Step 2: Open Library ──────────────────────────────────────────
          try {
            const t = encodeURIComponent(lookupTitle);
            const a = encodeURIComponent(lookupAuthor);
            const olRes = await fetch(
              `https://openlibrary.org/search.json?title=${t}&author=${a}&limit=3&fields=cover_i,isbn,title,author_name`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (olRes.ok) {
              const olData = await olRes.json();
              const docs: any[] = olData?.docs || [];
              for (const doc of docs) {
                const returnedTitle: string = doc.title || '';
                const returnedAuthors: string[] = doc.author_name || [];
                const titleOk = wordsOverlap(returnedTitle, lookupTitle);
                const authorOk = returnedAuthors.some((a: string) => wordsOverlap(a, lookupAuthor));
                if (!titleOk || !authorOk) continue; // skip — wrong book, require both
                if (doc.cover_i) {
                  return { ...book, coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` };
                }
                if (doc.isbn?.[0]) {
                  return { ...book, coverUrl: `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg` };
                }
              }
            }
          } catch { /* skip */ }

          return { ...book, coverUrl: null };
        })
      );

      res.json(withCovers);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  return httpServer;
}
