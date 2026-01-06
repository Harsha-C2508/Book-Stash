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
  ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Plus, LibraryBig, ShoppingBag, BookMarked, Bell } from 'lucide-react';
import { useBooks } from '@/hooks/use-books';
import { BookCard } from '@/components/BookCard';
import { BookForm } from '@/components/BookForm';
import { BookDetailsDrawer } from '@/components/BookDetailsDrawer';
import { type Book } from '@shared/schema';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string | null>('purchased');
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Fetch both lists (react-query handles caching so this is efficient)
  const { data: purchasedBooks, isLoading: loadingPurchased } = useBooks('purchased');
  const { data: wishlistBooks, isLoading: loadingWishlist } = useBooks('wishlist');

  useEffect(() => {
    // Basic notification check - could be more robust with a proper backend-driven notification system
    const lastCheck = localStorage.getItem('last_wishlist_reminder');
    const now = new Date();
    const currentMonthYear = `${now.getMonth()}-${now.getFullYear()}`;

    if (lastCheck !== currentMonthYear && wishlistBooks && wishlistBooks.length > 0) {
      notifications.show({
        title: 'Monthly Wishlist Reminder',
        message: `Don't forget your reading goals! You have ${wishlistBooks.length} items in your wishlist. Ready to add a new one to your library?`,
        icon: <Bell size={18} />,
        color: 'violet',
        autoClose: false,
      });
      localStorage.setItem('last_wishlist_reminder', currentMonthYear);
    }
  }, [wishlistBooks]);

  const isLoading = loadingPurchased || loadingWishlist;
  
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
        </Container>
      </div>

      <Container size="lg">
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
            ) : purchasedBooks?.length === 0 ? (
              <EmptyState type="purchased" onAdd={open} />
            ) : (
              <Grid>
                {purchasedBooks?.map((book) => (
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
            ) : wishlistBooks?.length === 0 ? (
              <EmptyState type="wishlist" onAdd={open} />
            ) : (
              <Grid>
                {wishlistBooks?.map((book) => (
                  <Grid.Col key={book.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                    <BookCard book={book} onOpenDetails={setSelectedBook} />
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Tabs.Panel>
        </Tabs>
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

function EmptyState({ type, onAdd }: { type: 'purchased' | 'wishlist'; onAdd: () => void }) {
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
