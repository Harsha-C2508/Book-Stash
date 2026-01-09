import { useForm } from '@mantine/form';
import { 
  TextInput, 
  Select, 
  NumberInput, 
  Textarea, 
  Button, 
  Group, 
  Stack,
  Text,
  Paper
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useCreateBook } from '@/hooks/use-books';
import { type InsertBook } from '@shared/schema';
import { ObjectUploader } from './ObjectUploader';
import { useUpload } from '@/hooks/use-upload';
import { IconUpload } from '@tabler/icons-react';

interface BookFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BookForm({ onSuccess, onCancel }: BookFormProps) {
  const createBook = useCreateBook();
  const { getUploadParameters } = useUpload();

  const form = useForm<InsertBook>({
    initialValues: {
      title: '',
      author: '',
      status: 'wishlist',
      rating: undefined,
      purchaseDate: undefined,
      notes: '',
      coverUrl: '',
      imageUrl: '',
    },
    validate: {
      title: (value) => (value.length < 1 ? 'Title is required' : null),
      author: (value) => (value.length < 1 ? 'Author is required' : null),
    },
  });

  const handleSubmit = (values: InsertBook) => {
    if (createBook.isPending) return;
    
    // Convert empty strings to null for optional date fields to avoid DB errors
    const cleanedValues = {
      ...values,
      purchaseDate: values.purchaseDate || null,
      coverUrl: values.coverUrl || null,
    };

    createBook.mutate(cleanedValues, {
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
              onChange={(date: any) => {
                form.setFieldValue('purchaseDate', date instanceof Date ? date.toISOString().split('T')[0] : '');
              }}
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

        <Stack gap="xs">
          <Text size="sm" fw={500}>Book Cover</Text>
          <Group align="flex-end">
            <TextInput
              label="Cover Image URL"
              placeholder="https://images.unsplash.com/..."
              style={{ flex: 1 }}
              {...form.getInputProps('coverUrl')}
            />
            <ObjectUploader
              onGetUploadParameters={getUploadParameters}
              onComplete={(result) => {
                if (result.successful?.[0]) {
                  const uploadResponse = result.successful[0].response?.body as any;
                  if (uploadResponse?.objectPath) {
                    form.setFieldValue('imageUrl', uploadResponse.objectPath);
                    // Also set coverUrl to the serving URL so it shows in the UI
                    const publicUrl = `/objects${uploadResponse.objectPath}`;
                    form.setFieldValue('coverUrl', publicUrl);
                  }
                }
              }}
            >
              <Button type="button" variant="light" color="violet" leftSection={<IconUpload size={16} />}>
                Upload
              </Button>
            </ObjectUploader>
          </Group>
          {form.values.imageUrl && (
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" truncate>
                Uploaded: {form.values.imageUrl}
              </Text>
            </Paper>
          )}
        </Stack>

        <Textarea
          label="Notes"
          placeholder="My thoughts on this book..."
          minRows={3}
          {...form.getInputProps('notes')}
        />

        <Group justify="flex-end" mt="md" gap="sm">
          <Button variant="outline" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={createBook.isPending}
            disabled={createBook.isPending}
            color="violet"
          >
            Add
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
