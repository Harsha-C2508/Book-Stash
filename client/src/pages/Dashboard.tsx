import { useState, useEffect } from 'react';
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
  TextInput
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, LibraryBig, ShoppingBag, BookMarked, Bell, Trash, Search } from 'lucide-react';
import { useBooks } from '@/hooks/use-books';
import { BookCard } from '@/components/BookCard';
import { BookForm } from '@/components/BookForm';
import { BookDetailsDrawer } from '@/components/BookDetailsDrawer';
import { type Book } from '@shared/schema';

interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string | null>('purchased');
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [history, setHistory] = useState<NotificationMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch both lists (react-query handles caching so this is efficient)
  const { data: purchasedBooks, isLoading: loadingPurchased } = useBooks('purchased');
  const { data: wishlistBooks, isLoading: loadingWishlist } = useBooks('wishlist');

  useEffect(() => {
    // Basic notification check
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
  
  // Calculate stats
  const totalPurchased = purchasedBooks?.length || 0;
  const totalWishlist = wishlistBooks?.length || 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-20">
      {/* Header Section */}
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
                  Track your reading journey and future discoveries
                </Text>
              </div>
            </Group>
            
            <Group gap="md">
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
            </Group>
          </Group>
        </Container>
      </div>

      <Container size="lg">
        <Stack gap="lg">
          <TextInput
            placeholder="Search by title, author, or year..."
            size="md"
            radius="md"
            leftSection={<Search size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="shadow-sm"
            styles={{
              input: {
                backgroundColor: 'white',
                border: '1px solid hsl(var(--border))'
              }
            }}
          />

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
        <Title order={3} mb="sm" className="font-display text-gray-700">
          No matches found
        </Title>
        <Text c="dimmed" maw={400}>
          Try searching with different keywords or check your spelling.
        </Text>
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
