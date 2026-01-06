import { pgTable, text, serial, integer, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  status: text("status", { enum: ["purchased", "wishlist"] }).notNull().default("wishlist"),
  purchaseDate: date("purchase_date"),
  rating: integer("rating"), // 1-5
  notes: text("notes"),
  coverUrl: text("cover_url"),
  imageUrl: text("image_url"), // Added for file uploader
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookSchema = createInsertSchema(books).omit({ 
  id: true, 
  createdAt: true 
});

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export * from "./models/chat";
