import { db, pool } from "./db";
import {
  books,
  users,
  type InsertBook,
  type UpdateBook,
  type Book,
  type User,
  type InsertUser,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getBooks(userId: number, status?: "purchased" | "wishlist"): Promise<Book[]>;
  getBook(id: number, userId: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, userId: number, updates: UpdateBook): Promise<Book>;
  deleteBook(id: number, userId: number): Promise<void>;

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getBooks(userId: number, status?: "purchased" | "wishlist"): Promise<Book[]> {
    if (status) {
      return await db.select().from(books)
        .where(and(eq(books.userId, userId), eq(books.status, status)))
        .orderBy(desc(books.createdAt));
    }
    return await db.select().from(books)
      .where(eq(books.userId, userId))
      .orderBy(desc(books.createdAt));
  }

  async getBook(id: number, userId: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books)
      .where(and(eq(books.id, id), eq(books.userId, userId)));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, userId: number, updates: UpdateBook): Promise<Book> {
    const [updated] = await db.update(books)
      .set(updates)
      .where(and(eq(books.id, id), eq(books.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBook(id: number, userId: number): Promise<void> {
    await db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
}

export const storage = new DatabaseStorage();
