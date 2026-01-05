import { useForm } from '@mantine/form';
import { 
  TextInput, 
  Select, 
  NumberInput, 
  Textarea, 
  Button, 
  Group, 
  Stack 
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useCreateBook } from '@/hooks/use-books';
import { type InsertBook } from '@shared/schema';

interface BookFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BookForm({ onSuccess, onCancel }: BookFormProps) {
  const createBook = useCreateBook();

  const form = useForm<InsertBook>({
    initialValues: {
      title: '',
      author: '',
      status: 'wishlist',
      rating: undefined,
      purchaseDate: undefined, // string in schema (date), but Date object for input
      notes: '',
      coverUrl: '',
    },
    validate: {
      title: (value) => (value.length < 1 ? 'Title is required' : null),
      author: (value) => (value.length < 1 ? 'Author is required' : null),
    },
  });

  const handleSubmit = (values: InsertBook) => {
    // Transform Date object to string if needed by backend, though Zod coerce usually handles it.
    // Drizzle date type expects string "YYYY-MM-DD" or Date object.
    createBook.mutate(values, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="The Great Gatsby"
          withAsterisk
          {...form.getInputProps('title')}
        />
        
        <TextInput
          label="Author"
          placeholder="F. Scott Fitzgerald"
          withAsterisk
          {...form.getInputProps('author')}
        />

        <Select
          label="Status"
          data={[
            { value: 'wishlist', label: 'Wishlist' },
            { value: 'purchased', label: 'Purchased' },
          ]}
          {...form.getInputProps('status')}
        />

        {form.values.status === 'purchased' && (
          <>
            <DateInput
              label="Purchase Date"
              placeholder="Pick date"
              clearable
              value={form.values.purchaseDate ? new Date(form.values.purchaseDate) : null}
              onChange={(date) => form.setFieldValue('purchaseDate', date ? date.toISOString().split('T')[0] : undefined)}
            />
            
            <NumberInput
              label="Rating (1-5)"
              placeholder="5"
              min={1}
              max={5}
              {...form.getInputProps('rating')}
            />
          </>
        )}

        <TextInput
          label="Cover Image URL (Optional)"
          placeholder="https://images.unsplash.com/..."
          description="Use an Unsplash URL for best results"
          {...form.getInputProps('coverUrl')}
        />

        <Textarea
          label="Notes"
          placeholder="My thoughts on this book..."
          minRows={3}
          {...form.getInputProps('notes')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={createBook.isPending}
            bg="var(--primary)"
          >
            Add Book
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
