import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import pb from '../lib/pocketbase';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsAndConditions } from './TermsAndConditions';

export function LoginScreen() {
  const { login, signup, loginWithOAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [termsOpened, setTermsOpened] = useState(false);
  const [privacyOpened, setPrivacyOpened] = useState(false);
  const [forgotPasswordOpened, { open: openForgotPassword, close: closeForgotPassword }] = useDisclosure(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/your-banknotes';

  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
    validate: {
      username: (value) => (isSignup && value.length === 0 ? 'Username is required' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      agreeToTerms: (value) => (isSignup && !value ? 'You must agree to the Terms and Conditions' : null),
      agreeToPrivacy: (value) => (isSignup && !value ? 'You must agree to the Privacy Policy' : null),
    },
  });

  const forgotPasswordForm = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleSubmit = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    try {
      if (isSignup) {
        await signup(values.email, values.password, values.username);
        notifications.show({
          title: 'Success',
          message: 'Account created successfully!',
          color: 'green',
        });
        navigate(from, { replace: true });
      } else {
        await login(values.email, values.password);
        notifications.show({
          title: 'Success',
          message: 'Logged in successfully!',
          color: 'green',
        });
        navigate(from, { replace: true });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : isSignup ? 'Failed to create account' : 'Failed to login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // IMPORTANT: Do NOT use async/await here or Safari will block the popup
    setLoading(true);
    
    loginWithOAuth(provider)
      .then(() => {
        notifications.show({
          title: 'Success',
          message: 'Logged in successfully!',
          color: 'green',
        });
        // LoginRoute component will automatically redirect when user state updates
        // via authStore.onChange listener
      })
      .catch((error) => {
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to login with OAuth',
          color: 'red',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleForgotPassword = async (values: { email: string }) => {
    setResettingPassword(true);
    try {
      await pb.collection('users').requestPasswordReset(values.email);
      notifications.show({
        title: 'Password Reset Email Sent',
        message: 'If an account exists with this email, you will receive password reset instructions.',
        color: 'green',
      });
      forgotPasswordForm.reset();
      closeForgotPassword();
    } catch (error) {
      // PocketBase doesn't reveal if email exists, so we show success either way
      notifications.show({
        title: 'Password Reset Email Sent',
        message: 'If an account exists with this email, you will receive password reset instructions.',
        color: 'green',
      });
      forgotPasswordForm.reset();
      closeForgotPassword();
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fa',
        position: 'relative',
      }}
    >
      <Container size={420} style={{ position: 'relative', zIndex: 1 }}>
        <Stack align="center" gap="md" mb="xl">
          <img src="/logo.svg" alt="NumisGallery" height={128} width={128} style={{ display: 'block' }} />
          <Title ta="center" style={{ fontWeight: 900 }}>
            Welcome to NumisGallery
          </Title>
        </Stack>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {isSignup && (
              <TextInput
                label="Username"
                placeholder="Your username"
                required
                {...form.getInputProps('username')}
              />
            )}
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              description={isSignup ? "Must be at least 8 characters" : undefined}
              {...form.getInputProps('password')}
            />
            {!isSignup && (
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  openForgotPassword();
                }}
                style={{ alignSelf: 'flex-end' }}
              >
                Forgot password?
              </Anchor>
            )}
            {isSignup && (
              <Stack gap="xs">
              <Checkbox
                label={
                  <Text size="sm">
                    I agree to the{' '}
                    <Anchor
                      component="button"
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setTermsOpened(true);
                      }}
                    >
                      Terms and Conditions
                    </Anchor>
                  </Text>
                }
                  {...form.getInputProps('agreeToTerms', { type: 'checkbox' })}
                />
                <Checkbox
                  label={
                    <Text size="sm">
                      I agree to the{' '}
                      <Anchor
                        component="button"
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrivacyOpened(true);
                        }}
                      >
                        Privacy Policy
                      </Anchor>
                    </Text>
                  }
                  {...form.getInputProps('agreeToPrivacy', { type: 'checkbox' })}
              />
              </Stack>
            )}
            <Button type="submit" fullWidth loading={loading}>
              {isSignup ? 'Sign up' : 'Sign in'}
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="md">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Anchor component="button" type="button" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Anchor>
        </Text>

        <Divider label="Or continue with" labelPosition="center" my="lg" />

        <Group grow mb="md" mt="md">
          <Button
            variant="white"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            leftSection={
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
              </svg>
            }
            styles={{
              root: {
                backgroundColor: '#ffffff',
                border: '1px solid #dadce0',
                color: '#3c4043',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              },
            }}
          >
            Google
          </Button>
          <Button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            leftSection={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            }
            styles={{
              root: {
                backgroundColor: '#24292e',
                border: 'none',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2f363d',
                },
              },
            }}
          >
            GitHub
          </Button>
        </Group>
      </Paper>
    </Container>
      <TermsAndConditions opened={termsOpened} onClose={() => setTermsOpened(false)} />
      <PrivacyPolicy opened={privacyOpened} onClose={() => setPrivacyOpened(false)} />
      
      <Modal
        opened={forgotPasswordOpened}
        onClose={closeForgotPassword}
        title="Reset Password"
        centered
      >
        <form onSubmit={forgotPasswordForm.onSubmit(handleForgotPassword)}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...forgotPasswordForm.getInputProps('email')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeForgotPassword}>
                Cancel
              </Button>
              <Button type="submit" loading={resettingPassword}>
                Send Reset Link
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  );
}


