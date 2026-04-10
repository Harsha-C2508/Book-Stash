import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertBook, type UpdateBook } from "@shared/schema";
import { notifications } from "@mantine/notifications";

export function useBooks(status?: 'purchased' | 'wishlist') {
  return useQuery({
    queryKey: [api.books.list.path, status],
    queryFn: async () => {
      // Build URL with optional status param
      const url = status 
        ? `${api.books.list.path}?status=${status}` 
        : api.books.list.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch books");
      return api.books.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBook) => {
      const res = await fetch(api.books.create.path, {
        method: api.books.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create book");
      }
      
      return api.books.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      notifications.show({
        title: 'Success',
        message: 'Book added to your collection',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    }
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateBook) => {
      const url = buildUrl(api.books.update.path, { id });
      const res = await fetch(url, {
        method: api.books.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update book");
      return api.books.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      notifications.show({
        title: 'Updated',
        message: 'Book updated successfully',
        color: 'blue',
      });
    },
  });
}

export interface Recommendation {
  title: string;
  author: string;
  description: string;
  language: string;
  year: string;
  genre: string;
  coverUrl: string | null;
}

export function useRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/recommendations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // cache for 10 minutes so AI isn't called on every click
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.delete.path, { id });
      const res = await fetch(url, {
        method: api.books.delete.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete book");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      notifications.show({
        title: 'Deleted',
        message: 'Book removed from library',
        color: 'gray',
      });
    },
  });
}
