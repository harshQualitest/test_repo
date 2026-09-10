import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import BarChartIcon from '@mui/icons-material/BarChart';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { HeaderData } from '../../types/detail-analysis-data';

/**
 * Resolves the dashboard header's decorative icon name (from data) to the
 * actual MUI icon component to render.
 * @param iconName - one of the supported icon keys ('QueryStats' | 'BarChart3' | 'CircleX').
 * @returns The matching icon component, defaulting to QueryStatsIcon for unknown names.
 */
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, typeof QueryStatsIcon> = {
    QueryStats: QueryStatsIcon,
    BarChart3: BarChartIcon,
    CircleX: CancelIcon,
  };
  return iconMap[iconName] || QueryStatsIcon;
};

interface HeaderSectionProps {
  data: HeaderData;
  onBack?: () => void;
  onExport?: () => void;
}

/**
 * Component: HeaderSection
 *
 * Purpose: Renders the detail-analysis dashboard's top bar — a back button,
 * title/subtitle with an icon, and an export action.
 *
 * Responsibilities:
 * - Resolve and display the header's icon, title, and subtitle from `data`.
 * - Wire the back and export buttons to the parent's handlers.
 *
 * Props:
 * - data (HeaderData): title, subtitle, back/export button labels, and icon name.
 * - onBack (function, optional): invoked when the back button is clicked.
 * - onExport (function, optional): invoked when the export button is clicked.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const HeaderSection = ({ data, onBack, onExport }: HeaderSectionProps) => {
  const IconComponent = getIconComponent(data.icon);

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="text"
          startIcon={<ArrowBackIcon fontSize="small" />}
          onClick={onBack}
          sx={{ minWidth: 0, px: 1.5, height: 32 }}
        >
          {data.backLabel}
        </Button>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconComponent sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data.title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {data.subtitle}
          </Typography>
        </Box>
      </Stack>

      <Button
        variant="outlined"
        startIcon={<DownloadIcon fontSize="small" />}
        onClick={onExport}
        sx={{ height: 32 }}
      >
        {data.exportLabel}
      </Button>
    </Stack>
  );
};
