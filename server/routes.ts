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
      const favoriteAuthors: string[] = userRecord?.favoriteAuthors ?? [];

      const hasPreferences = preferredLanguages.length > 0 || preferredGenres.length > 0;

      // Build a personalisation instruction to inject into the prompt
      let personalisationNote = "";
      if (hasPreferences) {
        const parts: string[] = [];
        if (preferredLanguages.length > 0) {
          parts.push(`The user prefers books in these languages: ${preferredLanguages.join(", ")}. Include books in these languages when you are 100% certain the title and author are real and accurate — do NOT invent titles just to fill the language quota. It is better to recommend a verified English book than a hallucinated regional-language title.`);
        }
        if (preferredGenres.length > 0) {
          parts.push(`The user enjoys these genres: ${preferredGenres.join(", ")}. Prioritise these genres.`);
        }
        if (favoriteAuthors.length > 0) {
          parts.push(`The user's favourite authors include: ${favoriteAuthors.join(", ")}. Include books by these authors only if you are certain the specific title exists. Also recommend authors who write in a similar style.`);
        }
        personalisationNote = "\n\nPersonalisation instructions:\n" + parts.join("\n");
      }

      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a world-class librarian and literary curator. Return a JSON object with a "books" array containing exactly 50 book recommendations. Each object must have these exact fields:
- title: string (exact original-language title of the book)
- searchTitle: string (the English translated title or romanized/transliterated version — used for cover image lookup)
- author: string (exact real author name)
- description: string (2–3 sentences in English describing the book)
- language: string (e.g. "English", "Spanish", "French", "Malayalam", "Japanese", "Arabic", "German", "Hindi", "Korean", "Portuguese", "Italian", "Turkish", "Russian", "Chinese", "Bengali")
- year: string (publication year as a 4-digit string)
- genre: string (e.g. "Fiction", "Non-Fiction", "Mystery", "Science", "Biography", "Romance", "Thriller", "Poetry")

CRITICAL RULES — you must follow these exactly:
1. Every single book must be 100% real and verifiable. Never invent or hallucinate a title or author. If you are not completely certain a book exists, omit it.
2. Only recommend books published between 2015 and 2024. Do not include books from 2025.
3. The title and author must be exactly correct — no approximations or made-up names.
4. For non-English languages (especially regional languages like Malayalam, Tamil, Bengali, Hindi), only include books you are highly confident about. If unsure, replace with a well-known title from a major language you are certain about.
5. Prefer books that are widely available on Google Books or Open Library.

Return ONLY valid JSON: { "books": [...] }${personalisationNote}`
          },
          {
            role: "user",
            content: hasPreferences
              ? "Give me 50 personalised book recommendations based on my language and genre preferences. Only include books you are 100% certain are real."
              : "Give me 50 diverse book recommendations from different languages and cultures. Only include books you are 100% certain are real."
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

      // Fetch cover images: try Google Books first, fall back to Open Library.
      // IMPORTANT: validate that the returned result actually matches the
      // requested book before accepting its cover — mismatches mean a wrong cover.
      const withCovers = await Promise.all(
        bookList.map(async (book: any) => {
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
