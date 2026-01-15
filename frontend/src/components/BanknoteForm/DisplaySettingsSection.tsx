import { Group, Switch, Tooltip } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCrown } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import type { BanknoteFormData } from '../../types/banknote';

type DisplaySettingsSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
  currentFeaturedCount?: number; // Number of currently featured banknotes (excluding the one being edited)
  isEditing?: boolean; // Whether we're editing an existing banknote
};

export function DisplaySettingsSection({ 
  form, 
  isProcessing, 
  currentFeaturedCount = 0,
  // isEditing is reserved for future use
}: DisplaySettingsSectionProps) {
  const { subscription, getTierLimits } = useSubscription();
  const navigate = useNavigate();
  
  const tier = subscription?.tier || 'free';
  const limits = getTierLimits(tier);
  const isPro = tier === 'pro';
  
  // Count current featured banknotes
  // currentFeaturedCount already excludes the banknote being edited
  // If the banknote is already featured, we can keep it featured (don't count against limit)
  // If the banknote is NOT featured, we need to check if we can add one more
  const isCurrentlyFeatured = form.values.isFeatured;
  const canFeature = isPro || (
    limits.maxFeatured > 0 && 
    (isCurrentlyFeatured || currentFeaturedCount < limits.maxFeatured)
  );
  
  const currentFeatured = isCurrentlyFeatured 
    ? currentFeaturedCount + 1  // Include this banknote if it's featured
    : currentFeaturedCount;      // Otherwise just the count
  const featuredTooltip = isPro 
    ? undefined
    : limits.maxFeatured === 0
    ? 'Featured banknotes are available in Pro. Upgrade to unlock this feature.'
    : `You have ${currentFeatured} of ${limits.maxFeatured} featured banknotes. Upgrade to Pro for unlimited featured banknotes.`;

  return (
    <Group>
      <Switch
        label="Visible in public collection"
        disabled={isProcessing}
        {...form.getInputProps('isVisibleInCollection', { type: 'checkbox' })}
      />
      <Tooltip label={featuredTooltip} disabled={canFeature}>
        <div>
          <Switch
            label={
              <Group gap={6} align="center">
                <span>Featured (larger thumbnail)</span>
                {!isPro && <IconCrown size={14} color="var(--mantine-color-yellow-6)" style={{ flexShrink: 0 }} />}
              </Group>
            }
            color="yellow"
            disabled={isProcessing || !canFeature}
            checked={form.values.isFeatured && canFeature}
            onChange={(e) => {
              if (canFeature) {
                form.setFieldValue('isFeatured', e.currentTarget.checked);
              } else {
                navigate('/pricing');
              }
            }}
          />
        </div>
      </Tooltip>
    </Group>
  );
}

