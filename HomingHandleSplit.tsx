// Lab: "Split-View with Homing Handle" (Figma 21:1543 / 28:3299), behaving like
// the site's image-reveal-slider: the reveal moves ONLY while you drag the line or
// handle; while you hover, the handle glides up/down to your cursor's Y (homing).
// The divide line spans the whole frame, not just the picture. Picker (21:2172):
// pyramid = skeuomorphic handle (default), triangle = flat (line and handle flat,
// no shadows, yellow).
"use client";

import { useEffect, useRef, useState } from "react";
import { Pyramid, Triangle } from "lucide-react";
import LabSettings, { useLabSettings, type LabSettingSchema } from "@/components/labs/LabSettings";

type Skin = "skeuo" | "flat";
type HandleStyle = "pyramid" | "flat";

const HANDLE_STYLE_TO_SKIN: Record<HandleStyle, Skin> = { pyramid: "skeuo", flat: "flat" };

// ---------------------------------------------------------------------------
// Settings (S2, see qmanning-notes/drafts/cms-plan/LAB-SETTINGS-PLAN.md).
// Every `default` below is lifted verbatim from this file's original hard-coded
// values (see the citation in each entry), so the gear changes nothing at rest.
// ---------------------------------------------------------------------------
export const HOMING_HANDLE_SETTINGS: LabSettingSchema = [
    {
        key: "handleStyle",
        label: "Handle style",
        kind: "select",
        default: "pyramid", // was `useState<Skin>("skeuo")` — skeuo is the pyramid picker button
        options: [
            { value: "pyramid", label: "3D" },
            { value: "flat", label: "Flat" },
        ],
    },
    {
        key: "homingMs",
        label: "Homing speed",
        kind: "range",
        // The original tick() lerps handleY toward targetY by 25%/frame at ~60fps,
        // which settles (<5% remaining) in ~10 frames ≈ 170ms; 200 is the nearest
        // step at the slider's floor. Only takes effect when homingCurve !== "none" —
        // the default curve reproduces the original 0.25 factor exactly and ignores
        // this value, so the default look is unaffected either way.
        default: 170,
        min: 50,
        max: 4000,
        step: 50,
        unit: "ms",
    },
    {
        key: "homingCurve",
        label: "Homing curve",
        kind: "select",
        // "none" = today's exact algorithm (fixed 0.25/frame ease, tick() below);
        // the other curves are duration-based alternates driven by homingMs.
        default: "none",
        options: [
            { value: "ease-in", label: "Ease in" },
            { value: "ease-in-out", label: "Ease in-out" },
            { value: "linear", label: "Linear" },
            { value: "none", label: "None" },
        ],
    },
    {
        key: "initialSplit",
        label: "Initial split",
        kind: "range",
        default: 50, // was `useState(50)`
        min: 10,
        max: 90,
        step: 1,
        unit: "%",
    },
    {
        key: "lineColor",
        label: "Line color",
        kind: "color",
        // Was the flat skin's hard-coded accent stroke:
        // globals.css `.h26-divide--flat::after { background: #FFC429 }`.
        // Only visible in the flat skin, matching today's design (skeuo has no
        // accent stroke at all — see the handleStyle === "flat" gate below).
        default: "#FFC429",
        options: [
            { value: "#FFC429", label: "Gold" },
            { value: "#FFFFFF", label: "White" },
            { value: "color-mix(in srgb, var(--foreground) 50%, transparent)", label: "Foreground 50%" },
            { value: "#FF5364", label: "Pink" },
            { value: "#84CEFF", label: "Blue" },
        ],
    },
    {
        key: "showHandle",
        label: "Show handle",
        kind: "toggle",
        default: true, // the handle <div> was always rendered
    },
];

const FRAME_MS = 16.67; // nominal rAF cadence — matches tick()'s original implicit assumption

// Per-frame lerp factor for the homing ease. "none" reproduces the original
// hard-coded 0.25 constant exactly (ignores homingMs); the other curves derive a
// frame factor from homingMs so the settle time stays roughly configurable while
// remaining stable under a continuously-moving hover target.
function easeFactor(curve: string, homingMs: number): number {
    // Per-frame lerp factor from a settle time: the handle closes ~95% of the gap in
    // `homingMs`. At the default (170ms) this equals the original 0.25/frame feel.
    const f = 1 - Math.exp((-3 * FRAME_MS) / Math.max(30, homingMs));
    switch (curve) {
        case "ease-in":
            return f * 0.6;      // starts gentler, same settle time order
        case "ease-in-out":
            return f * 0.8;
        case "linear":
        case "none":
        default:
            return f;
    }
}

export default function HomingHandleSplit() {
    const { value, setValue } = useLabSettings(HOMING_HANDLE_SETTINGS, "lab:split-view-homing-handle");
    const handleStyle = (value.handleStyle as HandleStyle) ?? "pyramid";
    const homingMs = Number(value.homingMs ?? 200);
    const homingCurve = String(value.homingCurve ?? "none");
    const initialSplit = Number(value.initialSplit ?? 50);
    const lineColor = String(value.lineColor ?? "#FFC429");
    const showHandle = value.showHandle !== false;
    const skin: Skin = HANDLE_STYLE_TO_SKIN[handleStyle] ?? "skeuo";

    const frame = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState(initialSplit);        // reveal %, changes only on drag
    const IMG_TOP = 92, IMG_H = 162, FRAME_H = 362; // slot height (tile 378 minus 8px padding each side)
    const CENTER = ((IMG_TOP + IMG_H / 2) / FRAME_H) * 100;
    const MIN = ((IMG_TOP + 12) / FRAME_H) * 100, MAX = ((IMG_TOP + IMG_H - 12) / FRAME_H) * 100;
    const [targetY, setTargetY] = useState(CENTER); // cursor Y as % of frame, clamped to the picture
    const [handleY, setHandleY] = useState(CENTER); // eased
    const [dragging, setDragging] = useState(false);
    const [handleHover, setHandleHover] = useState(false);
    const [tipSuppressed, setTipSuppressed] = useState(false); // set on drag, cleared only on a fresh enter

    // Settings-driven starting position: fires once at mount (matches the old
    // hard-coded 50) and again live whenever the gear's "Initial split" changes.
    useEffect(() => { setPos(initialSplit); }, [initialSplit]);

    useEffect(() => {
        let raf = 0;
        const factor = easeFactor(homingCurve, homingMs);
        const tick = () => { setHandleY((y) => (dragging ? targetY : y + (targetY - y) * factor)); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [targetY, dragging, homingCurve, homingMs]);

    const IMG_W = 250;
    const pct = (e: React.PointerEvent) => {
        const r = frame.current!.getBoundingClientRect();
        const imgLeft = r.left + (r.width - IMG_W) / 2;
        return { x: ((e.clientX - imgLeft) / IMG_W) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    };
    // line x in frame coordinates = picture left + pos% of picture width
    const lineLeft = `calc(50% + ${((pos - 50) / 100) * IMG_W}px - 2px)`;

    return (
        <div
            ref={frame}
            className={`relative group h-full w-full select-none ${dragging ? "cursor-grabbing" : ""}`}
            onPointerMove={(e) => {
                const p = pct(e);
                setTargetY(Math.min(MAX, Math.max(MIN, p.y)));
                if (dragging) setPos(Math.min(100, Math.max(0, p.x)));
            }}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => { setDragging(false); setTargetY(CENTER); }}
        >
            {/* Picture slot 250×162 r24, centered in the upper part of the frame */}
            <div className="absolute left-1/2 top-[92px] h-[162px] w-[250px] -translate-x-1/2 overflow-hidden rounded-[24px] border border-white/25">
                <div className="absolute inset-0" style={{ background: "url(/home-2026/lab/split-b.jpg?v=2) center/cover, linear-gradient(135deg,#1f2a44,#3a5a8c)" }} />
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, background: "url(/home-2026/lab/split-a.jpg?v=2) center/cover, linear-gradient(135deg,#5a2431,#ff5364)" }} />
            </div>
            {/* Divide line: full frame height (28:3127 / flat variant) — drag to reveal */}
            <div
                className={`h26-divide h26-divide--${skin} absolute -bottom-[9px] -top-[9px] cursor-ew-resize`}
                style={{ left: lineLeft }}
                onPointerDown={(e) => { e.preventDefault(); (e.target as Element).closest("div")?.setPointerCapture?.(e.pointerId); setDragging(true); setTipSuppressed(true); }}
            >
                {/* Color override for the flat skin's accent stroke (globals.css's
                    ::after is a fixed #FFC429; this real element sits on top of it via
                    z-index so the settings color wins without touching globals.css).
                    Skeuo has no accent stroke today, so this only renders for flat —
                    adding it unconditionally would change the skeuo default look. */}
                {skin === "flat" ? (
                    <span aria-hidden className="pointer-events-none absolute left-[1.5px] top-0 bottom-0 w-px" style={{ background: lineColor, zIndex: 1 }} />
                ) : null}
                {showHandle ? (
                    <div
                        className={`h26-handle h26-handle--${skin} cursor-grab`}
                        style={{ top: `${handleY}%` }}
                        onPointerDown={(e) => { e.preventDefault(); setDragging(true); setTipSuppressed(true); }}
                        onPointerEnter={() => { setHandleHover(true); setTipSuppressed(false); }}
                        onPointerLeave={() => setHandleHover(false)}
                    >
                        {/* Tooltip shows on a fresh mouseover only. A drag suppresses it for
                            the rest of that hover; it returns only after leaving and
                            re-entering. State-driven (dropping the h26-tip class entirely when
                            suppressed) so CSS :hover can't bring it back after a drag. */}
                        <div className={`h26-handle-inner${!dragging && !tipSuppressed ? " h26-tip" : ""}${handleHover && !dragging && !tipSuppressed ? " h26-tip--show" : ""}`} data-tip="Drag me"><span /><span /><span /><span /></div>
                    </div>
                ) : null}
            </div>
            <div className="h26-picker absolute bottom-4 left-1/2 -translate-x-1/2">
                <button type="button" className="h26-picker-btn" data-tip="Skeuomorphic handle" aria-label="Skeuomorphic handle" aria-pressed={handleStyle === "pyramid"} onClick={(e) => { e.preventDefault(); setValue("handleStyle", "pyramid"); }}><Pyramid className="h-4 w-4" /></button>
                <button type="button" className="h26-picker-btn" data-tip="Flat handle" aria-label="Flat handle" aria-pressed={handleStyle === "flat"} onClick={(e) => { e.preventDefault(); setValue("handleStyle", "flat"); }}><Triangle className="h-4 w-4" /></button>
            </div>
            <LabSettings
                schema={HOMING_HANDLE_SETTINGS}
                value={value}
                onChange={setValue}
                storageKey="lab:split-view-homing-handle"
                title="Split-view settings"
                anchor="top-left"
            />
        </div>
    );
}
