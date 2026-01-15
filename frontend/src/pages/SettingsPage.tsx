import {
  Avatar,
  Button,
  Center,
  Container,
  FileButton,
  Group,
  Modal,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDeviceDesktop, IconLock, IconMoon, IconSun, IconUpload, IconUser } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '../contexts/types';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import pb from '../lib/pocketbase';
import { getImageUrl } from '../utils/fileHelpers';

export function SettingsPage() {
  const { settings, updateTheme, loading: settingsLoading } = useSettings();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] = useDisclosure(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Check if user is SSO (OAuth) - users without passwordHash are SSO users
  const isSSOUser = !user?.passwordHash;

  const form = useForm({
    initialValues: {
      username: user?.username || '',
    },
    validate: {
      username: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Username is required';
        }
        if (value.length < 3) {
          return 'Username must be at least 3 characters';
        }
        if (value.length > 50) {
          return 'Username must be less than 50 characters';
        }
        return null;
      },
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user?.username && form.values.username !== user.username) {
      form.setFieldValue('username', user.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const passwordForm = useForm({
    initialValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      oldPassword: (value) => (!value ? 'Current password is required' : null),
      newPassword: (value) => {
        if (!value) return 'New password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Please confirm your password';
        if (value !== values.newPassword) return 'Passwords do not match';
        return null;
      },
    },
  });

  const handleAvatarChange = useCallback((file: File | null) => {
    if (!file) return;
    
    setAvatarFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar && user.id && user.collectionName) {
      return getImageUrl(
        { id: user.id, collectionId: user.collectionId || '', collectionName: user.collectionName },
        user.avatar
      );
    }
    return null;
  };

  const handleSubmit = useCallback(async (values: { username: string }) => {
    if (!user) return;

    setLoading(true);
    try {
      // If there's an avatar file, use FormData, otherwise use plain object
      let updateData: FormData | { username: string };
      
      if (avatarFile) {
        const formData = new FormData();
        formData.append('username', values.username);
        formData.append('avatar', avatarFile);
        updateData = formData;
      } else {
        updateData = { username: values.username };
      }

      const updatedUser = await pb.collection('users').update(user.id, updateData);
      
      // Update auth store
      pb.authStore.save(pb.authStore.token || '', updatedUser);
      
      // Update local user state
      updateUser(updatedUser as User);
      
      // Clear avatar preview
      setAvatarFile(null);
      setAvatarPreview(null);
      
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { data?: unknown } };
        console.error('Error details:', err.response);
        
        if (err.response?.data && typeof err.response.data === 'object') {
          const errorData = err.response.data as Record<string, unknown>;
          if (errorData.username) {
            const usernameError = errorData.username;
            if (typeof usernameError === 'object' && usernameError !== null && 'message' in usernameError) {
              errorMessage = `Username error: ${String(usernameError.message)}`;
            } else {
              errorMessage = `Username error: ${String(usernameError)}`;
            }
          } else if (errorData.message) {
            errorMessage = String(errorData.message);
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [user, avatarFile, updateUser]);

  const handlePasswordChange = useCallback(async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (!user) return;

    setChangingPassword(true);
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: values.oldPassword,
        password: values.newPassword,
        passwordConfirm: values.confirmPassword,
      });

      passwordForm.reset();
      closePasswordModal();

      notifications.show({
        title: 'Success',
        message: 'Password changed successfully',
        color: 'green',
      });
    } catch (error: unknown) {
      console.error('Failed to change password:', error);
      
      let errorMessage = 'Failed to change password';
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { data?: unknown } };
        if (err.response?.data && typeof err.response.data === 'object') {
          const errorData = err.response.data as Record<string, unknown>;
          if (errorData.oldPassword) {
            const oldPasswordError = errorData.oldPassword;
            if (typeof oldPasswordError === 'object' && oldPasswordError !== null && 'message' in oldPasswordError) {
              errorMessage = `Current password error: ${String(oldPasswordError.message)}`;
            } else {
              errorMessage = `Current password error: ${String(oldPasswordError)}`;
            }
          } else if (errorData.password) {
            const passwordError = errorData.password;
            if (typeof passwordError === 'object' && passwordError !== null && 'message' in passwordError) {
              errorMessage = `Password error: ${String(passwordError.message)}`;
            } else {
              errorMessage = `Password error: ${String(passwordError)}`;
            }
          } else if (errorData.message) {
            errorMessage = String(errorData.message);
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setChangingPassword(false);
    }
  }, [user, passwordForm, closePasswordModal]);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={2}>Settings</Title>

        <Paper p="lg" withBorder shadow="sm" radius="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Profile
                </Text>
              </div>

              <Group>
                <Avatar
                  size={80}
                  src={getAvatarUrl()}
                  alt={user?.username || user?.email}
                  color="sage"
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Stack gap="xs">
                  <FileButton
                    onChange={handleAvatarChange}
                    accept="image/*"
                  >
                    {(props) => (
                      <Button
                        {...props}
                        variant="light"
                        leftSection={<IconUpload size={16} />}
                        size="sm"
                      >
                        Upload Avatar
                      </Button>
                    )}
                  </FileButton>
                  {avatarFile && (
                    <Text size="xs" c="dimmed">
                      {avatarFile.name}
                    </Text>
                  )}
                </Stack>
              </Group>

              <TextInput
                label="Username"
                placeholder="Your username"
                leftSection={<IconUser size={16} />}
                required
                {...form.getInputProps('username')}
              />

              <Button type="submit" loading={loading} disabled={settingsLoading}>
                Save Profile
              </Button>
            </Stack>
          </form>
        </Paper>

        {!isSSOUser && (
          <Paper p="lg" withBorder shadow="sm" radius="md">
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Password
                </Text>
                <Text size="xs" c="dimmed" mb="md">
                  Change your account password.
                </Text>
              </div>

              <Button
                variant="light"
                leftSection={<IconLock size={16} />}
                onClick={openPasswordModal}
              >
                Change Password
              </Button>
            </Stack>
          </Paper>
        )}

        <Paper p="lg" withBorder shadow="sm" radius="md">
          <Stack gap="md">
            <div>
              <Text size="sm" fw={500} mb="xs">
                Theme Preference
              </Text>
            </div>

            <SegmentedControl
              value={settings?.theme || 'auto'}
              onChange={updateTheme}
              disabled={settingsLoading}
              data={[
                {
                  value: 'light',
                  label: (
                    <Center style={{ gap: 8 }}>
                      <IconSun size={16} />
                      <span>Light</span>
                    </Center>
                  ),
                },
                {
                  value: 'dark',
                  label: (
                    <Center style={{ gap: 8 }}>
                      <IconMoon size={16} />
                      <span>Dark</span>
                    </Center>
                  ),
                },
                {
                  value: 'auto',
                  label: (
                    <Center style={{ gap: 8 }}>
                      <IconDeviceDesktop size={16} />
                      <span>Auto</span>
                    </Center>
                  ),
                },
              ]}
              fullWidth
            />
          </Stack>
        </Paper>

        <Modal
          opened={passwordModalOpened}
          onClose={closePasswordModal}
          title="Change Password"
          centered
        >
          <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
            <Stack gap="md">
              <PasswordInput
                label="Current Password"
                placeholder="Enter your current password"
                required
                {...passwordForm.getInputProps('oldPassword')}
              />
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                required
                description="Must be at least 8 characters"
                {...passwordForm.getInputProps('newPassword')}
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                required
                {...passwordForm.getInputProps('confirmPassword')}
              />
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closePasswordModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={changingPassword}>
                  Change Password
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Stack>
    </Container>
  );
}


