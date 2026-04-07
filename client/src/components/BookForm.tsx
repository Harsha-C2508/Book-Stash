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
  Paper,
  Image as MantineImage
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useCreateBook } from '@/hooks/use-books';
import { type InsertBook } from '@shared/schema';
import { ObjectUploader } from './ObjectUploader';
import { useUpload } from '@/hooks/use-upload';

interface BookFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BookForm({ onSuccess, onCancel }: BookFormProps) {
  const createBook = useCreateBook();
  const { getUploadParameters, lastObjectPathRef } = useUpload();

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
    
    // Convert empty strings to null for optional fields to avoid DB errors
    const cleanedValues = {
      ...values,
      purchaseDate: values.purchaseDate && String(values.purchaseDate).trim() !== '' ? values.purchaseDate : null,
      coverUrl: values.coverUrl && String(values.coverUrl).trim() !== '' ? values.coverUrl : null,
      imageUrl: values.imageUrl && String(values.imageUrl).trim() !== '' ? values.imageUrl : null,
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
              onChange={(date) => {
                if (!date) {
                  form.setFieldValue('purchaseDate', null);
                } else if (typeof date === 'string') {
                  // Mantine sometimes passes a string directly
                  form.setFieldValue('purchaseDate', date.trim() || null);
                } else if (date instanceof Date && !isNaN(date.getTime())) {
                  // Format as YYYY-MM-DD using local time to match what user sees
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  form.setFieldValue('purchaseDate', `${year}-${month}-${day}`);
                } else {
                  form.setFieldValue('purchaseDate', null);
                }
              }}
              error={form.errors.purchaseDate}
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
                  // objectPath comes from our presign response (captured in
                  // lastObjectPathRef), not from GCS which returns an empty body.
                  const publicUrl = lastObjectPathRef.current;
                  if (publicUrl) {
                    form.setFieldValue('imageUrl', publicUrl);
                    form.setFieldValue('coverUrl', publicUrl);
                  }
                }
              }}
              buttonClassName="font-semibold shadow-sm hover-elevate active-elevate-2 transition-all"
            >
              Upload Cover
            </ObjectUploader>
          </Group>
          {form.values.imageUrl && (
            <Paper withBorder p="xs" radius="sm">
              <Stack gap="xs">
                <MantineImage 
                  src={form.values.coverUrl} 
                  h={100} 
                  fit="contain" 
                  radius="xs"
                  fallbackSrc="https://placehold.co/400x600?text=Preview+Error"
                />
                <Text size="xs" c="dimmed" truncate>
                  Uploaded: {form.values.imageUrl}
                </Text>
              </Stack>
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
