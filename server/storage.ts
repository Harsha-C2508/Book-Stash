import { db } from "./db";
import {
  books,
  type InsertBook,
  type UpdateBook,
  type Book
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getBooks(status?: "purchased" | "wishlist"): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: UpdateBook): Promise<Book>;
  deleteBook(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getBooks(status?: "purchased" | "wishlist"): Promise<Book[]> {
    if (status) {
      return await db.select().from(books).where(eq(books.status, status)).orderBy(desc(books.createdAt));
    }
    return await db.select().from(books).orderBy(desc(books.createdAt));
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, updates: UpdateBook): Promise<Book> {
    const [updated] = await db.update(books)
      .set(updates)
      .where(eq(books.id, id))
      .returning();
    return updated;
  }

  async deleteBook(id: number): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }
}

export const storage = new DatabaseStorage();
