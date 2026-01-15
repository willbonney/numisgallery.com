import { Box, List, Modal, Paper, Stack, Text, Title } from "@mantine/core";

interface PrivacyPolicyProps {
  opened: boolean;
  onClose: () => void;
}

export function PrivacyPolicy({ opened, onClose }: PrivacyPolicyProps) {
  const content = (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Last Updated: December 22, 2025
      </Text>

      <Text size="sm" fw={500}>
        This Privacy Policy describes how Happy Haiku LLC, doing business as
        Numigallery ("we", "us", or "our") collects, uses, and protects your
        personal information when you use NumisGallery (the "Service").
      </Text>

      <div>
        <Title order={4} mb="xs">
          1. Information We Collect
        </Title>
        <Text size="sm" mb="sm">
          We collect information that you provide directly to us and information
          that is automatically collected when you use the Service:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            <Text fw={500}>Account Information:</Text> When you create an
            account, we collect your username, email address, and password
            (stored in encrypted form).
          </List.Item>
          <List.Item>
            <Text fw={500}>Collection Data:</Text> We store the banknote
            information you enter, including descriptions, images, catalog
            numbers, grades, purchase information, and any other data you choose
            to add to your collection.
          </List.Item>
          <List.Item>
            <Text fw={500}>Usage Data:</Text> We automatically collect
            information about how you use the Service, including pages visited,
            features used, and interactions with the Service.
          </List.Item>
          <List.Item>
            <Text fw={500}>Device Information:</Text> We may collect information
            about your device, including IP address, browser type, operating
            system, and device identifiers.
          </List.Item>
          <List.Item>
            <Text fw={500}>Payment Information:</Text> When you subscribe to a
            paid plan, payment processing is handled by Stripe (our payment
            processor). We do not store your full payment card details. Stripe's
            privacy policy applies to payment information.
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          2. How We Use Your Information
        </Title>
        <Text size="sm" mb="sm">
          We use the information we collect to:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>Provide, maintain, and improve the Service</List.Item>
          <List.Item>
            Process your transactions and manage your subscription
          </List.Item>
          <List.Item>
            Send you service-related communications, including account updates
            and support responses
          </List.Item>
          <List.Item>
            Respond to your inquiries and provide customer support
          </List.Item>
          <List.Item>
            Detect, prevent, and address technical issues and security threats
          </List.Item>
          <List.Item>Analyze usage patterns to improve the Service</List.Item>
          <List.Item>
            Comply with legal obligations and enforce our Terms and Conditions
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          3. Third-Party Services
        </Title>
        <Text size="sm" mb="sm">
          We use third-party services that may collect and process your
          information:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            <Text fw={500}>PocketBase:</Text> Our backend database and
            authentication service stores your account and collection data.
          </List.Item>
          <List.Item>
            <Text fw={500}>Stripe:</Text> Our payment processor handles
            subscription payments. Their privacy policy applies to payment
            transactions.
          </List.Item>
          <List.Item>
            <Text fw={500}>Intern LM API:</Text> Images you upload may be
            processed by Intern LM API for AI-powered data extraction. Images
            are sent to this service for analysis.
          </List.Item>
          <List.Item>
            <Text fw={500}>PMG (Paper Money Guaranty):</Text> When you use the
            PMG image fetching feature, we may access PMG's public website to
            retrieve certification information.
          </List.Item>
          <List.Item>
            <Text fw={500}>Cloud Storage:</Text> Your uploaded images are stored
            on cloud storage providers we use for hosting the Service.
          </List.Item>
        </List>
        <Text size="sm" mt="xs">
          These third-party services have their own privacy policies. We
          encourage you to review their privacy policies to understand how they
          handle your information.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          4. Data Storage and Security
        </Title>
        <Text size="sm" mb="sm">
          We implement appropriate technical and organizational measures to
          protect your personal information:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Passwords are stored in encrypted form and never in plain text
          </List.Item>
          <List.Item>
            Data is transmitted over encrypted connections (HTTPS)
          </List.Item>
          <List.Item>
            Access to your data is restricted to authorized personnel only
          </List.Item>
          <List.Item>
            We regularly review and update our security practices
          </List.Item>
        </List>
        <Text size="sm" mt="xs">
          However, no method of transmission over the Internet or electronic
          storage is 100% secure. While we strive to use commercially acceptable
          means to protect your information, we cannot guarantee absolute
          security.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          5. Data Retention
        </Title>
        <Text size="sm">
          We retain your personal information for as long as your account is
          active or as needed to provide you with the Service. If you delete
          your account, we will delete or anonymize your personal information,
          except where we are required to retain it for legal, regulatory, or
          legitimate business purposes. Collection data may be retained for a
          reasonable period after account deletion to allow for account recovery
          if requested.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          6. Your Rights and Choices
        </Title>
        <Text size="sm" mb="sm">
          You have the following rights regarding your personal information:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            <Text fw={500}>Access:</Text> You can access and download your
            collection data at any time through the Service.
          </List.Item>
          <List.Item>
            <Text fw={500}>Correction:</Text> You can update your account
            information and collection data through the Service.
          </List.Item>
          <List.Item>
            <Text fw={500}>Deletion:</Text> You can delete your account and
            associated data through your account settings.
          </List.Item>
          <List.Item>
            <Text fw={500}>Export:</Text> You can export your collection data in
            CSV or PDF format.
          </List.Item>
          <List.Item>
            <Text fw={500}>Privacy Settings:</Text> You can control the
            visibility of your collections (public/private) through your account
            settings.
          </List.Item>
        </List>
        <Text size="sm" mt="xs">
          If you are located in the European Economic Area (EEA) or United
          Kingdom, you have additional rights under GDPR, including the right to
          object to processing, the right to data portability, and the right to
          lodge a complaint with a supervisory authority.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          7. Children's Privacy
        </Title>
        <Text size="sm">
          The Service is not intended for children under the age of 13. We do
          not knowingly collect personal information from children under 13. If
          you are a parent or guardian and believe your child has provided us
          with personal information, please contact us. If we become aware that
          we have collected personal information from a child under 13, we will
          take steps to delete such information.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          8. International Data Transfers
        </Title>
        <Text size="sm">
          Your information may be transferred to and processed in countries
          other than your country of residence. These countries may have data
          protection laws that differ from those in your country. By using the
          Service, you consent to the transfer of your information to these
          countries. We take appropriate safeguards to ensure your information
          is protected in accordance with this Privacy Policy.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          9. Changes to This Privacy Policy
        </Title>
        <Text size="sm">
          We may update this Privacy Policy from time to time. We will notify
          you of any material changes by posting the new Privacy Policy on this
          page and updating the "Last Updated" date. We encourage you to review
          this Privacy Policy periodically. Your continued use of the Service
          after any changes constitutes acceptance of the updated Privacy
          Policy.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          10. Contact Us
        </Title>
        <Text size="sm">
          If you have questions about this Privacy Policy or our data practices,
          please contact us through your account settings or at the contact
          information provided in the Service. The Service is operated by Happy
          Haiku LLC, doing business as Numigallery.
        </Text>
      </div>

      <Text size="xs" c="dimmed" mt="lg" ta="center">
        BY USING THIS SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD,
        AND AGREE TO THIS PRIVACY POLICY.
      </Text>
    </Stack>
  );

  if (onClose) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={<Title order={3}>Privacy Policy</Title>}
        size="lg"
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto" },
        }}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Paper p="xl" withBorder>
      <Title order={2} mb="md">
        Privacy Policy
      </Title>
      <Box style={{ maxHeight: "none" }}>{content}</Box>
    </Paper>
  );
}
