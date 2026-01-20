import {
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Menu,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrandDiscord,
  IconCreditCard,
  IconCrown,
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { LoginScreen } from "./components/LoginScreen";
import { Navigation } from "./components/Navigation";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsAndConditions } from "./components/TermsAndConditions";
import { useAuth } from "./hooks/useAuth";
import { useSettings } from "./hooks/useSettings";
import { useSubscription } from "./hooks/useSubscription";
import { CollectionPage } from "./pages/CollectionPage";
import { CommunityPage } from "./pages/CommunityPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { UserCollectionPage } from "./pages/UserCollectionPage";
import { getImageUrl } from "./utils/fileHelpers";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { subscription } = useSubscription();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark");
  const { updateTheme } = useSettings();
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const navigate = useNavigate();

  // Store the latest updateTheme and setColorScheme in refs
  const updateThemeRef = useRef(updateTheme);
  const setColorSchemeRef = useRef(setColorScheme);
  updateThemeRef.current = updateTheme;
  setColorSchemeRef.current = setColorScheme;

  const toggleColorScheme = useCallback(() => {
    const newScheme = computedColorScheme === "dark" ? "light" : "dark";

    // Update the saved theme preference first (this also calls setColorScheme internally)
    if (user) {
      updateThemeRef.current(newScheme).catch((err) => {
        console.error("Failed to save theme preference:", err);
        // Fallback: save to localStorage if database update fails
        localStorage.setItem("themePreference", newScheme);
        setColorSchemeRef.current(newScheme);
      });
    } else {
      // For unauthenticated users, save to localStorage
      localStorage.setItem("themePreference", newScheme);
      setColorSchemeRef.current(newScheme);
    }
  }, [computedColorScheme, user]);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Burger
                opened={drawerOpened}
                onClick={toggleDrawer}
                hiddenFrom="sm"
                size="sm"
              />
              <Anchor
                component={Link}
                to="/"
                underline="never"
                style={{ flexShrink: 0 }}
              >
                <Group gap="xs" align="center" wrap="nowrap">
                  <img
                    src="/logo.svg"
                    alt="NumisGallery"
                    height={40}
                    width={40}
                    style={{ display: "block", flexShrink: 0 }}
                  />
                  <Title
                    order={2}
                    style={{
                      fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    NumisGallery
                  </Title>
                </Group>
              </Anchor>
            </Group>

            <Group
              style={{ flex: 1, justifyContent: "center", minWidth: 0 }}
              visibleFrom="sm"
            >
              <Navigation />
            </Group>

            <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Anchor
                href="https://discord.gg/7dJD6Wb7"
                target="_blank"
                rel="noopener noreferrer"
                title="Join our Discord community"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--mantine-color-sage-6)",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--mantine-color-gray-4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--mantine-color-sage-6)";
                }}
              >
                <IconBrandDiscord size={24} strokeWidth={1.5} />
              </Anchor>

              <ActionIcon
                variant="transparent"
                onClick={toggleColorScheme}
                title={
                  computedColorScheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                size="lg"
                style={{ border: "none", background: "transparent" }}
              >
                {computedColorScheme === "dark" ? (
                  <IconSun size={18} color="var(--mantine-color-yellow-6)" />
                ) : (
                  <IconMoon size={18} color="#000" />
                )}
              </ActionIcon>

              {user ? (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <ActionIcon
                      variant="default"
                      size="lg"
                      radius="xl"
                      style={{ position: "relative", overflow: "visible" }}
                    >
                      <Avatar
                        size="md"
                        color="sage"
                        src={
                          user.avatar && user.id && user.collectionName
                            ? getImageUrl(
                                {
                                  id: user.id,
                                  collectionId: user.collectionId || "",
                                  collectionName: user.collectionName,
                                },
                                user.avatar
                              )
                            : undefined
                        }
                      >
                        {user.email.charAt(0).toUpperCase()}
                      </Avatar>
                      {subscription?.tier === "pro" && (
                        <IconCrown
                          size={20}
                          color="var(--mantine-color-yellow-6)"
                          fill="var(--mantine-color-yellow-6)"
                          style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            zIndex: 1000,
                            filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
                            strokeWidth: 2.5,
                          }}
                        />
                      )}
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>{user.email}</Menu.Label>
                    <Menu.Item
                      leftSection={<IconSettings size={14} />}
                      component={Link}
                      to="/settings"
                    >
                      Settings
                    </Menu.Item>
                    {import.meta.env.VITE_SHOW_SUBSCRIPTIONS === "true" && (
                      <Menu.Item
                        leftSection={<IconCreditCard size={14} />}
                        component={Link}
                        to="/subscription"
                      >
                        Subscription
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={14} />}
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button
                  component={Link}
                  to="/login"
                  variant="default"
                  size="sm"
                >
                  Sign In
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title="Menu"
        padding="md"
        size="sm"
      >
        <div onClick={closeDrawer}>
          <Navigation vertical />
        </div>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Container
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    const from =
      (location.state as { from?: { pathname?: string } })?.from?.pathname ||
      "/your-banknotes";
    return <Navigate to={from} replace />;
  }

  return <LoginScreen />;
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Container
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="*"
        element={
          <AppLayout>
            <LoadingOverlay />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/users/:userId" element={<UserCollectionPage />} />
              <Route
                path="/your-banknotes"
                element={
                  <ProtectedRoute>
                    <CollectionPage isOwner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/pricing" element={<SubscriptionPage />} />
              <Route
                path="/terms-and-conditions"
                element={
                  <TermsAndConditions opened={true} onClose={() => {}} />
                }
              />
              <Route
                path="/privacy-policy"
                element={<PrivacyPolicy opened={true} onClose={() => {}} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
}

export default App;
