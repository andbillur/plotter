'use client';

import { PrivateAnalyticsGuide } from './PrivateAnalyticsGuide';

type Props = {
  onGoToCharts?: () => void;
};

/** Ochiq iframe o'chirilgan — maxfiylik */
export function PowerBiEmbed({ onGoToCharts }: Props) {
  return <PrivateAnalyticsGuide onGoToCharts={onGoToCharts} />;
}
