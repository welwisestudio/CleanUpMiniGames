// UI palette and type from project/STYLE-GUIDE.md (measured from the references).
export const COLORS = {
  green: 0x31c339,
  greenEdge: 0x28b22c,
  greenFrame: 0x4fc24d,
  lime: 0x7ce818,
  track: 0x0d233e,
  yellow: 0xffd729,
  yellowEdge: 0xc9a227,
  white: 0xffffff,
  cream: 0xfffbf7,
  creamLabel: 0xfff3de,
  ribbon: 0xf1d4b6,
  ribbonShade: 0xd9b999,
  rewardPill: 0xf3eef3,
  menuBg: 0xfff7f7,
  menuHeader: 0xf7efe7,
  navy: 0x344660,
  dim: 0x000000,
};

export const TEXT = {
  navy: '#344660',
  title: '#3F5B83',
  brown: '#594D36',
  neutral: '#535653',
  white: '#FFFFFF',
  outline: '#3A3A3A',
  greenStroke: '#1E7A24',
  yellowStroke: '#9C7A12',
};

// Bundled locally from @fontsource (OFL): Rubik for titles/buttons, Nunito for numbers/labels.
// Both include Latin + Cyrillic; the final choice is revisited after the localization decision.
export const FONT_DISPLAY = '"Rubik", "Arial Rounded MT Bold", Arial, sans-serif';
export const FONT_UI = '"Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
