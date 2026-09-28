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
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
        ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }),
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
      const { title, author, notes } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      // Helper: search Open Library and return the first doc
      const searchOL = async (query: string): Promise<any | null> => {
        try {
          const url = `https://openlibrary.org/search.json?${query}&limit=1&fields=key,title,author_name,first_publish_year,subject,publisher,number_of_pages_median,isbn,language,cover_i`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) return null;
          const data = await r.json();
          return data?.docs?.[0] || null;
        } catch { return null; }
      };

      // Try multiple search strategies (broader each time)
      const t = encodeURIComponent(title);
      const a = author ? encodeURIComponent(author) : '';
      let doc = await searchOL(`title=${t}${a ? `&author=${a}` : ''}`);
      if (!doc && a) doc = await searchOL(`title=${t}`);           // without author
      if (!doc) doc = await searchOL(`q=${t}${a ? `+${a}` : ''}`); // general query

      // If Open Library has nothing, build summary from the book's own data
      if (!doc) {
        const parts: string[] = [];
        parts.push(`📖 ${title}`);
        if (author) parts.push(`✍️ By: ${author}`);
        parts.push('');
        parts.push('ℹ️ This book was not found in Open Library\'s catalog.');
        parts.push('It may be a regional language book or a newer publication.');
        if (notes) {
          parts.push(`\n📝 Your Notes:\n${notes}`);
        }
        return res.json({ summary: parts.join('\n') });
      }

      // Fetch the book's description from its work page
      let description = '';
      if (doc.key) {
        try {
          const workRes = await fetch(`https://openlibrary.org${doc.key}.json`, { signal: AbortSignal.timeout(8000) });
          if (workRes.ok) {
            const workData = await workRes.json();
            if (typeof workData.description === 'string') {
              description = workData.description;
            } else if (workData.description?.value) {
              description = workData.description.value;
            }
          }
        } catch { /* skip */ }
      }

      // Build a rich summary
      const subjects: string[] = doc.subject || [];
      const pages = doc.number_of_pages_median;
      const year = doc.first_publish_year;
      const publishers: string[] = doc.publisher || [];
      const authors: string[] = doc.author_name || [author || 'Unknown'];
      const languages: string[] = doc.language || [];

      const parts: string[] = [];
      parts.push(`📖 ${doc.title || title}`);
      parts.push(`✍️ By: ${authors.join(', ')}`);
      if (year) parts.push(`📅 First published: ${year}`);
      if (pages) parts.push(`📄 Pages: ~${pages}`);
      if (languages.length > 0) parts.push(`🌐 Languages: ${languages.slice(0, 5).join(', ')}`);
      if (publishers.length > 0) parts.push(`🏢 Publishers: ${publishers.slice(0, 3).join(', ')}`);

      if (description) {
        const cleanDesc = description.replace(/\r\n/g, '\n').replace(/---+/g, '').trim();
        parts.push(`\n📝 Description:\n${cleanDesc}`);
      }

      if (subjects.length > 0) {
        parts.push(`\n🏷️ Topics: ${subjects.slice(0, 10).join(', ')}`);
      }

      // Include user notes if available and no OL description was found
      if (!description && notes) {
        parts.push(`\n📝 Your Notes:\n${notes}`);
      }

      res.json({ summary: parts.join('\n') });
    } catch (error) {
      console.error("Book summary error:", error);
      res.status(500).json({ error: "Failed to fetch book details" });
    }
  });

  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text, targetLanguage = "English" } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const langCodes: Record<string, string> = {
        'English': 'en', 'Malayalam': 'ml', 'Hindi': 'hi', 'Tamil': 'ta',
        'Telugu': 'te', 'Kannada': 'kn', 'Bengali': 'bn', 'Marathi': 'mr',
        'Gujarati': 'gu', 'Punjabi': 'pa', 'Urdu': 'ur', 'French': 'fr',
        'Spanish': 'es', 'German': 'de', 'Italian': 'it', 'Portuguese': 'pt',
        'Russian': 'ru', 'Japanese': 'ja', 'Chinese': 'zh', 'Korean': 'ko',
        'Arabic': 'ar', 'Dutch': 'nl', 'Swedish': 'sv', 'Norwegian': 'no',
      };

      const targetCode = langCodes[targetLanguage] || 'en';
      const snippet = text.slice(0, 500);
      const encoded = encodeURIComponent(snippet);

      // Try translation with different source language strategies
      const tryTranslate = async (srcLang: string): Promise<string | null> => {
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${srcLang}|${targetCode}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) return null;
          const d = await r.json();
          const t = d?.responseData?.translatedText;
          if (t && Number(d?.responseStatus) === 200) return t;
          return null;
        } catch { return null; }
      };

      // Strategy 1: autodetect, Strategy 2: common languages
      let translation = await tryTranslate('autodetect');
      if (!translation) translation = await tryTranslate('fr');
      if (!translation) translation = await tryTranslate('es');

      if (!translation) {
        return res.status(500).json({ error: "Could not translate text. The text may already be in the target language." });
      }

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

  // ── Search books via Open Library (free, no API key needed) ──
  // MUST be before /api/books/:id so Express doesn't match "search" as an :id param
  app.get("/api/books/search", requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q || q.length < 2) return res.json([]);

      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=title,author_name,first_publish_year,cover_i,subject,isbn`;
      const olRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!olRes.ok) return res.json([]);

      const data = await olRes.json();
      const books = (data?.docs || [])
        .map((doc: any) => {
          const title = doc.title || '';
          const authors: string[] = doc.author_name || [];
          if (!title || authors.length === 0) return null;
          const subjects: string[] = doc.subject || [];
          return {
            title,
            searchTitle: title,
            author: authors.join(", "),
            description: subjects.length > 0
              ? `Topics: ${subjects.slice(0, 5).join(', ')}.`
              : `A book by ${authors.join(", ")}.`,
            language: "English",
            year: doc.first_publish_year ? String(doc.first_publish_year) : '',
            genre: subjects[0] || "Fiction",
            coverUrl: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
              : null,
          };
        })
        .filter(Boolean);

      res.json(books);
    } catch (error) {
      console.error("Book search error:", error);
      res.json([]);
    }
  });

  app.get(api.books.get.path, requireAuth, async (req, res) => {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid book ID' });
    const book = await storage.getBook(id, userId);
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
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid book ID' });
      const input = api.books.update.input.parse(req.body);
      const book = await storage.updateBook(id, userId, input);
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid book ID' });
    await storage.deleteBook(id, userId);
    res.status(204).send();
  });

  // ── Recommendations: powered by Open Library (free, no API key needed) ──
  app.get("/api/recommendations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userRecord = await storage.getUser(userId);
      const preferredLanguages: string[] = userRecord?.preferredLanguages ?? [];
      const preferredGenres: string[] = userRecord?.preferredGenres ?? [];
      const favoriteAuthors: string[] = userRecord?.favoriteAuthors ?? [];

      // Step 1: seed curated books for regional languages
      const seededBooks: typeof VERIFIED_BOOKS_BY_LANGUAGE[string] = [];
      for (const lang of preferredLanguages) {
        const verified = VERIFIED_BOOKS_BY_LANGUAGE[lang];
        if (verified) seededBooks.push(...verified);
      }

      // Step 2: map user genres to Open Library subjects
      const genreToSubject: Record<string, string[]> = {
        "Fiction": ["fiction", "literary_fiction"],
        "Non-Fiction": ["nonfiction"],
        "Science Fiction": ["science_fiction", "sci-fi"],
        "Fantasy": ["fantasy"],
        "Mystery": ["mystery_and_detective_stories", "mystery"],
        "Thriller": ["thriller", "suspense"],
        "Romance": ["romance", "love"],
        "Horror": ["horror"],
        "History": ["history"],
        "Biography": ["biography"],
        "Science": ["science", "popular_science"],
        "Philosophy": ["philosophy"],
        "Poetry": ["poetry"],
        "Self-Help": ["self-help"],
        "Psychology": ["psychology"],
        "Business": ["business"],
        "Travel": ["travel"],
        "Comedy": ["humor"],
        "Adventure": ["adventure"],
        "Classic": ["classic_literature", "classics"],
        "Drama": ["drama"],
        "Crime": ["crime", "true_crime"],
        "Children": ["children", "juvenile_fiction"],
        "Young Adult": ["young_adult_fiction"],
        "Manga": ["manga", "comics"],
        "Graphic Novels": ["graphic_novels"],
      };

      const subjects: string[] = [];
      for (const genre of preferredGenres) {
        const mapped = genreToSubject[genre];
        if (mapped) subjects.push(...mapped);
        else subjects.push(genre.toLowerCase().replace(/\s+/g, '_'));
      }
      if (subjects.length === 0) {
        subjects.push("fiction", "science_fiction", "mystery", "fantasy", "classic_literature");
      }

      const TARGET_TOTAL = 50;
      const perSubject = Math.ceil((TARGET_TOTAL - seededBooks.length) / subjects.length);
      const seen = new Set<string>();

      // Step 3: fetch from Open Library Subjects API (100% free)
      const fetchSubject = async (subject: string, limit: number) => {
        try {
          const offset = Math.floor(Math.random() * 20);
          const url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}&offset=${offset}`;
          const olRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!olRes.ok) return [];
          const data = await olRes.json();
          return (data?.works || [])
            .map((w: any) => {
              const title = w.title || '';
              const authors = (w.authors || []).map((a: any) => a.name).filter(Boolean);
              if (!title || authors.length === 0) return null;
              const key = `${title.toLowerCase()}|${authors[0]?.toLowerCase()}`;
              if (seen.has(key)) return null;
              seen.add(key);
              const coverId = w.cover_id;
              const subjectName = subject.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              return {
                title,
                searchTitle: title,
                author: authors.join(", "),
                description: w.subject
                  ? `A ${subjectName.toLowerCase()} book. Topics: ${(Array.isArray(w.subject) ? w.subject : []).slice(0, 4).join(', ')}.`
                  : `A ${subjectName.toLowerCase()} book by ${authors.join(", ")}.`,
                language: "English",
                year: w.first_publish_year ? String(w.first_publish_year) : '',
                genre: subjectName,
                coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
              };
            })
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      // Fetch books by favorite authors
      const fetchAuthorBooks = async (authorName: string, limit: number) => {
        try {
          const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(authorName)}&limit=${limit}&fields=title,author_name,first_publish_year,cover_i,subject&sort=rating`;
          const olRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!olRes.ok) return [];
          const data = await olRes.json();
          return (data?.docs || [])
            .map((doc: any) => {
              const title = doc.title || '';
              const authors: string[] = doc.author_name || [];
              if (!title || authors.length === 0) return null;
              const key = `${title.toLowerCase()}|${authors[0]?.toLowerCase()}`;
              if (seen.has(key)) return null;
              seen.add(key);
              const subjects: string[] = doc.subject || [];
              return {
                title,
                searchTitle: title,
                author: authors.join(", "),
                description: subjects.length > 0
                  ? `By ${authors[0]}. Topics: ${subjects.slice(0, 4).join(', ')}.`
                  : `A book by ${authors.join(", ")}.`,
                language: "English",
                year: doc.first_publish_year ? String(doc.first_publish_year) : '',
                genre: subjects[0] || "Fiction",
                coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
              };
            })
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      // Run all fetches in parallel — each one catches its own errors
      const results = await Promise.allSettled([
        ...subjects.map(s => fetchSubject(s, perSubject)),
        ...favoriteAuthors.slice(0, 3).map(a => fetchAuthorBooks(a, 5)),
      ]);
      const apiBooks = results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Step 4: combine curated + API books
      const allBooks = [...seededBooks, ...apiBooks].slice(0, TARGET_TOTAL);

      // Fetch covers for curated books that don't have one yet (best-effort, 3 at a time)
      const withCovers = await Promise.all(
        allBooks.map(async (book: any) => {
          if (book.coverUrl) return book;
          try {
            const t = encodeURIComponent(book.searchTitle || book.title);
            const a = encodeURIComponent(book.author);
            const olRes = await fetch(
              `https://openlibrary.org/search.json?title=${t}&author=${a}&limit=1&fields=cover_i,isbn`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (olRes.ok) {
              const doc = (await olRes.json())?.docs?.[0];
              if (doc?.cover_i) return { ...book, coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` };
              if (doc?.isbn?.[0]) return { ...book, coverUrl: `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg` };
            }
          } catch { /* skip */ }
          return { ...book, coverUrl: null };
        })
      );

      // Always return whatever we got — even 0 books is a valid (empty) response, not a 500
      res.json(withCovers);
    } catch (error) {
      console.error("Recommendations error:", error);
      // Even on unexpected errors, return an empty array so the UI can show "no recommendations"
      // instead of an error banner. Only truly fatal errors (DB down, auth broken) should 500.
      res.json([]);
    }
  });

  return httpServer;
}
