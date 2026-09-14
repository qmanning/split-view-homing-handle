# Split-View with Homing Handle

A before/after reveal that only moves while you drag — with a handle that comes to you.

**Live demo:** https://qmanning.com/labs/split-view-homing-handle

## What it does

A two-image split view where the divider **only moves while you're dragging it** — hovering across the image doesn't yank the reveal around, which is the thing every before/after slider gets wrong. The handle itself is friendlier than usual: as your cursor moves up and down, the grip **homes** toward your cursor's height so it's always where your hand is. Two skins for the grip — a skeuomorphic pyramid and a flat triangle.

## How it works

- The split position is state (`0–100%`) that changes **only** between `pointerdown` and `pointerup` on the handle; the container clips the "after" layer with `clip-path`, so both images stay the same size and aligned.
- On hover, a second piece of state tracks the pointer's Y and the grip eases toward it with a CSS transition — the *homing*.
- The pointer is captured on the handle during a drag, so fast drags that leave the element still track.
- The skin picker just swaps the icon (`Pyramid` / `Triangle` from lucide) and a couple of classes.

This same behavior is now the site's CMS image-reveal slider; the lab version is the minimal, dependency-free original.

## Settings

The gear in the top corner of the demo (14px, `Settings` icon) opens a menu of this lab's controls; every change updates the demo live. Save keeps your values in the browser, Reset restores the defaults, and a universal "Hide controls" switch hides every lab's gear at once (a small "show controls" link brings it back).

| Control | Type | Default | Range or options |
|---|---|---|---|
| Handle style | select | 3D | 3D, Flat |
| Homing speed | range | 170ms | 50ms to 4000ms |
| Homing curve | select | None | Ease in, Ease in-out, Linear, None |
| Initial split | range | 50% | 10% to 90% |
| Line color | color | Gold (#FFC429) | Gold, White, Foreground 50%, Pink, Blue |
| Show handle | toggle | on | on/off |

Going live: pass `showControls={false}` to hide the gear in production, or keep it and let visitors dial it in.

## Install

1. Download `HomingHandleSplit.tsx` and drop it in your project (client component).
2. `npm i lucide-react` for the two grip icons (or replace them with your own SVG).
3. Replace the two image URLs at the top of the file with yours — both images should be the same size.

```bash
npm i lucide-react
```

## Use

```tsx
import HomingHandleSplit from "@/components/HomingHandleSplit";

export default function Compare() {
    return (
        <div className="h-[380px]">
            <HomingHandleSplit />
        </div>
    );
}
```

To expose the images as props instead of constants, lift `BEFORE`/`AFTER` into the function signature — the rest of the file doesn't care where the URLs come from.

## License

MIT.

---

Made by [Q Manning](https://qmanning.com) · [Source on GitHub](https://github.com/qmanning/split-view-homing-handle) · [See it live in the Labs](https://qmanning.com/labs/split-view-homing-handle)
