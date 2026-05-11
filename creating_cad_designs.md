# Creating CAD designs with React CAD

This is a field guide for AI agents building realistic CAD designs in this repo. It captures the hard-won lessons from recreating the cassette example from a photo reference.

## Core mindset

Build the model as geometry, not as a picture. If something is meant to be hollow, cut it. If something should line up with a surrounding part, derive its position from that part. If something visually blends into a background, make the geometry/material relationship explain why.

## Do

- **Decompose the reference into physical layers.** For the cassette this meant: black shell, cream label panel, black tape window, cream counter, bottom wood panel, screws, and reel holes.
- **Name important nodes.** Use `name` on panels, holes, labels, and repeated features so tests and Playwright model queries can verify geometry by intent.
- **Use constants for every meaningful dimension.** Prefer `TAPE_WINDOW_WIDTH`, `TAPE_COUNTER_WIDTH`, `REEL_SIDE_CENTER_X` over mystery numbers.
- **Derive alignment from surrounding geometry.** Example: center the reels in each side of the tape window with math, not by eye:

  ```ts
  const REEL_SIDE_CENTER_X = (TAPE_WINDOW_WIDTH / 2 + TAPE_COUNTER_WIDTH / 2) / 2;
  const REEL_LEFT_X = -REEL_SIDE_CENTER_X;
  const REEL_RIGHT_X = REEL_SIDE_CENTER_X;
  ```

- **Use real cutouts for real holes.** A black circle over a surface is not a hole. Model holes with `<Cutout>` and geometry that passes all the way through the target solid.
- **Cut through every layer that would otherwise show behind the hole.** If a black tape window sits on top of a cream panel, the cream panel can show through holes unless the window area is cleared from the cream panel too.
- **Model shape semantics directly.** If a reel hole is a cog shape, use one notched/cog-shaped polygon cutout instead of separate decorative rectangles floating on top.
- **Keep decorative features collision-free.** Prefer one cutout/profile for a feature over several overlapping positive meshes.
- **Use small components for repeated physical concepts.** Good examples: `ReelHollowCutout`, `Screw`, `TapeWindow`, `WoodPanel`.
- **Validate visually and structurally.** Use both tests and Playwright screenshots. Dark-on-dark geometry is easy to misread from code alone.

## Don't

- **Do not fake holes with same-colored overlays.** It may look okay from one angle, then fail when rotated or exported.
- **Do not stack positive geometry inside a cutout to simulate teeth.** It creates collisions and weird lighting. Put teeth/notches into the cutout profile itself.
- **Do not hard-code positions that are really centers between neighboring objects.** Future size tweaks will break alignment.
- **Do not leave cream/material layers behind black windows.** Boolean cut faces expose the material of the solid being cut, so cream panels can appear inside black holes if the underlying layer was not cleared.
- **Do not trust the first screenshot.** Rotate/zoom with Playwright or inspect `/model.json` when a feature is dark, hollow, or layered.
- **Do not add tests that only prove a bad implementation exists.** Test desired invariants: centered features, absence of standalone collision-prone teeth, correct cutout profiles.

## Cutout rules that matter

`<Cutout>` subtracts from the nearest parent solid. That parent relationship matters.

```tsx
<Polygon name="tape-window" points={...} thickness={0.62} color={WINDOW_COLOR}>
  <Cutout name="tape-window-left-reel-hollow">
    <Polygon points={spoolHollowPoints()} thickness={2} position={{ x: REEL_LEFT_X }} />
  </Cutout>
</Polygon>
```

If the tape window is on top of a cream panel, this only cuts the black tape-window solid. The cream panel behind it can still be visible through the hole. Clear the whole tape-window region from the cream panel, or cut the matching hole through that panel too:

```tsx
<Polygon name="label-panel" points={...} color={PANEL_WOOD_COLOR}>
  <Cutout name="label-panel-tape-window-clearance">
    <Polygon
      points={roundedRectanglePoints(TAPE_WINDOW_WIDTH, TAPE_WINDOW_HEIGHT, 3.1)}
      thickness={2}
      position={{ y: TAPE_WINDOW_CENTER_Y - TOP_WOOD_PANEL_CENTER_Y }}
    />
  </Cutout>
</Polygon>
```

## Building cog / toothed holes

For a cog-like hole, make the hole profile a single polygon. The teeth are the material left between rectangular-ish notches, not separate blocks pasted onto the front.

Pattern:

1. Start at the outer radius.
2. Walk around the circle.
3. For each tooth/notch, add two inner-radius points to create a rectangular-ish bite.
4. Add arc points between notches for a round outside.
5. Use that polygon as the cutout shape.

```ts
function spoolHollowPoints(): Point2[] {
  const toothSpacingAngle = (Math.PI * 2) / REEL_INNER_TOOTH_COUNT;
  const toothHalfAngle = REEL_INNER_TOOTH_WIDTH / (2 * REEL_HOLLOW_RADIUS);
  const points: Point2[] = [];

  // Add outer arc points and paired inner points for each notch.
  // The result is one cutout profile, not many colliding meshes.
  return points;
}
```

Tests should prove the final model has no standalone tooth meshes:

```ts
expect(nodes.some((node) => String(node.props.name).includes("-inner-tooth-"))).toBe(false);
expect(countInnerNotchVertices(hollowShape.props.points)).toBe(16); // 8 notches × 2 inner vertices
```

## Layering and z offsets

Use named surfaces for predictable stacking:

```ts
const RAISED_SURFACE = { z: { from: "front", offset: 0.52 } } as const;
const WINDOW_SURFACE = { z: { from: "front", offset: 0.66 } } as const;
const DETAIL_SURFACE = { z: { from: "front", offset: 0.82 } } as const;
const INK_SURFACE = { z: { from: "front", offset: 0.94 } } as const;
```

Keep layers separated enough to avoid z-fighting, but avoid adding visual plates where a cutout should be enough.

## Verification workflow

Run focused checks after each meaningful geometry change:

```bash
pnpm test -- tests/basic-example.test.ts
pnpm typecheck
pnpm smoke
```

Then verify visually with Playwright against the renderer:

1. Start the renderer without opening a browser:

   ```bash
   REACT_CAD_RENDER_OPEN=0 node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx --host=127.0.0.1 --port=5173
   ```

2. Use Playwright to load the page and wait for `Ready`.
3. Take screenshots after rotating/zooming enough to inspect the feature.
4. Query `/model.json` for structural facts when needed:

   ```js
   const payload = await (await fetch('/model.json')).json();
   const nodes = flatten(payload.compiled.nodes);
   ```

Good structural checks include:

- no warnings from `compileModelWithCutouts`
- expected cutout nodes exist
- no standalone meshes for features that should be cutout profiles
- derived centers match expected centers
- no unwanted material layer is visible behind a hole

## Practical review checklist

Before calling a design done, ask:

- Are all real holes modeled as cutouts?
- Do cutouts pass through every layer that would otherwise show through?
- Are repeated features computed from shared constants?
- Are visually centered parts centered by formula, not eyeballed?
- Are teeth/notches part of one profile instead of colliding separate meshes?
- Do tests assert the geometry contract, not the incidental implementation?
- Did Playwright confirm the design from the angle where the issue is visible?
