import { useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Tabs, 
  Grid, 
  Button, 
  Modal, 
  Group, 
  Loader, 
  Center,
  ThemeIcon,
  Indicator,
  Menu,
  ActionIcon,
  Stack,
  TextInput,
  Alert,
  Badge,
  Select,
  CloseButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, LibraryBig, ShoppingBag, BookMarked, Bell, Trash, Search, LogOut, Sparkles, RefreshCw } from 'lucide-react';
import { useBooks, useRecommendations } from '@/hooks/use-books';
import { useAuth } from '@/hooks/use-auth';
import { BookCard } from '@/components/BookCard';
import { BookForm } from '@/components/BookForm';
import { BookDetailsDrawer } from '@/components/BookDetailsDrawer';
import { RecommendationCard } from '@/components/RecommendationCard';
import { type Book } from '@shared/schema';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('purchased');
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [history, setHistory] = useState<NotificationMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpened, setSearchOpened] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverGenre, setDiscoverGenre] = useState<string | null>(null);
  const [discoverLang, setDiscoverLang] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('notifications_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (newHistory: NotificationMessage[]) => {
    setHistory(newHistory);
    localStorage.setItem('notifications_history', JSON.stringify(newHistory));
  };

  const addNotification = (title: string, message: string) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: Date.now()
    };
    saveHistory([newNotif, ...history]);
    setUnreadCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    saveHistory([]);
    setUnreadCount(0);
  };

  const { data: purchasedBooks, isLoading: loadingPurchased } = useBooks('purchased');
  const { data: wishlistBooks, isLoading: loadingWishlist } = useBooks('wishlist');
  const { 
    data: recommendations, 
    isLoading: loadingRecs, 
    error: recsError,
    isFetching: fetchingRecs,
  } = useRecommendations();

  useEffect(() => {
    const lastCheck = localStorage.getItem('last_wishlist_reminder');
    const now = new Date();
    const currentMonthYear = `${now.getMonth()}-${now.getFullYear()}`;

    if (lastCheck !== currentMonthYear && wishlistBooks && wishlistBooks.length > 0) {
      const title = 'Monthly Wishlist Reminder';
      const message = `Don't forget your reading goals! You have ${wishlistBooks.length} items in your wishlist. Ready to add a new one to your library?`;
      
      notifications.show({
        title,
        message,
        icon: <Bell size={18} />,
        color: 'violet',
        autoClose: false,
      });
      
      addNotification(title, message);
      localStorage.setItem('last_wishlist_reminder', currentMonthYear);
    }
  }, [wishlistBooks]);

  const isLoading = loadingPurchased || loadingWishlist;

  const filterBooks = (books?: Book[]) => {
    if (!books) return [];
    if (!searchQuery.trim()) return books;
    const query = searchQuery.toLowerCase().trim();
    return books.filter(book => 
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      (book.purchaseDate && book.purchaseDate.includes(query))
    );
  };

  const filteredPurchased = filterBooks(purchasedBooks);
  const filteredWishlist = filterBooks(wishlistBooks);
  const totalPurchased = purchasedBooks?.length || 0;
  const totalWishlist = wishlistBooks?.length || 0;

  const handleRefreshRecommendations = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
  };

  // Derive unique genre + language options from loaded recommendations
  const discoverGenreOptions = useMemo(() => {
    const genres = [...new Set((recommendations || []).map(b => b.genre).filter(Boolean))].sort();
    return genres.map(g => ({ value: g, label: g }));
  }, [recommendations]);

  const discoverLangOptions = useMemo(() => {
    const langs = [...new Set((recommendations || []).map(b => b.language).filter(Boolean))].sort();
    return langs.map(l => ({ value: l, label: l }));
  }, [recommendations]);

  // Client-side filter: title, author, description searched; genre + language exact match
  const filteredRecommendations = useMemo(() => {
    let list = recommendations || [];
    const q = discoverSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q) ||
        b.language.toLowerCase().includes(q)
      );
    }
    if (discoverGenre) list = list.filter(b => b.genre === discoverGenre);
    if (discoverLang)  list = list.filter(b => b.language === discoverLang);
    return list;
  }, [recommendations, discoverSearch, discoverGenre, discoverLang]);

  const hasDiscoverFilters = !!discoverSearch || !!discoverGenre || !!discoverLang;
  const clearDiscoverFilters = () => {
    setDiscoverSearch('');
    setDiscoverGenre(null);
    setDiscoverLang(null);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-20">
      {/* Header */}
      <div className="bg-[hsl(var(--primary))] text-white pt-16 pb-24 px-4 shadow-lg mb-[-4rem]">
        <Container size="lg">
          <Group justify="space-between" align="center" mb="xl">
            <Group>
              <ThemeIcon size={48} radius="md" variant="white" color="violet">
                <LibraryBig size={28} />
              </ThemeIcon>
              <div>
                <Title order={1} className="font-display font-light tracking-wide text-white">
                  My Library
                </Title>
                <Text c="white" size="sm" opacity={0.8}>
                  Welcome back, {user?.username} · Track your reading journey
                </Text>
              </div>
            </Group>
            
            <Group gap="md">
              <Group gap="xs">
                {searchOpened ? (
                  <TextInput
                    placeholder="Search books..."
                    size="sm"
                    radius="md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    autoFocus
                    onBlur={() => { if (!searchQuery) setSearchOpened(false); }}
                    rightSection={
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { setSearchQuery(''); setSearchOpened(false); }}>
                        <Trash size={14} />
                      </ActionIcon>
                    }
                    styles={{ input: { width: '200px' } }}
                  />
                ) : (
                  <ActionIcon variant="white" color="violet" size="lg" radius="md" onClick={() => setSearchOpened(true)}>
                    <Search size={20} />
                  </ActionIcon>
                )}

                <Menu shadow="md" width={300} position="bottom-end" onClose={() => setUnreadCount(0)}>
                  <Menu.Target>
                    <Indicator label={unreadCount} size={16} disabled={unreadCount === 0} color="red">
                      <ActionIcon variant="white" color="violet" size="lg" radius="md">
                        <Bell size={20} />
                      </ActionIcon>
                    </Indicator>
                  </Menu.Target>
                  <Menu.Dropdown p="xs">
                    <Group justify="space-between" mb="xs" px="xs">
                      <Text fw={600} size="sm">Notifications</Text>
                      {history.length > 0 && (
                        <ActionIcon variant="subtle" color="gray" size="sm" onClick={clearNotifications}>
                          <Trash size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                    <Menu.Divider />
                    {history.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" py="xl">No new notifications</Text>
                    ) : (
                      history.map((notif) => (
                        <Menu.Item key={notif.id} p="xs">
                          <Stack gap={2}>
                            <Text fw={500} size="xs">{notif.title}</Text>
                            <Text size="xs" c="dimmed" lineClamp={2}>{notif.message}</Text>
                          </Stack>
                        </Menu.Item>
                      ))
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Button 
                leftSection={<Plus size={18} />}
                onClick={open}
                size="md"
                variant="white"
                c="violet"
                className="font-semibold shadow-xl hover:shadow-2xl transition-all"
              >
                Add Book
              </Button>

              <ActionIcon
                variant="white"
                color="violet"
                size="lg"
                radius="md"
                title={`Sign out (${user?.username})`}
                loading={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut size={20} />
              </ActionIcon>
            </Group>
          </Group>
        </Container>
      </div>

      <Container size="lg">
        <Stack gap="lg">
          <Tabs 
            value={activeTab} 
            onChange={setActiveTab} 
            variant="outline"
            radius="md"
            classNames={{
              root: "bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden",
              list: "bg-gray-50 p-1 gap-1 border-b border-gray-100",
              tab: "data-[active]:bg-white data-[active]:shadow-sm data-[active]:text-violet-700 h-12 px-6 text-gray-500 font-medium border-0",
              panel: "p-6 min-h-[50vh]"
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="purchased" leftSection={<LibraryBig size={16} />}>
                Purchased ({totalPurchased})
              </Tabs.Tab>
              <Tabs.Tab value="wishlist" leftSection={<ShoppingBag size={16} />}>
                Wishlist ({totalWishlist})
              </Tabs.Tab>
              <Tabs.Tab value="discover" leftSection={<Sparkles size={16} />}>
                Discover
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="purchased">
              {isLoading ? (
                <Center py={50}><Loader color="violet" /></Center>
              ) : filteredPurchased.length === 0 ? (
                <EmptyState type="purchased" onAdd={open} isSearching={!!searchQuery} />
              ) : (
                <Grid>
                  {filteredPurchased.map((book) => (
                    <Grid.Col key={book.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                      <BookCard book={book} onOpenDetails={setSelectedBook} />
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="wishlist">
              {isLoading ? (
                <Center py={50}><Loader color="violet" /></Center>
              ) : filteredWishlist.length === 0 ? (
                <EmptyState type="wishlist" onAdd={open} isSearching={!!searchQuery} />
              ) : (
                <Grid>
                  {filteredWishlist.map((book) => (
                    <Grid.Col key={book.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                      <BookCard book={book} onOpenDetails={setSelectedBook} />
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="discover">
              <Stack gap="lg">
                {/* Header row */}
                <Group justify="space-between" align="flex-start">
                  <Stack gap={6}>
                    <Group gap="sm" align="center">
                      <Title order={3} className="font-display text-gray-800">
                        AI Book Recommendations
                      </Title>
                      {(user as any)?.preferredLanguages?.length > 0 && (
                        <Badge color="violet" variant="filled" size="sm" leftSection={<Sparkles size={10} />}>
                          Personalised
                        </Badge>
                      )}
                    </Group>
                    {(user as any)?.preferredLanguages?.length > 0 ? (
                      <Group gap="xs" wrap="wrap">
                        <Text size="xs" c="dimmed">Based on your languages:</Text>
                        {((user as any).preferredLanguages as string[]).map((lang: string) => (
                          <Badge key={lang} size="xs" color="violet" variant="light">{lang}</Badge>
                        ))}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Curated across multiple languages and cultures
                      </Text>
                    )}
                  </Stack>
                  <Button
                    variant="light"
                    color="violet"
                    size="sm"
                    leftSection={<RefreshCw size={14} className={fetchingRecs ? 'animate-spin' : ''} />}
                    onClick={handleRefreshRecommendations}
                    loading={fetchingRecs}
                  >
                    Refresh
                  </Button>
                </Group>

                {/* Search + filter row — only show once data is loaded */}
                {!loadingRecs && !recsError && (recommendations || []).length > 0 && (
                  <Group gap="sm" align="flex-end" wrap="wrap">
                    <TextInput
                      placeholder="Search title, author, genre…"
                      leftSection={<Search size={15} />}
                      rightSection={
                        discoverSearch ? (
                          <CloseButton size="sm" onClick={() => setDiscoverSearch('')} />
                        ) : null
                      }
                      value={discoverSearch}
                      onChange={(e) => setDiscoverSearch(e.currentTarget.value)}
                      style={{ flex: 1, minWidth: 180 }}
                      data-testid="input-discover-search"
                    />
                    <Select
                      placeholder="Genre"
                      data={discoverGenreOptions}
                      value={discoverGenre}
                      onChange={setDiscoverGenre}
                      clearable
                      style={{ width: 140 }}
                      data-testid="select-discover-genre"
                    />
                    <Select
                      placeholder="Language"
                      data={discoverLangOptions}
                      value={discoverLang}
                      onChange={setDiscoverLang}
                      clearable
                      style={{ width: 140 }}
                      data-testid="select-discover-language"
                    />
                    {hasDiscoverFilters && (
                      <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={clearDiscoverFilters}
                        data-testid="button-discover-clear-filters"
                      >
                        Clear
                      </Button>
                    )}
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {filteredRecommendations.length} of {(recommendations || []).length} books
                    </Text>
                  </Group>
                )}

                {recsError ? (
                  <Alert color="red" title="Could not load recommendations">
                    Something went wrong fetching recommendations. Please try again.
                  </Alert>
                ) : loadingRecs ? (
                  <Center py={80}>
                    <Stack align="center" gap="md">
                      <Loader color="violet" size="lg" />
                      <Text c="dimmed" size="sm">AI is curating books for you…</Text>
                    </Stack>
                  </Center>
                ) : filteredRecommendations.length === 0 && hasDiscoverFilters ? (
                  <Center py={60}>
                    <Stack align="center" gap="xs">
                      <Text c="dimmed" size="sm">No books match your search.</Text>
                      <Button variant="subtle" size="xs" color="violet" onClick={clearDiscoverFilters}>
                        Clear filters
                      </Button>
                    </Stack>
                  </Center>
                ) : (
                  <Grid>
                    {filteredRecommendations.map((book, i) => (
                      <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                        <RecommendationCard book={book} />
                      </Grid.Col>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      <Modal 
        opened={opened} 
        onClose={close} 
        title={<Text fw={700} size="lg" className="font-display">Add a New Book</Text>}
        centered
        size="md"
        radius="lg"
      >
        <BookForm onSuccess={close} onCancel={close} />
      </Modal>

      <BookDetailsDrawer 
        book={selectedBook} 
        onClose={() => setSelectedBook(null)} 
      />
    </div>
  );
}

function EmptyState({ type, onAdd, isSearching }: { type: 'purchased' | 'wishlist'; onAdd: () => void; isSearching?: boolean }) {
  if (isSearching) {
    return (
      <Center py={60} className="flex-col text-center">
        <Title order={3} mb="sm" className="font-display text-gray-700">No matches found</Title>
        <Text c="dimmed" maw={400}>Try searching with different keywords or check your spelling.</Text>
      </Center>
    );
  }

  return (
    <Center py={60} className="flex-col text-center">
      <div className="bg-gray-50 p-6 rounded-full mb-4">
        <BookMarked size={48} className="text-gray-300" />
      </div>
      <Title order={3} mb="sm" className="font-display text-gray-700">
        {type === 'purchased' ? 'Your shelves are empty' : 'Your wishlist is empty'}
      </Title>
      <Text c="dimmed" mb="xl" maw={400}>
        {type === 'purchased' 
          ? "Start building your digital library by adding books you've already bought." 
          : "Found something interesting? Add it to your wishlist so you don't forget."}
      </Text>
      <Button variant="light" color="violet" onClick={onAdd}>
        Add your first book
      </Button>
    </Center>
  );
}
