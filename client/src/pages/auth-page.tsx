import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Paper,
  Tabs,
  Center,
  ThemeIcon,
  Box,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { LibraryBig, BookOpen, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>("login");

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);

  const loginForm = useForm({
    initialValues: { username: "", password: "" },
    validate: {
      username: (v) => (v.trim().length < 1 ? "Username is required" : null),
      password: (v) => (v.length < 1 ? "Password is required" : null),
    },
  });

  const registerForm = useForm({
    initialValues: { username: "", password: "", confirmPassword: "" },
    validate: {
      username: (v) => (v.trim().length < 3 ? "Username must be at least 3 characters" : null),
      password: (v) => (v.length < 6 ? "Password must be at least 6 characters" : null),
      confirmPassword: (v, values) =>
        v !== values.password ? "Passwords do not match" : null,
    },
  });

  const handleLogin = loginForm.onSubmit((values) => {
    loginMutation.mutate({ username: values.username, password: values.password });
  });

  const handleRegister = registerForm.onSubmit((values) => {
    registerMutation.mutate({ username: values.username, password: values.password });
  });

  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <Box w="100%" maw={420}>
          <Stack gap="xl">
            <Stack gap={4}>
              <Title order={2} className="font-display">Welcome to My Library</Title>
              <Text c="dimmed" size="sm">
                {activeTab === "login"
                  ? "Sign in to access your book collection"
                  : "Create an account to start tracking your books"}
              </Text>
            </Stack>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List grow mb="xl">
                <Tabs.Tab value="login">Sign In</Tabs.Tab>
                <Tabs.Tab value="register">Create Account</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="login">
                <form onSubmit={handleLogin}>
                  <Stack gap="md">
                    <TextInput
                      label="Username"
                      placeholder="your_username"
                      autoComplete="username"
                      {...loginForm.getInputProps("username")}
                    />
                    <PasswordInput
                      label="Password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...loginForm.getInputProps("password")}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      color="violet"
                      size="md"
                      mt="sm"
                      loading={loginMutation.isPending}
                    >
                      Sign In
                    </Button>
                  </Stack>
                </form>
                <Divider my="lg" label="New here?" labelPosition="center" />
                <Button
                  variant="subtle"
                  color="violet"
                  fullWidth
                  onClick={() => setActiveTab("register")}
                >
                  Create an account
                </Button>
              </Tabs.Panel>

              <Tabs.Panel value="register">
                <form onSubmit={handleRegister}>
                  <Stack gap="md">
                    <TextInput
                      label="Username"
                      placeholder="your_username"
                      autoComplete="username"
                      {...registerForm.getInputProps("username")}
                    />
                    <PasswordInput
                      label="Password"
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      {...registerForm.getInputProps("password")}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      {...registerForm.getInputProps("confirmPassword")}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      color="violet"
                      size="md"
                      mt="sm"
                      loading={registerMutation.isPending}
                    >
                      Create Account
                    </Button>
                  </Stack>
                </form>
                <Divider my="lg" label="Already have an account?" labelPosition="center" />
                <Button
                  variant="subtle"
                  color="violet"
                  fullWidth
                  onClick={() => setActiveTab("login")}
                >
                  Sign in instead
                </Button>
              </Tabs.Panel>
            </Tabs>
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
              Your personal reading companion
            </Text>
          </Stack>

          <Stack gap="md" w="100%">
            {[
              { icon: BookOpen, text: "Track books you've purchased and your wishlist" },
              { icon: Star, text: "Rate books and write personal notes" },
              { icon: LibraryBig, text: "Get AI-generated summaries for any book instantly" },
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
