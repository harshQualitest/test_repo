import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { MetricCard } from '../../types/detail-analysis-data';

interface MetricCardsProps {
  cards: MetricCard[];
}

/**
 * Picks the trend arrow icon for a metric card's `trendDirection`.
 * @param dir - 'up' | 'down' | undefined/other (treated as flat).
 * @returns A MUI icon element representing the trend direction.
 */
const getTrendIcon = (dir?: string) => {
  switch (dir) {
    case 'up':
      return <TrendingUpIcon fontSize="small" />;
    case 'down':
      return <TrendingDownIcon fontSize="small" />;
    default:
      return <HorizontalRuleIcon fontSize="small" />;
  }
};

/**
 * Component: MetricCards
 *
 * Purpose: Renders a responsive grid of summary metric cards (KPI tiles) for
 * the detail-analysis dashboard.
 *
 * Responsibilities:
 * - Lay out one card per entry in `cards`, 2-up on mobile and 4-up on desktop.
 * - Show each card's label, value, optional helper text, and an optional
 *   trend chip (icon + text, colored per `trendColor` or a success default).
 *
 * Props:
 * - cards (MetricCard[]): metric tiles to render (label, value, helperText,
 *   trendText, trendDirection, trendColor).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const MetricCards = ({ cards }: MetricCardsProps) => {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' } }}>
      {cards.map((card, idx) => (
        <Paper key={idx} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {card.label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {card.value}
          </Typography>
          {card.helperText && (
            <Typography variant="caption" color="text.secondary">
              {card.helperText}
            </Typography>
          )}
          {card.trendText && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: card.trendColor ?? 'success.main' }}>
              <Chip
                size="small"
                variant="outlined"
                icon={getTrendIcon(card.trendDirection)}
                label={card.trendText}
                sx={{ height: 24, borderColor: 'divider', color: 'inherit' }}
              />
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};
