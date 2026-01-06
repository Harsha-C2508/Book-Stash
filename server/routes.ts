import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  app.post("/api/books/summary", async (req, res) => {
    try {
      const { title, author } = req.body;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
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
        max_completion_tokens: 1000,
      });

      res.json({ summary: response.choices[0].message.content });
    } catch (error) {
      console.error("AI Summary error:", error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  app.get(api.books.list.path, async (req, res) => {
    const status = req.query.status as "purchased" | "wishlist" | undefined;
    const books = await storage.getBooks(status);
    res.json(books);
  });

  app.get(api.books.get.path, async (req, res) => {
    const book = await storage.getBook(Number(req.params.id));
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  });

  app.post(api.books.create.path, async (req, res) => {
    try {
      const input = api.books.create.input.parse(req.body);
      const book = await storage.createBook(input);
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

  app.put(api.books.update.path, async (req, res) => {
    try {
      const input = api.books.update.input.parse(req.body);
      const book = await storage.updateBook(Number(req.params.id), input);
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

  app.delete(api.books.delete.path, async (req, res) => {
    await storage.deleteBook(Number(req.params.id));
    res.status(204).send();
  });

  // Seed data
  const existingBooks = await storage.getBooks();
  if (existingBooks.length === 0) {
    await storage.createBook({
      title: "The Pragmatic Programmer",
      author: "David Thomas & Andrew Hunt",
      status: "purchased",
      rating: 5,
      notes: "A must read for every developer.",
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    await storage.createBook({
      title: "Clean Code",
      author: "Robert C. Martin",
      status: "wishlist",
      notes: "Heard good things about this one."
    });
    await storage.createBook({
      title: "Project Hail Mary",
      author: "Andy Weir",
      status: "purchased",
      rating: 5,
      purchaseDate: "2024-01-15"
    });
  }

  return httpServer;
}
