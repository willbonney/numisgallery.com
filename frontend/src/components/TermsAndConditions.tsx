import { Box, List, Modal, Paper, Stack, Text, Title } from "@mantine/core";

interface TermsAndConditionsProps {
  opened: boolean;
  onClose: () => void;
}

export function TermsAndConditions({
  opened,
  onClose,
}: TermsAndConditionsProps) {
  const content = (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Last Updated: December 12, 2025
      </Text>

      <Text size="sm" fw={500}>
        BY ACCESSING OR USING THIS SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS
        AND CONDITIONS. IF YOU DO NOT AGREE, DO NOT USE THIS SERVICE.
      </Text>

      <div>
        <Title order={4} mb="xs">
          1. Acceptance of Terms
        </Title>
        <Text size="sm" mb="xs">
          These Terms and Conditions govern your use of NumisGallery (the
          "Service"), operated by Happy Haiku LLC, doing business as Numigallery
          ("we", "us", or "our"). By creating an account or using the Service,
          you accept and agree to be bound by these Terms. We reserve the right
          to modify these Terms at any time without prior notice. Your continued
          use of the Service constitutes acceptance of any changes.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          2. Service Description
        </Title>
        <Text size="sm">
          NumisGallery provides tools for organizing, cataloging, and displaying
          banknote collections. The Service includes image upload, AI-powered
          data extraction, and collection management features. The Service is
          provided for personal, non-commercial use only.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          3. User Accounts and Responsibilities
        </Title>
        <Text size="sm" mb="sm">
          You are responsible for:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Maintaining the confidentiality of your account credentials
          </List.Item>
          <List.Item>All activities that occur under your account</List.Item>
          <List.Item>
            Ensuring that all information you provide is accurate and up-to-date
          </List.Item>
          <List.Item>
            Complying with all applicable laws and regulations
          </List.Item>
          <List.Item>
            The content you upload, including images and data
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          4. Disclaimer of Warranties
        </Title>
        <Text size="sm" fw={600} mb="xs" tt="uppercase">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
          OF ANY KIND.
        </Text>
        <Text size="sm" mb="sm">
          We expressly disclaim all warranties, whether express, implied,
          statutory, or otherwise, including but not limited to:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Warranties of merchantability, fitness for a particular purpose, and
            non-infringement
          </List.Item>
          <List.Item>
            Warranties regarding the accuracy, reliability, or completeness of
            any data or information provided by the Service
          </List.Item>
          <List.Item>
            Warranties that the Service will be uninterrupted, secure, or
            error-free
          </List.Item>
          <List.Item>
            Any warranties regarding AI-extracted data accuracy - automated data
            extraction may contain errors
          </List.Item>
          <List.Item>
            Any warranties regarding third-party services (PMG, Intern LM API,
            etc.)
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          5. Limitation of Liability
        </Title>
        <Text size="sm" fw={600} mb="xs" tt="uppercase">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
          DAMAGES OF ANY KIND.
        </Text>
        <Text size="sm" mb="sm">
          In no event shall we, our officers, directors, employees, or agents be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, including but not limited to:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Loss of profits, data, use, goodwill, or other intangible losses
          </List.Item>
          <List.Item>
            Damages resulting from unauthorized access to or alteration of your
            data
          </List.Item>
          <List.Item>
            Damages resulting from errors, inaccuracies, or omissions in
            AI-extracted data
          </List.Item>
          <List.Item>
            Damages resulting from reliance on any information provided by the
            Service
          </List.Item>
          <List.Item>
            Damages resulting from deletion, corruption, or loss of any content
            or data
          </List.Item>
          <List.Item>
            Damages resulting from service interruptions, downtime, or
            unavailability
          </List.Item>
          <List.Item>
            Damages resulting from third-party services or websites
          </List.Item>
        </List>
        <Text size="sm" mt="xs">
          Our total liability to you for all claims arising from or related to
          the Service shall not exceed $100 USD or the amount you paid to use
          the Service in the past 12 months, whichever is less.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          6. Indemnification
        </Title>
        <Text size="sm">
          You agree to indemnify, defend, and hold harmless Happy Haiku LLC (DBA
          Numigallery), NumisGallery, its operators, officers, directors,
          employees, and agents from and against any and all claims,
          liabilities, damages, losses, costs, expenses, or fees (including
          reasonable attorneys' fees) arising from: (a) your use or misuse of
          the Service; (b) your violation of these Terms; (c) your violation of
          any rights of another party; (d) any content you upload or submit; or
          (e) your breach of any representation or warranty contained herein.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          7. AI Data Extraction Disclaimer
        </Title>
        <Text size="sm" mb="sm">
          The Service uses artificial intelligence to extract data from images.
          You acknowledge and agree that:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            AI-extracted data may contain errors, inaccuracies, or omissions
          </List.Item>
          <List.Item>
            You are solely responsible for verifying the accuracy of all
            extracted data
          </List.Item>
          <List.Item>
            We make no guarantees regarding the accuracy of AI-extracted
            information
          </List.Item>
          <List.Item>
            You should not rely solely on AI-extracted data for any purpose
          </List.Item>
          <List.Item>
            We are not liable for any damages resulting from inaccurate data
            extraction
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          8. User Content and Data
        </Title>
        <Text size="sm" mb="sm">
          You retain ownership of content you upload. By uploading content to
          the Service, you:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Grant us a worldwide, non-exclusive license to store, process, and
            display your content as necessary to provide the Service
          </List.Item>
          <List.Item>
            Represent that you own or have the necessary rights to upload the
            content
          </List.Item>
          <List.Item>
            Acknowledge that content marked as "public" may be viewed by other
            users
          </List.Item>
          <List.Item>
            Accept full responsibility for all content you upload, including
            compliance with copyright and intellectual property laws
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          9. No Professional Advice
        </Title>
        <Text size="sm">
          The Service is for informational and organizational purposes only. It
          does not constitute professional numismatic advice, appraisal
          services, or financial advice. You should consult qualified
          professionals for valuation, authentication, or investment decisions
          regarding banknotes. We are not responsible for any financial
          decisions you make based on information provided by or through the
          Service.
        </Text>
      </div>
      <div>
        <Title order={4} mb="xs">
          10. Service Availability
        </Title>
        <Text size="sm">
          We do not guarantee that the Service will be available at all times or
          that it will be free from errors, viruses, or other harmful
          components. We reserve the right to modify, suspend, or discontinue
          any part of the Service at any time without notice or liability. We
          are not responsible for any loss of data or service interruptions.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          11. Third-Party Services
        </Title>
        <Text size="sm" mb="sm">
          The Service integrates with third-party services including:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>Intern LM API for AI-powered image analysis</List.Item>
          <List.Item>
            PMG (Paper Money Guaranty) website for certification data
          </List.Item>
          <List.Item>Cloud hosting and storage providers</List.Item>
        </List>
        <Text size="sm" mt="xs">
          We are not responsible for the availability, accuracy, or practices of
          these third-party services. Your use of third-party services is at
          your own risk and subject to their respective terms and policies.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          12. Account Termination
        </Title>
        <Text size="sm">
          We reserve the right to suspend or terminate your account at any time,
          with or without notice, for any reason, including but not limited to
          violation of these Terms, suspected fraudulent activity, or prolonged
          inactivity. Upon termination, your right to use the Service
          immediately ceases. We may, but are not obligated to, delete your data
          upon termination.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          13. Privacy and Data Collection
        </Title>
        <Text size="sm" mb="sm">
          By using the Service, you acknowledge and agree that we may collect
          and process:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>Account information (email, username, password)</List.Item>
          <List.Item>
            Collection data (banknote descriptions, images, catalog information)
          </List.Item>
          <List.Item>Usage data and analytics</List.Item>
        </List>
        <Text size="sm" mt="xs">
          Images you upload may be processed by third-party AI services. While
          we implement security measures, we cannot guarantee absolute security
          of your data. You upload content at your own risk.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          14. Intellectual Property
        </Title>
        <Text size="sm">
          The Service, including its design, code, features, and functionality,
          is owned by us and protected by copyright, trademark, and other
          intellectual property laws. You may not copy, modify, distribute,
          sell, or create derivative works based on the Service without our
          express written permission.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          15. Prohibited Uses
        </Title>
        <Text size="sm" mb="sm">
          You agree not to:
        </Text>
        <List size="sm" spacing="xs">
          <List.Item>
            Use the Service for any illegal purpose or in violation of any laws
          </List.Item>
          <List.Item>
            Upload malicious code, viruses, or harmful content
          </List.Item>
          <List.Item>
            Attempt to gain unauthorized access to the Service or other users'
            accounts
          </List.Item>
          <List.Item>
            Use automated systems (bots, scrapers) to access the Service without
            permission
          </List.Item>
          <List.Item>
            Interfere with or disrupt the Service or servers
          </List.Item>
          <List.Item>
            Upload content that infringes on intellectual property rights
          </List.Item>
          <List.Item>
            Use the Service for commercial purposes without authorization
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          16. No Warranty on Accuracy
        </Title>
        <Text size="sm">
          Information provided by the Service, including AI-extracted data,
          catalog numbers, grades, and valuations, is provided for informational
          purposes only. We make no representations or warranties regarding the
          accuracy, completeness, or reliability of any information. You are
          solely responsible for verifying all information before making any
          decisions based on it.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          17. Force Majeure
        </Title>
        <Text size="sm">
          We shall not be liable for any failure or delay in performance due to
          circumstances beyond our reasonable control, including but not limited
          to acts of God, war, terrorism, riots, natural disasters, pandemics,
          government actions, internet failures, or third-party service outages.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          18. Governing Law and Dispute Resolution
        </Title>
        <Text size="sm">
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which the Service operator resides,
          without regard to its conflict of law provisions. Any disputes arising
          from these Terms or the Service shall be resolved through binding
          arbitration in accordance with the rules of the American Arbitration
          Association, except where prohibited by law.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          19. Severability
        </Title>
        <Text size="sm">
          If any provision of these Terms is found to be unenforceable or
          invalid, that provision shall be limited or eliminated to the minimum
          extent necessary, and the remaining provisions shall remain in full
          force and effect.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          20. Entire Agreement
        </Title>
        <Text size="sm">
          These Terms constitute the entire agreement between you and Happy
          Haiku LLC (DBA Numigallery) regarding the use of the Service and
          supersede all prior agreements and understandings, whether written or
          oral.
        </Text>
      </div>

      <div>
        <Title order={4} mb="xs">
          21. Refund Policy
        </Title>
        <Text size="sm" mb="sm">
          All subscription payments are processed through Stripe, our payment
          processor. This refund policy complies with Stripe's Terms of Service
          and applicable payment processing regulations.
        </Text>
        <List size="sm" spacing="xs" mb="sm">
          <List.Item>
            <Text fw={500}>
              Consumer Right to Cancel - 14-Day Refund Policy:
            </Text>{" "}
            If you are a Consumer (purchasing for personal use), you have the
            right to cancel your subscription and receive a full refund within
            14 days of your initial purchase, regardless of whether you have
            used the Service. To exercise this right, you must contact us within
            14 days of your purchase date. This right applies to your first
            subscription purchase only.
          </List.Item>
          <List.Item>
            <Text fw={500}>Digital Content and Immediate Access:</Text> Since
            the Service provides immediate access to digital content and
            features upon subscription, you acknowledge that by subscribing, you
            consent to immediate performance of this Agreement. However, your
            14-day right to cancel and receive a refund (for Consumers) remains
            available as described above.
          </List.Item>
          <List.Item>
            <Text fw={500}>Subscription Cancellation:</Text> You may cancel your
            subscription at any time. Cancellation will take effect at the end
            of your current billing period. You will continue to have access to
            paid features until the end of the period you have paid for. After
            the initial 14-day refund period, there are no refunds for unused
            subscription periods.
          </List.Item>
          <List.Item>
            <Text fw={500}>Technical Issues:</Text> If technical problems
            prevent or unreasonably delay delivery of the Service, your
            exclusive remedy is either replacement of the Service or refund of
            the price paid, as determined by us. Refund requests for technical
            issues must be submitted within 60 days of the Transaction.
          </List.Item>
          <List.Item>
            <Text fw={500}>Pre-orders:</Text> If you pre-order a Product, you'll
            be charged upfront. You can request a refund for any reason until
            the content is delivered, after which the standard refund policy
            applies.
          </List.Item>
          <List.Item>
            <Text fw={500}>Sales Tax Refunds:</Text> If you are exempt from
            sales tax on your purchase and are registered for sales tax in the
            country of purchase, you may be entitled to a refund of the sales
            tax amount if permitted by applicable laws. You must contact us
            within 60 days after completing the purchase to be eligible for a
            sales tax refund. This refund will only be processed upon the
            provision of a valid sales tax code for your country.
          </List.Item>
          <List.Item>
            <Text fw={500}>Payment Method Issues:</Text> If we cannot charge
            your payment method for any reason (such as expiration or
            insufficient funds), and you have not cancelled your subscription,
            you remain responsible for any uncollected amounts. We reserve the
            right to cancel your subscription if we are unable to successfully
            charge your payment method to renew your subscription.
          </List.Item>
          <List.Item>
            <Text fw={500}>Refund Requests:</Text> To request a refund, please
            contact us through your account settings or at the contact
            information provided in the Service. All refunds are processed by
            Stripe in accordance with applicable payment processing regulations.
            Refunds, if approved, will be credited to your original payment
            method within 5-10 business days.
          </List.Item>
        </List>
      </div>

      <div>
        <Title order={4} mb="xs">
          22. Contact Information
        </Title>
        <Text size="sm" mb="xs">
          The Service is operated by Happy Haiku LLC, doing business as
          Numigallery. If you have questions about these Terms, please contact
          us through your account settings or at the contact information
          provided in the Service.
        </Text>
      </div>

      <Text size="xs" c="dimmed" mt="lg" ta="center">
        BY USING THIS SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD,
        AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.
      </Text>
    </Stack>
  );

  if (onClose) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={<Title order={3}>Terms and Conditions</Title>}
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
        Terms and Conditions
      </Title>
      <Box style={{ maxHeight: "none" }}>{content}</Box>
    </Paper>
  );
}
