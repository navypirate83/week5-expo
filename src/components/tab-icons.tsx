import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

// Every icon in this file is drawn as an SVG: a set of simple shapes (lines, circles,
// polygons) on a small 24 x 24 grid. "Wireframe" just means we draw only the outlines
// and leave the insides empty.
//
// Each icon receives two things from the tab bar:
//   color - the outline color (the tab bar changes it when a tab is selected)
//   size  - how many pixels wide and tall to draw the icon
type IconProps = {
  color: ColorValue;
  size: number;
};

// The width of every outline. Keeping it in one place makes all three icons match.
const STROKE = 1.5;

// ICON 1: a 20-sided die (a "d20") with the number 20 showing on its front face.
export function D20Icon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The outer six-sided outline you see when you look at a d20 from the front. */}
      <Polygon
        points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {/* The big triangle in the middle: this is the face pointing at you. */}
      <Polygon
        points="12,5.5 18.5,17 5.5,17"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {/* Short lines joining the triangle's corners to the outline, so it looks 3D. */}
      <Line x1="12" y1="2" x2="12" y2="5.5" stroke={color} strokeWidth={STROKE} />
      <Line x1="18.5" y1="17" x2="20.66" y2="17" stroke={color} strokeWidth={STROKE} />
      <Line x1="5.5" y1="17" x2="3.34" y2="17" stroke={color} strokeWidth={STROKE} />
      {/* The number 20 on the front face, small enough to sit inside the triangle without
          touching its edges. */}
      <SvgText
        x="12"
        y="15.2"
        fontSize="5.2"
        fontWeight="bold"
        fill={color}
        textAnchor="middle">
        20
      </SvgText>
    </Svg>
  );
}

// ICON 2: a Magic card, drawn the way a real card is laid out.
export function CardIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The card itself: a tall rectangle with rounded corners. */}
      <Rect
        x="5"
        y="2"
        width="14"
        height="20"
        rx="2"
        stroke={color}
        strokeWidth={STROKE}
      />
      {/* The name bar across the top of the card. */}
      <Line x1="8" y1="5.5" x2="16" y2="5.5" stroke={color} strokeWidth={STROKE} />
      {/* The picture box in the middle of the card. */}
      <Rect x="8" y="8" width="8" height="5" stroke={color} strokeWidth={STROKE} />
      {/* Two lines of rules text near the bottom of the card. */}
      <Line x1="8" y1="16" x2="16" y2="16" stroke={color} strokeWidth={STROKE} />
      <Line x1="8" y1="18.5" x2="13" y2="18.5" stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}

// Builds the outline of a gear as a list of corner points.
// A gear is a circle with teeth sticking out. We walk around the circle, and for each
// tooth we place four points: up the side of the tooth, across the top, and back down.
// "Math.cos" and "Math.sin" turn an angle into an x and y position on the circle.
function gearPoints(centerX: number, centerY: number): string {
  const teeth = 8;
  const innerRadius = 7; // distance from the center to the gear's body
  const outerRadius = 10; // distance from the center to the tip of a tooth
  const step = (Math.PI * 2) / teeth; // the angle taken up by one tooth plus one gap
  const points: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const start = i * step;
    // Four angles per tooth: body, tooth-bottom-left, tooth-top-left... and back.
    const angles = [start - step * 0.2, start - step * 0.12, start + step * 0.12, start + step * 0.2];
    const radii = [innerRadius, outerRadius, outerRadius, innerRadius];
    angles.forEach((angle, index) => {
      const x = centerX + Math.cos(angle) * radii[index];
      const y = centerY + Math.sin(angle) * radii[index];
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    });
  }

  return points.join(' ');
}

// The gear outline is the same every time, so we work it out once here
// instead of recalculating it each time the icon is drawn.
const GEAR_OUTLINE = gearPoints(12, 12);

// ICON 3: a gear, used for the settings page.
export function GearIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The gear body with its teeth. */}
      <Polygon points={GEAR_OUTLINE} stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
      {/* The round hole in the middle of the gear. */}
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={STROKE} />
    </Svg>
  );
}
