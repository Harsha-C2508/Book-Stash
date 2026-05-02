import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Box,
  Chip,
  Stepper,
  ThemeIcon,
  Paper,
  SimpleGrid,
  Divider,
  Center,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  LibraryBig,
  BookOpen,
  Star,
  Globe,
  Heart,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

type Mode = "welcome" | "onboarding" | "login";

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

const AUTHORS_BY_LANGUAGE: Record<string, { name: string; knownFor: string }[]> = {
  English: [
    { name: "Stephen King", knownFor: "Horror, Thriller" },
    { name: "J.K. Rowling", knownFor: "Fantasy" },
    { name: "Neil Gaiman", knownFor: "Fantasy, Mythology" },
    { name: "Toni Morrison", knownFor: "Literary Fiction" },
    { name: "Cormac McCarthy", knownFor: "Literary Fiction" },
    { name: "Margaret Atwood", knownFor: "Dystopian Fiction" },
    { name: "John Grisham", knownFor: "Legal Thriller" },
    { name: "Agatha Christie", knownFor: "Mystery" },
    { name: "George R.R. Martin", knownFor: "Epic Fantasy" },
    { name: "Kazuo Ishiguro", knownFor: "Literary Fiction" },
  ],
  Spanish: [
    { name: "Gabriel García Márquez", knownFor: "Magical Realism" },
    { name: "Isabel Allende", knownFor: "Historical Fiction" },
    { name: "Mario Vargas Llosa", knownFor: "Literary Fiction" },
    { name: "Jorge Luis Borges", knownFor: "Literary Fiction" },
    { name: "Pablo Neruda", knownFor: "Poetry" },
    { name: "Carlos Ruiz Zafón", knownFor: "Gothic Fiction" },
    { name: "Arturo Pérez-Reverte", knownFor: "Historical Fiction" },
  ],
  French: [
    { name: "Albert Camus", knownFor: "Existentialism" },
    { name: "Victor Hugo", knownFor: "Historical Fiction" },
    { name: "Marcel Proust", knownFor: "Literary Fiction" },
    { name: "Simone de Beauvoir", knownFor: "Philosophy, Fiction" },
    { name: "Amélie Nothomb", knownFor: "Fiction" },
    { name: "Michel Houellebecq", knownFor: "Contemporary Fiction" },
  ],
  Japanese: [
    { name: "Haruki Murakami", knownFor: "Magical Realism" },
    { name: "Yukio Mishima", knownFor: "Literary Fiction" },
    { name: "Banana Yoshimoto", knownFor: "Contemporary Fiction" },
    { name: "Keigo Higashino", knownFor: "Mystery" },
    { name: "Yoko Ogawa", knownFor: "Literary Fiction" },
    { name: "Mieko Kawakami", knownFor: "Literary Fiction" },
  ],
  German: [
    { name: "Franz Kafka", knownFor: "Absurdist Fiction" },
    { name: "Thomas Mann", knownFor: "Literary Fiction" },
    { name: "Hermann Hesse", knownFor: "Philosophical Fiction" },
    { name: "Bernhard Schlink", knownFor: "Literary Fiction" },
    { name: "Daniel Kehlmann", knownFor: "Fiction" },
  ],
  Arabic: [
    { name: "Naguib Mahfouz", knownFor: "Literary Fiction" },
    { name: "Khalil Gibran", knownFor: "Poetry, Philosophy" },
    { name: "Nawal El Saadawi", knownFor: "Social Fiction" },
    { name: "Ahlam Mosteghanemi", knownFor: "Romance, Fiction" },
  ],
  Hindi: [
    { name: "Premchand", knownFor: "Social Fiction" },
    { name: "Amrita Pritam", knownFor: "Romance, Poetry" },
    { name: "Harivansh Rai Bachchan", knownFor: "Poetry" },
    { name: "Arundhati Roy", knownFor: "Literary Fiction" },
    { name: "Chetan Bhagat", knownFor: "Contemporary Fiction" },
  ],
  Malayalam: [
    { name: "M.T. Vasudevan Nair", knownFor: "Literary Fiction" },
    { name: "Vaikom Muhammad Basheer", knownFor: "Short Stories" },
    { name: "O.V. Vijayan", knownFor: "Literary Fiction" },
    { name: "Kamala Das (Madhavikutty)", knownFor: "Poetry, Autobiography" },
    { name: "N.S. Madhavan", knownFor: "Short Stories" },
    { name: "Benyamin", knownFor: "Contemporary Fiction" },
    { name: "Sarah Joseph", knownFor: "Social Fiction, Feminism" },
    { name: "K.R. Meera", knownFor: "Literary Fiction" },
    { name: "Thakazhi Sivasankara Pillai", knownFor: "Social Realism" },
    { name: "S.K. Pottekkat", knownFor: "Travel, Fiction" },
    { name: "Uroob (P.C. Kuttikrishnan)", knownFor: "Literary Fiction" },
    { name: "Kesavadev", knownFor: "Social Realism" },
    { name: "Lalithambika Antharjanam", knownFor: "Feminist Fiction" },
    { name: "Mukundan", knownFor: "Contemporary Fiction" },
    { name: "Paul Zacharia", knownFor: "Short Stories, Satire" },
    { name: "T.D. Ramakrishnan", knownFor: "Postmodern Fiction" },
    { name: "Perumbadavam Sreedharan", knownFor: "Historical Fiction" },
    { name: "C.V. Balakrishnan", knownFor: "Literary Fiction" },
    { name: "Kovilan", knownFor: "Literary Fiction" },
    { name: "Sugathakumari", knownFor: "Poetry, Environmentalism" },
    { name: "Ayyappa Paniker", knownFor: "Poetry, Modernism" },
    { name: "Akkitham Achuthan Namboothiri", knownFor: "Poetry" },
    { name: "G. Sankara Kurup", knownFor: "Poetry" },
    { name: "Sethu (C. Madhavan Pillai)", knownFor: "Literary Fiction" },
    { name: "Malayattoor Ramakrishnan", knownFor: "Literary Fiction" },
    { name: "K.P. Ramanunni", knownFor: "Philosophical Fiction" },
    { name: "Subhash Chandran", knownFor: "Literary Fiction" },
    { name: "V.K.N. (V.K. Narayana Menon)", knownFor: "Satire, Fiction" },
    { name: "Civic Chandran", knownFor: "Drama, Fiction" },
    { name: "E. Harikumar", knownFor: "Short Stories" },
    { name: "C. Radhakrishnan", knownFor: "Science Fiction, Literary" },
    { name: "Ponnkunnam Varkey", knownFor: "Short Stories" },
    { name: "Anand (P. Sachidanandan)", knownFor: "Experimental Fiction" },
    { name: "K.J. Baby", knownFor: "Tribal Fiction" },
    { name: "Unni R.", knownFor: "Short Stories" },
    { name: "S. Hareesh", knownFor: "Literary Fiction" },
    { name: "Vinoy Thomas", knownFor: "Literary Fiction" },
    { name: "Ambikasutan Mangad", knownFor: "Literary Fiction" },
    { name: "P. Valsala", knownFor: "Social Fiction" },
    { name: "M. Mukundan", knownFor: "Contemporary Fiction" },
    { name: "Nimna Vijay", knownFor: "Contemporary Fiction" },
    { name: "Akhil P Dharmajan", knownFor: "Contemporary Fiction" },
    { name: "Juliya Thomas", knownFor: "Contemporary Fiction" },
    { name: "Sheela Tomy", knownFor: "Literary Fiction" },
    { name: "Hareesh M.P.", knownFor: "Rural Fiction" },
    { name: "Biju Gopalan", knownFor: "Short Stories" },
    { name: "Rajesh Chandran", knownFor: "Thriller, Fiction" },
    { name: "Santhosh Echikkanam", knownFor: "Short Stories" },
    { name: "Rajeev Sivasankar", knownFor: "Contemporary Fiction" },
    { name: "Jisha Krishnan", knownFor: "Women's Fiction" },
    { name: "Manu S. Pillai", knownFor: "Historical Non-Fiction" },
    { name: "Vyshakh Mukundan", knownFor: "Contemporary Fiction" },
    { name: "Renjith Jayaraj", knownFor: "Fiction, Short Stories" },
    { name: "Shyama Sankar", knownFor: "Women's Fiction" },
    { name: "Thomas Joseph", knownFor: "Literary Fiction" },
    { name: "Priya A.S.", knownFor: "Contemporary Fiction" },
    { name: "Mahesh Gopal", knownFor: "Thriller, Mystery" },
    { name: "Divya S. Iyer", knownFor: "Contemporary Fiction" },
  ],
  Chinese: [
    { name: "Mo Yan", knownFor: "Literary Fiction" },
    { name: "Lu Xun", knownFor: "Literary Fiction" },
    { name: "Eileen Chang", knownFor: "Literary Fiction" },
    { name: "Yu Hua", knownFor: "Literary Fiction" },
    { name: "Liu Cixin", knownFor: "Science Fiction" },
  ],
  Korean: [
    { name: "Han Kang", knownFor: "Literary Fiction" },
    { name: "Kim Young-ha", knownFor: "Literary Fiction" },
    { name: "Cho Nam-joo", knownFor: "Social Fiction" },
    { name: "Bora Chung", knownFor: "Fantasy, Horror" },
  ],
  Portuguese: [
    { name: "José Saramago", knownFor: "Literary Fiction" },
    { name: "Fernando Pessoa", knownFor: "Poetry" },
    { name: "Paulo Coelho", knownFor: "Inspirational Fiction" },
    { name: "Clarice Lispector", knownFor: "Literary Fiction" },
  ],
  Italian: [
    { name: "Umberto Eco", knownFor: "Historical Fiction" },
    { name: "Elena Ferrante", knownFor: "Literary Fiction" },
    { name: "Italo Calvino", knownFor: "Magical Realism" },
    { name: "Primo Levi", knownFor: "Memoir, Fiction" },
  ],
  Russian: [
    { name: "Leo Tolstoy", knownFor: "Literary Fiction" },
    { name: "Fyodor Dostoevsky", knownFor: "Philosophical Fiction" },
    { name: "Anton Chekhov", knownFor: "Short Stories" },
    { name: "Mikhail Bulgakov", knownFor: "Satirical Fiction" },
  ],
  Turkish: [
    { name: "Orhan Pamuk", knownFor: "Literary Fiction" },
    { name: "Elif Shafak", knownFor: "Historical Fiction" },
    { name: "Sabahattin Ali", knownFor: "Literary Fiction" },
  ],
  Bengali: [
    { name: "Rabindranath Tagore", knownFor: "Poetry, Fiction" },
    { name: "Sarat Chandra Chattopadhyay", knownFor: "Social Fiction" },
    { name: "Humayun Ahmed", knownFor: "Contemporary Fiction" },
    { name: "Sunil Gangopadhyay", knownFor: "Literary Fiction" },
  ],
};

function WelcomeScreen({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <div className="min-h-screen flex">
      {/* Left — Welcome */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Box w="100%" maw={460}>
          <Stack gap="xl">
            <Group gap="sm">
              <ThemeIcon size={48} radius="xl" color="violet" variant="filled">
                <LibraryBig size={26} />
              </ThemeIcon>
              <Title order={2} className="font-display">My Library</Title>
            </Group>

            <Stack gap="sm">
              <Title order={1} className="font-display" style={{ fontSize: "2.2rem", lineHeight: 1.2 }}>
                Your personal reading companion
              </Title>
              <Text size="lg" c="dimmed">
                Track your books, discover new ones, and get AI-powered insights — all in one place.
              </Text>
            </Stack>

            <Stack gap="md">
              <Button
                size="lg"
                color="violet"
                rightSection={<ArrowRight size={18} />}
                onClick={onGetStarted}
                data-testid="button-get-started"
              >
                Get Started — it's free
              </Button>
              <Button
                size="md"
                variant="subtle"
                color="violet"
                leftSection={<User size={16} />}
                onClick={onSignIn}
                data-testid="button-sign-in"
              >
                Already have an account? Sign in
              </Button>
            </Stack>
          </Stack>
        </Box>
      </div>

      {/* Right — Hero */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-white"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
      >
        <Stack align="center" gap="xl" maw={400}>
          <ThemeIcon size={80} radius="xl" variant="white" color="violet">
            <LibraryBig size={44} />
          </ThemeIcon>
          <Stack align="center" gap="xs">
            <Title order={1} className="font-display font-light text-white text-center">
              My Library
            </Title>
            <Text size="lg" opacity={0.85} ta="center">
              Beautifully organised. Perfectly personal.
            </Text>
          </Stack>
          <Stack gap="md" w="100%">
            {[
              { icon: BookOpen, text: "Track books you've purchased and your wishlist" },
              { icon: Star, text: "Rate books and write personal notes" },
              { icon: Globe, text: "Discover books from 15+ languages worldwide" },
              { icon: Heart, text: "Get personalised AI recommendations" },
            ].map(({ icon: Icon, text }) => (
              <Paper
                key={text}
                p="md"
                radius="md"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-white shrink-0" />
                  <Text size="sm" c="white">{text}</Text>
                </div>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

function LoginScreen({ onBack }: { onBack: () => void }) {
  const { loginMutation } = useAuth();
  const form = useForm({
    initialValues: { username: "", password: "" },
    validate: {
      username: (v) => (v.trim().length < 1 ? "Username is required" : null),
      password: (v) => (v.length < 1 ? "Password is required" : null),
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <Box w="100%" maw={420}>
        <Stack gap="xl">
          <Group gap="sm">
            <ThemeIcon size={40} radius="xl" color="violet" variant="filled">
              <LibraryBig size={22} />
            </ThemeIcon>
            <Title order={3} className="font-display">My Library</Title>
          </Group>

          <Stack gap={4}>
            <Title order={2} className="font-display">Welcome back</Title>
            <Text c="dimmed" size="sm">Sign in to access your book collection</Text>
          </Stack>

          <form onSubmit={form.onSubmit((v) => loginMutation.mutate({ username: v.username, password: v.password }))}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="your_username"
                autoComplete="username"
                data-testid="input-username"
                {...form.getInputProps("username")}
              />
              <PasswordInput
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                data-testid="input-password"
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                fullWidth
                color="violet"
                size="md"
                loading={loginMutation.isPending}
                data-testid="button-login"
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <Divider />
          <Button variant="subtle" color="violet" leftSection={<ArrowLeft size={16} />} onClick={onBack}>
            Back to welcome
          </Button>
        </Stack>
      </Box>
    </div>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, registerMutation } = useAuth();
  const [mode, setMode] = useState<Mode>("welcome");
  const [onboardStep, setOnboardStep] = useState(0);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);

  const registerForm = useForm({
    initialValues: { username: "", password: "", confirmPassword: "" },
    validate: {
      username: (v) => (v.trim().length < 3 ? "At least 3 characters" : null),
      password: (v) => (v.length < 6 ? "At least 6 characters" : null),
      confirmPassword: (v, vals) => (v !== vals.password ? "Passwords do not match" : null),
    },
  });

  // Available authors based on selected languages
  const availableAuthors = selectedLanguages.flatMap(
    (lang) => AUTHORS_BY_LANGUAGE[lang] || []
  );

  const toggleAuthor = (name: string) => {
    setSelectedAuthors((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handleRegister = registerForm.onSubmit(async (values) => {
    registerMutation.mutate(
      { username: values.username, password: values.password },
      {
        onSuccess: async () => {
          // Save preferences after registration
          if (selectedLanguages.length || selectedGenres.length || selectedAuthors.length) {
            setSavingPrefs(true);
            try {
              await apiRequest("PUT", "/api/user/preferences", {
                preferredLanguages: selectedLanguages,
                preferredGenres: selectedGenres,
                favoriteAuthors: selectedAuthors,
              });
            } catch {
              // Non-critical — ignore
            } finally {
              setSavingPrefs(false);
            }
          }
        },
      }
    );
  });

  if (mode === "welcome") {
    return (
      <WelcomeScreen
        onGetStarted={() => setMode("onboarding")}
        onSignIn={() => setMode("login")}
      />
    );
  }

  if (mode === "login") {
    return <LoginScreen onBack={() => setMode("welcome")} />;
  }

  // ── Onboarding Mode ──────────────────────────────────────────────────────
  const stepLabels = ["Preferences", "Favourite Authors", "Create Account"];

  const canGoNextStep1 = selectedLanguages.length > 0 || selectedGenres.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-start justify-center p-6 pt-12">
      <Box w="100%" maw={700}>
        <Stack gap="xl">
          {/* Header */}
          <Group gap="sm" justify="center">
            <ThemeIcon size={44} radius="xl" color="violet" variant="filled">
              <LibraryBig size={24} />
            </ThemeIcon>
            <Title order={3} className="font-display">My Library</Title>
          </Group>

          {/* Stepper */}
          <Stepper active={onboardStep} color="violet" size="sm">
            {stepLabels.map((label) => (
              <Stepper.Step key={label} label={label} />
            ))}
          </Stepper>

          {/* Step Content */}
          <Paper shadow="sm" radius="xl" p="xl">
            {/* Step 0 — Language & Genre */}
            {onboardStep === 0 && (
              <Stack gap="xl">
                <Stack gap={4}>
                  <Group gap="xs">
                    <Globe size={20} className="text-violet-600" />
                    <Title order={3} className="font-display">What languages do you read?</Title>
                  </Group>
                  <Text c="dimmed" size="sm">Select all that apply — we'll personalise your experience</Text>
                </Stack>

                <Chip.Group multiple value={selectedLanguages} onChange={setSelectedLanguages}>
                  <Group gap="xs" wrap="wrap">
                    {LANGUAGES.map((lang) => (
                      <Chip key={lang} value={lang} color="violet" variant="outline" size="sm" data-testid={`chip-lang-${lang}`}>
                        {lang}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>

                <Divider />

                <Stack gap={4}>
                  <Group gap="xs">
                    <BookOpen size={20} className="text-violet-600" />
                    <Title order={3} className="font-display">Favourite genres</Title>
                  </Group>
                  <Text c="dimmed" size="sm">Pick the genres you enjoy most</Text>
                </Stack>

                <Chip.Group multiple value={selectedGenres} onChange={setSelectedGenres}>
                  <Group gap="xs" wrap="wrap">
                    {GENRES.map((genre) => (
                      <Chip key={genre} value={genre} color="indigo" variant="outline" size="sm" data-testid={`chip-genre-${genre}`}>
                        {genre}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Stack>
            )}

            {/* Step 1 — Favourite Authors */}
            {onboardStep === 1 && (
              <Stack gap="lg">
                <Stack gap={4}>
                  <Group gap="xs">
                    <Heart size={20} className="text-violet-600" />
                    <Title order={3} className="font-display">Pick your favourite authors</Title>
                  </Group>
                  <Text c="dimmed" size="sm">
                    {availableAuthors.length > 0
                      ? "Tap any author you love — select as many as you like"
                      : "No languages selected — showing popular authors from all languages"}
                  </Text>
                </Stack>

                <ScrollArea h={380} type="auto">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    {(availableAuthors.length > 0
                      ? availableAuthors
                      : Object.values(AUTHORS_BY_LANGUAGE).flat()
                    ).map(({ name, knownFor }) => {
                      const selected = selectedAuthors.includes(name);
                      return (
                        <Paper
                          key={name}
                          p="sm"
                          radius="md"
                          withBorder
                          style={{
                            cursor: "pointer",
                            borderColor: selected ? "var(--mantine-color-violet-5)" : undefined,
                            background: selected ? "var(--mantine-color-violet-0)" : undefined,
                            transition: "all 0.15s",
                          }}
                          onClick={() => toggleAuthor(name)}
                          data-testid={`card-author-${name.replace(/\s+/g, "-")}`}
                        >
                          <Group justify="space-between" wrap="nowrap">
                            <Stack gap={2}>
                              <Text fw={600} size="sm">{name}</Text>
                              <Text size="xs" c="dimmed">{knownFor}</Text>
                            </Stack>
                            {selected && (
                              <CheckCircle2 size={20} className="text-violet-600 shrink-0" />
                            )}
                          </Group>
                        </Paper>
                      );
                    })}
                  </SimpleGrid>
                </ScrollArea>

                {selectedAuthors.length > 0 && (
                  <Group gap="xs" wrap="wrap">
                    <Text size="xs" c="dimmed">Selected:</Text>
                    {selectedAuthors.map((a) => (
                      <Badge key={a} color="violet" variant="light" size="sm">{a}</Badge>
                    ))}
                  </Group>
                )}
              </Stack>
            )}

            {/* Step 2 — Create Account */}
            {onboardStep === 2 && (
              <Stack gap="lg">
                <Stack gap={4}>
                  <Group gap="xs">
                    <UserPlus size={20} className="text-violet-600" />
                    <Title order={3} className="font-display">Create your account</Title>
                  </Group>
                  <Text c="dimmed" size="sm">
                    Almost there! Set up your username and password to save your library.
                  </Text>
                </Stack>

                {(selectedLanguages.length > 0 || selectedGenres.length > 0) && (
                  <Paper p="sm" radius="md" bg="violet.0" withBorder style={{ borderColor: "var(--mantine-color-violet-2)" }}>
                    <Group gap="xs" wrap="wrap">
                      <Text size="xs" c="violet.7" fw={600}>Your preferences saved:</Text>
                      {selectedLanguages.slice(0, 4).map((l) => (
                        <Badge key={l} size="xs" color="violet" variant="filled">{l}</Badge>
                      ))}
                      {selectedGenres.slice(0, 3).map((g) => (
                        <Badge key={g} size="xs" color="indigo" variant="filled">{g}</Badge>
                      ))}
                      {selectedAuthors.length > 0 && (
                        <Badge size="xs" color="grape" variant="filled">
                          {selectedAuthors.length} author{selectedAuthors.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </Group>
                  </Paper>
                )}

                <form onSubmit={handleRegister}>
                  <Stack gap="md">
                    <TextInput
                      label="Username"
                      placeholder="choose_a_username"
                      autoComplete="username"
                      data-testid="input-username"
                      {...registerForm.getInputProps("username")}
                    />
                    <PasswordInput
                      label="Password"
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      data-testid="input-password"
                      {...registerForm.getInputProps("password")}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                      {...registerForm.getInputProps("confirmPassword")}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      color="violet"
                      size="md"
                      mt="xs"
                      loading={registerMutation.isPending || savingPrefs}
                      leftSection={<UserPlus size={18} />}
                      data-testid="button-create-account"
                    >
                      Create Account & Start Reading
                    </Button>
                  </Stack>
                </form>
              </Stack>
            )}
          </Paper>

          {/* Navigation */}
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="gray"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => {
                if (onboardStep === 0) setMode("welcome");
                else setOnboardStep((s) => s - 1);
              }}
              data-testid="button-back"
            >
              {onboardStep === 0 ? "Back to Welcome" : "Back"}
            </Button>

            {onboardStep < 2 && (
              <Button
                color="violet"
                rightSection={<ArrowRight size={16} />}
                onClick={() => setOnboardStep((s) => s + 1)}
                disabled={onboardStep === 0 && !canGoNextStep1}
                data-testid="button-next"
              >
                {onboardStep === 1 && selectedAuthors.length === 0 ? "Skip" : "Next"}
              </Button>
            )}

            {onboardStep === 0 && !canGoNextStep1 && (
              <Text size="xs" c="dimmed">Select at least one language or genre to continue</Text>
            )}
          </Group>

          {/* Sign in shortcut */}
          <Center>
            <Button variant="subtle" color="violet" size="xs" onClick={() => setMode("login")}>
              Already have an account? Sign in
            </Button>
          </Center>
        </Stack>
      </Box>
    </div>
  );
}
