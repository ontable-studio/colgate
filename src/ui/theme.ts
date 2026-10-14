import type Phaser from 'phaser';

/** Brand tokens. Colours come from the client's palette file (COLGATE COLOR.ai) and storyboard. */
export const COLORS = {
  red: '#ED1C24',
  redBright: '#F4151F',
  redDeep: '#B3101B',
  redDark: '#6A0710',
  orange: '#F37021',
  gold: '#FDB415',
  goldSoft: '#FFD36B',
  goldLight: '#FFE9A6',
  cream: '#FFF4D6',
  white: '#FFFFFF',
} as const;

export const FONT_FAMILY = "'Colgate Ready', sans-serif";

/** Canvas font strings (used when drawing textures). */
export const FONTS = {
  light: `300 {size}px ${FONT_FAMILY}`,
  bold: `700 {size}px ${FONT_FAMILY}`,
  boldItalic: `italic 700 {size}px ${FONT_FAMILY}`,
} as const;

export function canvasFont(kind: keyof typeof FONTS, size: number): string {
  return FONTS[kind].replace('{size}', String(size));
}

type Weight = 'light' | 'bold' | 'boldItalic';

const FONT_STYLE: Record<Weight, string> = {
  light: '300',
  bold: 'bold',
  boldItalic: 'italic bold',
};

export interface TextOptions {
  size: number;
  weight?: Weight;
  color?: string;
  align?: 'left' | 'center' | 'right';
  glow?: string;
  letterSpacing?: number;
  wrapWidth?: number;
  lineSpacing?: number;
}

/** Phaser text style in the brand font. */
export function textStyle({
  size,
  weight = 'bold',
  color = COLORS.white,
  align = 'center',
  glow,
  letterSpacing,
  wrapWidth,
  lineSpacing,
}: TextOptions): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: FONT_STYLE[weight],
    color,
    align,
    ...(glow ? { shadow: { offsetX: 0, offsetY: 0, color: glow, blur: 22, fill: true } } : {}),
    ...(letterSpacing !== undefined ? { letterSpacing } : {}),
    ...(wrapWidth !== undefined ? { wordWrap: { width: wrapWidth } } : {}),
    ...(lineSpacing !== undefined ? { lineSpacing } : {}),
  };
}
