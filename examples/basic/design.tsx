import { Circle, Polygon, Rectangle, Text } from "@jordyvd/react-cad/2d";
import { Cutout } from "@jordyvd/react-cad/operations";

const SONG_TITLE = "Hello world! @jordyvd/react-cad, made with love by Jordy";
const CASSETTE_WIDTH = 96;
const CASSETTE_HEIGHT = 60;
const CASSETTE_DEPTH = 4;
const TOP_WOOD_PANEL_WIDTH = 84.2;
const TOP_WOOD_PANEL_HEIGHT = 34.2;
const TOP_WOOD_PANEL_CENTER_Y = 8.8;
const TAPE_WINDOW_WIDTH = 58.5;
const TAPE_WINDOW_HEIGHT = 14.2;
const TAPE_WINDOW_CENTER_Y = 5.1;
const TAPE_COUNTER_WIDTH = 17;
const REEL_SIDE_CENTER_X = (TAPE_WINDOW_WIDTH / 2 + TAPE_COUNTER_WIDTH / 2) / 2;
const REEL_LEFT_X = -REEL_SIDE_CENTER_X;
const REEL_RIGHT_X = REEL_SIDE_CENTER_X;
const REEL_HOLLOW_RADIUS = 3.7;
const REEL_HOLLOW_ARC_SEGMENTS = 4;
const REEL_INNER_TOOTH_COUNT = 8;
const REEL_INNER_TOOTH_WIDTH = 0.95;
const REEL_INNER_TOOTH_DEPTH = 1.55;
const REEL_INNER_TOOTH_ROOT_RADIUS = REEL_HOLLOW_RADIUS - REEL_INNER_TOOTH_DEPTH;
const RIGHT_WOOD_SIDE_CENTER_X = (TOP_WOOD_PANEL_WIDTH + TAPE_WINDOW_WIDTH) / 4;
const TOP_ENGRAVED_LINE_HEIGHT = 0.28;
const LOWER_ENGRAVED_LINE_HEIGHT = 0.25;
const TOP_WOOD_PANEL_TOP_Y = TOP_WOOD_PANEL_CENTER_Y + TOP_WOOD_PANEL_HEIGHT / 2;
const TAPE_WINDOW_TOP_Y = TAPE_WINDOW_CENTER_Y + TAPE_WINDOW_HEIGHT / 2;
const HORIZONTAL_BAR_GAP = (TOP_WOOD_PANEL_TOP_Y - TAPE_WINDOW_TOP_Y - TOP_ENGRAVED_LINE_HEIGHT - LOWER_ENGRAVED_LINE_HEIGHT) / 3;
const TOP_ENGRAVED_LINE_Y = TOP_WOOD_PANEL_TOP_Y - HORIZONTAL_BAR_GAP - TOP_ENGRAVED_LINE_HEIGHT / 2;
const LOWER_ENGRAVED_LINE_Y = TAPE_WINDOW_TOP_Y + HORIZONTAL_BAR_GAP + LOWER_ENGRAVED_LINE_HEIGHT / 2;
const HELLO_WORLD_LABEL_Y = ((TOP_ENGRAVED_LINE_Y - TOP_ENGRAVED_LINE_HEIGHT / 2) + (LOWER_ENGRAVED_LINE_Y + LOWER_ENGRAVED_LINE_HEIGHT / 2)) / 2;
const RAISED_SURFACE = { z: { from: "front", offset: 0.52 } } as const;
const WINDOW_SURFACE = { z: { from: "front", offset: 0.66 } } as const;
const DETAIL_SURFACE = { z: { from: "front", offset: 0.82 } } as const;
const INK_SURFACE = { z: { from: "front", offset: 0.94 } } as const;

const SHELL_COLOR = "#141419";
const PANEL_WOOD_COLOR = "#eee6c7";
const WOOD_LINE_COLOR = "#966431";
const PRINT_COLOR = "#7b4a22";
const WINDOW_COLOR = "#101014";
const SCREW_HEAD_COLOR = "#202026";
const SCREW_SLOT_COLOR = "#595960";
const BOTTOM_HOLE_COLOR = "#050506";
const SIDE_PRINT_TEXT_SIZE = 3;
const HELLO_WORLD_TEXT_SIZE = 1.5;

type Point2 = [number, number];

type PositionedFeature = {
  name: string;
  x: number;
  y: number;
};

function roundedRectanglePoints(width: number, height: number, corner: number, steps = 5): Point2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = Math.min(corner, halfWidth, halfHeight);
  const corners = [
    { x: halfWidth - radius, y: -halfHeight + radius, from: -90, to: 0 },
    { x: halfWidth - radius, y: halfHeight - radius, from: 0, to: 90 },
    { x: -halfWidth + radius, y: halfHeight - radius, from: 90, to: 180 },
    { x: -halfWidth + radius, y: -halfHeight + radius, from: 180, to: 270 },
  ];

  return corners.flatMap((cornerPoint) => {
    return Array.from({ length: steps + 1 }, (_, index) => {
      const angle = cornerPoint.from + ((cornerPoint.to - cornerPoint.from) * index) / steps;
      const radians = (Math.PI / 180) * angle;
      return [cornerPoint.x + Math.cos(radians) * radius, cornerPoint.y + Math.sin(radians) * radius] as Point2;
    });
  });
}

function bottomPanelPoints(widthTop: number, widthBottom: number, height: number): Point2[] {
  return [
    [-widthBottom / 2, -height / 2],
    [widthBottom / 2, -height / 2],
    [widthTop / 2, height / 2],
    [-widthTop / 2, height / 2],
  ];
}

function spoolHollowPoints(): Point2[] {
  const toothSpacingAngle = (Math.PI * 2) / REEL_INNER_TOOTH_COUNT;
  const toothHalfAngle = REEL_INNER_TOOTH_WIDTH / (2 * REEL_HOLLOW_RADIUS);
  const firstToothCenter = -Math.PI / 2;
  const firstToothStart = firstToothCenter - toothHalfAngle;
  const points: Point2[] = [polarPoint(REEL_HOLLOW_RADIUS, firstToothStart)];
  let previousToothEnd = firstToothCenter + toothHalfAngle;

  for (let index = 0; index < REEL_INNER_TOOTH_COUNT; index += 1) {
    const toothCenter = firstToothCenter + index * toothSpacingAngle;
    const toothStart = toothCenter - toothHalfAngle;
    const toothEnd = toothCenter + toothHalfAngle;

    if (index > 0) appendOuterArc(points, previousToothEnd, toothStart);
    points.push(polarPoint(REEL_INNER_TOOTH_ROOT_RADIUS, toothStart));
    points.push(polarPoint(REEL_INNER_TOOTH_ROOT_RADIUS, toothEnd));
    points.push(polarPoint(REEL_HOLLOW_RADIUS, toothEnd));
    previousToothEnd = toothEnd;
  }

  appendOuterArc(points, previousToothEnd, firstToothStart + Math.PI * 2, false);
  return points;
}

function appendOuterArc(points: Point2[], fromAngle: number, toAngle: number, includeEnd = true): void {
  const finalStep = includeEnd ? REEL_HOLLOW_ARC_SEGMENTS : REEL_HOLLOW_ARC_SEGMENTS - 1;
  for (let step = 1; step <= finalStep; step += 1) {
    const angle = fromAngle + ((toAngle - fromAngle) * step) / REEL_HOLLOW_ARC_SEGMENTS;
    points.push(polarPoint(REEL_HOLLOW_RADIUS, angle));
  }
}

function polarPoint(radius: number, angle: number): Point2 {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function WoodPanel() {
  return (
    <>
      <Polygon name="label-panel" points={roundedRectanglePoints(TOP_WOOD_PANEL_WIDTH, TOP_WOOD_PANEL_HEIGHT, 2.4)} thickness={0.5} color={PANEL_WOOD_COLOR} position={{ y: TOP_WOOD_PANEL_CENTER_Y, ...RAISED_SURFACE }}>
        <Cutout name="label-panel-tape-window-clearance">
          <Polygon points={roundedRectanglePoints(TAPE_WINDOW_WIDTH, TAPE_WINDOW_HEIGHT, 3.1)} thickness={2} position={{ y: TAPE_WINDOW_CENTER_Y - TOP_WOOD_PANEL_CENTER_Y }} />
        </Cutout>
      </Polygon>
      <Rectangle name="top-engraved-line" width={69.5} height={TOP_ENGRAVED_LINE_HEIGHT} thickness={0.22} color={WOOD_LINE_COLOR} position={{ y: TOP_ENGRAVED_LINE_Y, ...INK_SURFACE }} />
      <Rectangle name="lower-engraved-line" width={69.5} height={LOWER_ENGRAVED_LINE_HEIGHT} thickness={0.22} color={WOOD_LINE_COLOR} position={{ y: LOWER_ENGRAVED_LINE_Y, ...INK_SURFACE }} />
      <Text name="hello-world-label" value={SONG_TITLE} size={HELLO_WORLD_TEXT_SIZE} thickness={0.32} color={PRINT_COLOR} position={{ y: HELLO_WORLD_LABEL_Y, ...INK_SURFACE }} />
      <Text name="cassette-90" value="90" size={4.5} thickness={0.36} color={PRINT_COLOR} position={{ x: -35.2, y: 5.3, ...INK_SURFACE }} />
      <Text name="cassette-tape" value="TAPE" size={SIDE_PRINT_TEXT_SIZE} thickness={0.34} color={PRINT_COLOR} position={{ x: RIGHT_WOOD_SIDE_CENTER_X, y: 5.4, ...INK_SURFACE }} />
    </>
  );
}

function TapeWindow() {
  return (
    <>
      <Polygon name="tape-window" points={roundedRectanglePoints(TAPE_WINDOW_WIDTH, TAPE_WINDOW_HEIGHT, 3.1)} thickness={0.62} color={WINDOW_COLOR} position={{ y: TAPE_WINDOW_CENTER_Y, ...WINDOW_SURFACE }}>
        <ReelHollowCutout name="tape-window-left-reel-hollow" x={REEL_LEFT_X} height={2} />
        <ReelHollowCutout name="tape-window-right-reel-hollow" x={REEL_RIGHT_X} height={2} />
      </Polygon>
      <TapeCounter />
    </>
  );
}

function ReelHollowCutout({ name, x = 0, y = 0, height }: { name: string; x?: number; y?: number; height: number }) {
  return (
    <Cutout name={name}>
      <Polygon points={spoolHollowPoints()} thickness={height} position={{ x, y }} />
    </Cutout>
  );
}

function TapeCounter() {
  return (
    <>
      <Rectangle name="tape-counter" width={TAPE_COUNTER_WIDTH} height={8.4} thickness={0.4} color={PANEL_WOOD_COLOR} position={{ y: 5.1, ...DETAIL_SURFACE }} />
      <Rectangle name="counter-baseline" width={14.2} height={0.23} thickness={0.2} color={PRINT_COLOR} position={{ y: 5.1, z: { from: "front", offset: 1.08 } }} />
      {[-6.4, -3.9, -1.9, 1.9, 3.9, 6.4].map((x, index) => (
        <Rectangle
          key={`counter-small-tick-${index}`}
          name={`counter-small-tick-${index}`}
          width={0.28}
          height={1.25}
          thickness={0.2}
          color={PRINT_COLOR}
          position={{ x, y: 5.1, z: { from: "front", offset: 1.12 } }}
        />
      ))}
      <Rectangle name="counter-major-tick" width={0.34} height={4.45} thickness={0.22} color={PRINT_COLOR} position={{ y: 5.1, z: { from: "front", offset: 1.14 } }} />
    </>
  );
}

function BottomWoodPanel() {
  return (
    <>
      <Polygon name="bottom-wood-panel" points={bottomPanelPoints(57.2, 67.4, 12.2)} thickness={0.5} color={PANEL_WOOD_COLOR} position={{ y: -23.9, ...RAISED_SURFACE }} />
      <Circle name="left-bottom-round-hole" radius={2.65} thickness={0.28} color={BOTTOM_HOLE_COLOR} position={{ x: -27.2, y: -24.8, ...DETAIL_SURFACE }} />
      <Rectangle name="left-bottom-square-hole" width={3.7} height={3.25} thickness={0.28} color={BOTTOM_HOLE_COLOR} position={{ x: -17.5, y: -24.3, ...DETAIL_SURFACE }} />
      <Rectangle name="right-bottom-square-hole" width={3.7} height={3.25} thickness={0.28} color={BOTTOM_HOLE_COLOR} position={{ x: 17.5, y: -24.3, ...DETAIL_SURFACE }} />
      <Circle name="right-bottom-round-hole" radius={2.65} thickness={0.28} color={BOTTOM_HOLE_COLOR} position={{ x: 27.2, y: -24.8, ...DETAIL_SURFACE }} />
      <Screw name="bottom-center-screw" x={0} y={-20.2} radius={1.55} headColor="#d7bd83" slotColor={PRINT_COLOR} />
    </>
  );
}

function Screw({ name, x, y, radius = 1.55, headColor = SCREW_HEAD_COLOR, slotColor = SCREW_SLOT_COLOR }: PositionedFeature & { radius?: number; headColor?: string; slotColor?: string }) {
  return (
    <Circle name={name} radius={radius} thickness={0.42} color={headColor} position={{ x, y, ...DETAIL_SURFACE }}>
      <Rectangle name={`${name}-slot-a`} width={radius * 1.45} height={0.32} thickness={0.18} color={slotColor} position={{ z: { from: "front", offset: 0.13 } }} rotation={{ z: 45 }} />
      <Rectangle name={`${name}-slot-b`} width={radius * 1.45} height={0.32} thickness={0.18} color={slotColor} position={{ z: { from: "front", offset: 0.14 } }} rotation={{ z: -45 }} />
    </Circle>
  );
}

function CornerScrews() {
  return (
    <>
      <Screw name="top-left-corner-screw" x={-44.4} y={26.2} />
      <Screw name="top-right-corner-screw" x={44.4} y={26.2} />
      <Screw name="bottom-left-corner-screw" x={-44.4} y={-26.2} />
      <Screw name="bottom-right-corner-screw" x={44.4} y={-26.2} />
    </>
  );
}

export default function Design() {
  return (
    <Polygon name="cassette-shell" points={roundedRectanglePoints(CASSETTE_WIDTH, CASSETTE_HEIGHT, 4, 7)} thickness={CASSETTE_DEPTH} color={SHELL_COLOR}>
      <ReelHollowCutout name="shell-left-reel-hollow" x={REEL_LEFT_X} y={TAPE_WINDOW_CENTER_Y} height={CASSETTE_DEPTH + 6} />
      <ReelHollowCutout name="shell-right-reel-hollow" x={REEL_RIGHT_X} y={TAPE_WINDOW_CENTER_Y} height={CASSETTE_DEPTH + 6} />
      <WoodPanel />
      <TapeWindow />
      <BottomWoodPanel />
      <CornerScrews />
    </Polygon>
  );
}
