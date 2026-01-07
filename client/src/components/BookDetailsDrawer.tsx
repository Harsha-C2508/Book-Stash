import { 
  Drawer, 
  Stack, 
  Text, 
  Image, 
  Badge, 
  Group, 
  Title, 
  Button,
  LoadingOverlay,
  Box,
  Divider,
  ScrollArea
} from '@mantine/core';
import { type Book } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

interface BookDetailsDrawerProps {
  book: Book | null;
  onClose: () => void;
}

export function BookDetailsDrawer({ book, onClose }: BookDetailsDrawerProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [translatedNotes, setTranslatedNotes] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Reset and auto-generate summary when book changes
  useEffect(() => {
    setAiSummary(null);
    setTranslatedNotes(null);
    setLoadingAi(false);
    setTranslating(false);
    
    if (book) {
      generateSummary();
    }
  }, [book?.id]);

  const translateNotes = async () => {
    if (!book?.notes) return;
    setTranslating(true);
    try {
      const res = await apiRequest('POST', '/api/translate', { 
        text: book.notes,
        targetLanguage: 'English'
      });
      const data = await res.json();
      setTranslatedNotes(data.translation);
    } catch (error) {
      console.error('Failed to translate:', error);
    } finally {
      setTranslating(false);
    }
  };

  const generateSummary = async () => {
    if (!book) return;
    setLoadingAi(true);
    try {
      const res = await apiRequest('POST', '/api/books/summary', { 
        title: book.title, 
        author: book.author 
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <Drawer 
      opened={!!book} 
      onClose={onClose} 
      title="Book Details" 
      position="right" 
      size="xl"
      padding="xl"
    >
      {book && (
        <Stack gap="lg">
          <Box pos="relative">
            <Image 
              src={book.coverUrl || 'https://placehold.co/400x600?text=No+Cover'} 
              radius="md" 
              alt={book.title}
              h={400}
              fit="contain"
            />
          </Box>

          <Stack gap="xs">
            <Title order={2}>{book.title}</Title>
            <Text size="lg" c="dimmed">{book.author}</Text>
          </Stack>

          <Group gap="xs">
            <Badge color={book.status === 'purchased' ? 'green' : 'blue'}>
              {book.status === 'purchased' ? 'Purchased' : 'Wishlist'}
            </Badge>
            {book.rating && (
              <Badge variant="outline" color="yellow">
                Rating: {book.rating}/5
              </Badge>
            )}
          </Group>

          {book.notes && (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text fw={600}>Your Notes</Text>
                {!translatedNotes && (
                  <Button 
                    variant="subtle" 
                    size="compact-xs" 
                    color="violet"
                    onClick={translateNotes}
                    loading={translating}
                  >
                    Translate
                  </Button>
                )}
              </Group>
              <Text size="sm">{book.notes}</Text>
              {translatedNotes && (
                <Box p="xs" style={{ backgroundColor: 'var(--mantine-color-violet-light)', borderRadius: 'var(--mantine-radius-sm)' }}>
                  <Text size="xs" fw={700} mb={4} c="violet">Translation:</Text>
                  <Text size="sm" italic>{translatedNotes}</Text>
                </Box>
              )}
            </Stack>
          )}

          <Divider />

          <Stack gap="md" pos="relative" mih={150}>
            <LoadingOverlay 
              visible={loadingAi} 
              overlayProps={{ blur: 2 }}
              loaderProps={{ color: 'violet' }}
            />
            <Group justify="space-between">
              <Title order={4}>AI Summary & Details</Title>
            </Group>
            
            {aiSummary ? (
              <ScrollArea h={300}>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {aiSummary}
                </Text>
              </ScrollArea>
            ) : !loadingAi && (
              <Text size="sm" c="dimmed">
                {loadingAi ? 'Generating summary...' : 'Failed to generate summary.'}
              </Text>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
