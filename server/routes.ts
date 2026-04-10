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
      const openaiInstance = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openaiInstance.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a world-class librarian and literary curator. Return a JSON object with a "books" array containing exactly 50 recently released (2020–2025) book recommendations spanning many different languages and cultures. Cover a wide variety of genres and at least 15 different languages/regions. Each object in the array must have these exact fields:
- title: string (use the original language title, not translated)
- author: string
- description: string (2–3 sentences max, in English)
- language: string (e.g. "English", "Spanish", "French", "Malayalam", "Japanese", "Arabic", "German", "Hindi", "Korean", "Portuguese", "Italian", "Turkish", "Russian", "Chinese", "Bengali")
- year: string (publication year between 2020 and 2025)
- genre: string (e.g. "Fiction", "Non-Fiction", "Mystery", "Science", "Biography", "Romance", "Thriller", "Poetry")

Return ONLY valid JSON with this structure: { "books": [...] }`
          },
          {
            role: "user",
            content: "Give me 50 diverse recent book recommendations from different languages and cultures published between 2020 and 2025."
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

      // Fetch cover images from Open Library in parallel (free, no API key)
      const withCovers = await Promise.all(
        bookList.map(async (book: any) => {
          try {
            // Use the English title for searching if original is non-Latin
            const searchTitle = encodeURIComponent(book.title.slice(0, 60));
            const searchAuthor = encodeURIComponent(book.author.split(' ').slice(-1)[0]); // last name
            const olRes = await fetch(
              `https://openlibrary.org/search.json?title=${searchTitle}&author=${searchAuthor}&limit=1&fields=cover_i,isbn`,
              { signal: AbortSignal.timeout(4000) }
            );
            if (olRes.ok) {
              const olData = await olRes.json();
              const doc = olData?.docs?.[0];
              if (doc?.cover_i) {
                return { ...book, coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` };
              }
              // Fallback: try ISBN cover if available
              if (doc?.isbn?.[0]) {
                return { ...book, coverUrl: `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg` };
              }
            }
          } catch {
            // timeout or network error — skip cover
          }
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
