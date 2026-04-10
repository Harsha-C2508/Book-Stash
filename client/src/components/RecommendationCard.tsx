import { Card, Image, Text, Badge, Group, Stack, Box, ActionIcon, Tooltip } from '@mantine/core';
import { BookOpen, PlusCircle } from 'lucide-react';
import type { Recommendation } from '@/hooks/use-books';
import { useCreateBook } from '@/hooks/use-books';

const languageColors: Record<string, string> = {
  English: 'blue',
  Spanish: 'orange',
  French: 'grape',
  Malayalam: 'teal',
  Japanese: 'red',
  Arabic: 'green',
  German: 'gray',
  Hindi: 'yellow',
  Portuguese: 'cyan',
  Chinese: 'pink',
  Korean: 'indigo',
  Italian: 'lime',
  Turkish: 'orange',
  Russian: 'red',
  Bengali: 'teal',
};

interface RecommendationCardProps {
  book: Recommendation;
}

export function RecommendationCard({ book }: RecommendationCardProps) {
  const langColor = languageColors[book.language] || 'violet';
  const createBook = useCreateBook();

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    createBook.mutate({
      title: book.title,
      author: book.author,
      status: 'wishlist',
      notes: book.description,
      coverUrl: book.coverUrl || '',
      imageUrl: book.coverUrl || '',
    });
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <Card.Section style={{ position: 'relative' }}>
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            height={220}
            alt={book.title}
            fit="cover"
            fallbackSrc={`https://placehold.co/300x220/7c3aed/white?text=${encodeURIComponent(book.title.slice(0, 20))}`}
          />
        ) : (
          <Box
            h={220}
            style={{ background: 'linear-gradient(135deg, #7c3aed22 0%, #4f46e522 100%)' }}
            className="flex items-center justify-center"
          >
            <Stack align="center" gap="xs">
              <BookOpen size={48} className="text-violet-300" />
              <Text size="xs" c="dimmed" ta="center" px="md" lineClamp={2}>{book.title}</Text>
            </Stack>
          </Box>
        )}

        {/* Add to Wishlist button — floating top-right */}
        <Tooltip label="Add to Wishlist" position="left" withArrow>
          <ActionIcon
            variant="filled"
            color="violet"
            size="lg"
            radius="xl"
            style={{ position: 'absolute', top: 8, right: 8 }}
            loading={createBook.isPending}
            onClick={handleAddToWishlist}
          >
            <PlusCircle size={20} />
          </ActionIcon>
        </Tooltip>
      </Card.Section>

      <Stack mt="md" gap="xs" style={{ flex: 1 }}>
        <Group gap="xs" wrap="wrap">
          <Badge color={langColor} variant="light" size="sm">
            {book.language}
          </Badge>
          <Badge color="violet" variant="outline" size="sm">
            {book.genre}
          </Badge>
          <Badge color="gray" variant="subtle" size="sm">
            {book.year}
          </Badge>
        </Group>

        <Text fw={700} size="md" className="font-display leading-tight line-clamp-2" title={book.title}>
          {book.title}
        </Text>

        <Text size="sm" c="dimmed" fs="italic">
          by {book.author}
        </Text>

        <Text size="sm" c="dimmed" lineClamp={3} mt="xs">
          {book.description}
        </Text>
      </Stack>
    </Card>
  );
}
