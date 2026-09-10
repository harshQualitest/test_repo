import * as React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";

/**
 * Purpose: Data shape for a single stat/info tile rendered by {@link InfoCards}.
 *
 * @property title - Small label shown at the top of the card (e.g. metric name).
 * @property value - Headline value for the metric (string or number, rendered as-is).
 * @property subtitle - Optional secondary text shown under the value.
 * @property hint - Optional link-styled call-to-action text; clicking it (or the card) fires `onClick`.
 * @property icon - Optional icon rendered in the card header, next to the title.
 * @property onClick - Optional handler invoked when the card (or its hint link) is clicked.
 */
export type InfoCardItem = {
  title: string;
  value: string | number;
  subtitle?: string;
  hint?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

/**
 * Component: InfoCards
 *
 * Purpose: Renders a responsive grid of stat/summary cards (title, value, subtitle,
 * optional icon and clickable hint link) used across dashboards for at-a-glance KPIs.
 *
 * Responsibilities:
 * - Lay out one card per `InfoCardItem`, in a 1-column (mobile) / 3-column (md+) grid.
 * - Make the whole card clickable via `card.onClick` when provided.
 * - Render an optional "hint" link inside the card that also triggers `card.onClick`,
 *   with its own click handler preventing the default anchor navigation.
 *
 * Props:
 * - cards: InfoCardItem[] - the list of stat tiles to render.
 *
 * Major child components rendered: MUI `Box`, `Card`, `CardContent`, `Typography`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function InfoCards({ cards }: { cards: InfoCardItem[] }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(3, 1fr)",
        },
      }}
    >
      {cards.map((card, idx) => (
        <Card
          key={idx}
          variant="outlined"
          onClick={card.onClick}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            borderRadius: 3,
            cursor: "pointer",
            transition: "box-shadow 150ms ease",
            "&:hover": { boxShadow: 6 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              px: 3,
              pt: 3,
              pb: 1,
            }}
          >
            <Typography variant="body2">{card.title}</Typography>
            {card.icon}
          </Box>

          <CardContent sx={{ px: 3, pb: 3 }}>
            <Typography variant="h5">{card.value}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
              {card.subtitle}
            </Typography>
            {card.hint && (
              <Typography
                component="a"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  card.onClick && card.onClick();
                }}
                variant="caption"
                sx={{ color: "primary.main", cursor: "pointer", textDecoration: "none", fontWeight: 500 }}
              >
                {card.hint}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
