import { Card, Image, Text, Badge, Button, Group, ActionIcon, Rating, Stack, Box } from '@mantine/core';
import { Trash2, BookOpen, Heart, Calendar } from 'lucide-react';
import { type Book } from '@shared/schema';
import { useDeleteBook, useUpdateBook } from '@/hooks/use-books';
import dayjs from 'dayjs';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book, onOpenDetails }: { book: Book; onOpenDetails?: (book: Book) => void }) {
  const deleteBook = useDeleteBook();
  const updateBook = useUpdateBook();

  const isWishlist = book.status === 'wishlist';

  const handleStatusChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBook.mutate({
      id: book.id,
      status: isWishlist ? 'purchased' : 'wishlist',
      purchaseDate: isWishlist ? new Date().toISOString().split('T')[0] : undefined
    });
  };

  const handleRatingChange = (value: number) => {
    updateBook.mutate({ id: book.id, rating: value });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBook.mutate(book.id);
  };

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="md" 
      withBorder
      className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      onClick={() => onOpenDetails?.(book)}
    >
      <Card.Section>
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            height={200}
            alt={book.title}
            fit="cover"
          />
        ) : (
          <Box h={200} bg="var(--mantine-color-gray-1)" className="flex items-center justify-center">
             <BookOpen size={48} className="text-gray-300" />
          </Box>
        )}
      </Card.Section>

      <Stack mt="md" mb="auto" gap="xs">
        <Group justify="space-between" align="start">
          <Text fw={700} size="lg" className="font-display leading-tight line-clamp-2" title={book.title}>
            {book.title}
          </Text>
          <Badge color={isWishlist ? 'orange' : 'teal'} variant="light">
            {isWishlist ? 'Wishlist' : 'Purchased'}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed" fs="italic">
          by {book.author}
        </Text>

        {!isWishlist && (
          <Group gap={4}>
            <Rating value={book.rating || 0} onChange={handleRatingChange} size="sm" />
            {book.purchaseDate && (
              <Text size="xs" c="dimmed" ml="auto" className="flex items-center gap-1">
                <Calendar size={12} />
                {dayjs(book.purchaseDate).format('MMM YYYY')}
              </Text>
            )}
          </Group>
        )}

        {book.notes && (
          <Text size="sm" lineClamp={3} c="dimmed" mt="xs">
            "{book.notes}"
          </Text>
        )}
      </Stack>

      <Group mt="xl">
        <Button 
          flex={1} 
          variant="light" 
          color={isWishlist ? 'teal' : 'orange'} 
          onClick={handleStatusChange}
          leftSection={isWishlist ? <BookOpen size={16} /> : <Heart size={16} />}
        >
          {isWishlist ? 'Mark Purchased' : 'Move to Wishlist'}
        </Button>
        
        <ActionIcon 
          variant="subtle" 
          color="red" 
          onClick={handleDelete}
          loading={deleteBook.isPending}
          aria-label="Delete book"
        >
          <Trash2 size={18} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
