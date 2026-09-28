import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  Button,
  ThemeIcon,
  Paper,
  Chip,
  TextInput,
  ActionIcon,
  Badge,
  Divider,
  Avatar,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { User, ArrowLeft, Save, Plus, X, BookOpen, Globe, Heart, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

const LANGUAGES = [
  "English", "Spanish", "French", "Japanese", "German",
  "Arabic", "Hindi", "Malayalam", "Chinese", "Korean",
  "Portuguese", "Italian", "Russian", "Turkish", "Bengali",
  "Tamil", "Punjabi", "Swedish", "Georgian", "Greek",
];

const GENRES = [
  "Fiction", "Non-Fiction", "Mystery", "Thriller", "Science Fiction",
  "Fantasy", "Romance", "Biography", "History", "Poetry",
  "Horror", "Self-Help", "Philosophy", "Travel", "Children",
  "Graphic Novel", "Drama", "Science", "Psychology", "Politics",
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [languages, setLanguages] = useState<string[]>(user?.preferredLanguages || []);
  const [genres, setGenres] = useState<string[]>(user?.preferredGenres || []);
  const [authors, setAuthors] = useState<string[]>(user?.favoriteAuthors || []);
  const [newAuthor, setNewAuthor] = useState('');
  const [saving, setSaving] = useState(false);

  const hasChanges =
    JSON.stringify(languages) !== JSON.stringify(user?.preferredLanguages || []) ||
    JSON.stringify(genres) !== JSON.stringify(user?.preferredGenres || []) ||
    JSON.stringify(authors) !== JSON.stringify(user?.favoriteAuthors || []);

  const addAuthor = () => {
    const name = newAuthor.trim();
    if (name && !authors.includes(name)) {
      setAuthors([...authors, name]);
      setNewAuthor('');
    }
  };

  const removeAuthor = (name: string) => {
    setAuthors(authors.filter(a => a !== name));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await apiRequest('PUT', '/api/user/preferences', {
        preferredLanguages: languages,
        preferredGenres: genres,
        favoriteAuthors: authors,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      notifications.show({
        title: 'Saved',
        message: 'Your preferences have been updated. Recommendations will refresh.',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save preferences',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.username
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <Box className="min-h-screen bg-gray-50">
      <div className="bg-[hsl(var(--primary))] text-white pt-12 pb-20 px-4 shadow-lg mb-[-3rem]">
        <Container size="md">
          <Group justify="space-between" align="center">
            <Group>
              <ActionIcon variant="white" color="violet" size="lg" radius="md" onClick={() => navigate('/')}>
                <ArrowLeft size={20} />
              </ActionIcon>
              <Title order={2} className="text-white font-display">Profile</Title>
            </Group>
            <Button
              leftSection={<Save size={16} />}
              variant="white"
              c="violet"
              disabled={!hasChanges}
              loading={saving}
              onClick={savePreferences}
            >
              Save Changes
            </Button>
          </Group>
        </Container>
      </div>

      <Container size="md" pb="xl">
        {/* User Info Card */}
        <Paper shadow="sm" radius="lg" p="xl" mb="lg" withBorder>
          <Group align="center" gap="lg">
            <Avatar size={80} radius="xl" color="violet" variant="filled">
              {initials}
            </Avatar>
            <Stack gap={4}>
              <Title order={3}>{user?.username}</Title>
              <Group gap="xs">
                {(user?.preferredLanguages || []).map(lang => (
                  <Badge key={lang} size="sm" variant="light" color="violet">{lang}</Badge>
                ))}
              </Group>
              <Text size="sm" c="dimmed">
                {(user?.preferredGenres || []).length} genres · {(user?.favoriteAuthors || []).length} favorite authors
              </Text>
            </Stack>
          </Group>
        </Paper>

        {/* Languages */}
        <Paper shadow="sm" radius="lg" p="xl" mb="lg" withBorder>
          <Group mb="md" gap="sm">
            <ThemeIcon size="md" color="violet" variant="light" radius="md">
              <Globe size={18} />
            </ThemeIcon>
            <Title order={4}>Preferred Languages</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Select the languages you read in. This affects book recommendations.
          </Text>
          <Chip.Group multiple value={languages} onChange={setLanguages}>
            <Group gap="xs">
              {LANGUAGES.map(lang => (
                <Chip key={lang} value={lang} color="violet" variant="outline" size="sm">
                  {lang}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Paper>

        {/* Genres */}
        <Paper shadow="sm" radius="lg" p="xl" mb="lg" withBorder>
          <Group mb="md" gap="sm">
            <ThemeIcon size="md" color="indigo" variant="light" radius="md">
              <BookOpen size={18} />
            </ThemeIcon>
            <Title order={4}>Preferred Genres</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Pick genres you enjoy. Recommendations are based on these.
          </Text>
          <Chip.Group multiple value={genres} onChange={setGenres}>
            <Group gap="xs">
              {GENRES.map(genre => (
                <Chip key={genre} value={genre} color="indigo" variant="outline" size="sm">
                  {genre}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Paper>

        {/* Favorite Authors */}
        <Paper shadow="sm" radius="lg" p="xl" mb="lg" withBorder>
          <Group mb="md" gap="sm">
            <ThemeIcon size="md" color="pink" variant="light" radius="md">
              <Heart size={18} />
            </ThemeIcon>
            <Title order={4}>Favorite Authors</Title>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Add authors you love. We'll include their books in your Discover feed.
          </Text>

          <Group gap="xs" mb="md">
            <TextInput
              placeholder="Add an author name…"
              value={newAuthor}
              onChange={e => setNewAuthor(e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && addAuthor()}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button size="sm" variant="light" color="violet" onClick={addAuthor} leftSection={<Plus size={14} />}>
              Add
            </Button>
          </Group>

          {authors.length > 0 ? (
            <Group gap="xs">
              {authors.map(name => (
                <Badge
                  key={name}
                  size="lg"
                  variant="light"
                  color="pink"
                  rightSection={
                    <ActionIcon size="xs" color="pink" variant="transparent" onClick={() => removeAuthor(name)}>
                      <X size={12} />
                    </ActionIcon>
                  }
                >
                  {name}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">No favorite authors yet</Text>
          )}
        </Paper>

        {/* Bottom Save Button */}
        {hasChanges && (
          <Group justify="center" mt="xl">
            <Button
              size="lg"
              leftSection={<Save size={18} />}
              loading={saving}
              onClick={savePreferences}
              color="violet"
            >
              Save Preferences
            </Button>
          </Group>
        )}
      </Container>
    </Box>
  );
}
