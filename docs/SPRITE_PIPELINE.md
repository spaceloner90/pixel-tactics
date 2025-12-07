# Sprite Generation Pipeline

This document outlines the standard process for creating, processing, and integrating unit animations into PixelTactics.

## 1. Generation Specifications
When generating new unit sprites (e.g., Archer, Wizard), use the following strict guidelines to ensure compatibility with the automated stitching scripts.

*   **Resolution**: **96x96 pixels** (Matches the `TILE_SIZE` in `GameMap.tsx`).
*   **Facing**: **RIGHT**. The unit must face the right side of the screen.
*   **Background**: **SOLID WHITE (#FFFFFF)**.
    *   *Why?* The stitching script uses chroma keying to turn white pixels transparent.
    *   *Tip*: Visually verify the background is solid. Gradient backgrounds will fail.
*   **Color Palette**:
    *   **NO PURE WHITE (#FFFFFF)** on the character itself. Use light greys (e.g., `#F0F0F0`) for whites.
*   **Scale / Layout**:
    *   **Standard Scale**: Character should occupy **~80% of the vertical space** (approx 75-80px tall).
    *   **Padding**: Leave breathing room at the top/bottom. Do NOT fill the entire 96x96 cell.
    *   **Alignment**: **Center** the character horizontally within the frame.
*   **Animation Types**:
    *   **Idle**: 1 or 2 Frames. 
        *   *2-Frame*: Standard bobbing/breathing.
        *   *1-Frame*: Perfectly acceptable for standard units to reduce noise.
    *   **Walking**: 2 Frames. 
        *   Frame 1: Left leg forward, body tilted slightly.
        *   Frame 2: Right leg forward (or passing position), opposite phase.

## 2. File Storage & Naming
Save the raw, generated frames in `assets/source/` using the following convention:

*   **Idle**: `{unit_name}_idle_1.png` / `{unit_name}_idle_2.png` (optional)
*   **Walk**: `{unit_name}_walk_1.png` / `{unit_name}_walk_2.png`

Example:
*   `assets/source/alaric_idle_1.png`
*   `assets/source/wizard_idle_1.png` (Single frame idle)

## 3. Processing Scripts
We use a **generic Python script** to stitch frames and handle transparency.

### `scripts/stitch_sprites.py`
This script stitches any number of input frames into a single sprite sheet.

**Usage:**
```bash
python scripts/stitch_sprites.py [OUTPUT_PATH] [INPUT_FRAME_1] [INPUT_FRAME_2] ...
```

**Examples:**
```bash
# Stitch 2-Frame Idle
python scripts/stitch_sprites.py public/alaric.png assets/source/alaric_idle_1.png assets/source/alaric_idle_2.png

# Stitch Single-Frame Idle
python scripts/stitch_sprites.py public/wizard.png assets/source/wizard_idle_1.png
```

**What it does:**
1.  **Resizes** frames to 96x96.
2.  **Stitches** them horizontally with a **4px Transparent Gap** (if >1 frame).
3.  **Chroma Keys** the white background to transparency (Tolerance ~10).
4.  **Saves** to the specified output path (usually `public/`).

## 4. Integration
### `GameMap.tsx` Rendering Logic
The rendering engine handles variable frame counts and static sprites:

1.  **Loading**: Load sprites using `processImage`.
    *   **Important**: We do **NOT** auto-crop the sprites. The full 96x96 dimension (including padding) is preserved to ensure consistent alignment.
2.  **State Logic**:
    *   **Walking**: Active when `isMoving` is true OR (`selectedUnitId` matches AND `interactionMode` is 'MOVEMENT').
    *   **Idle**: Default state.
    *   **Exhausted**: If `unit.hasMoved` is true (and not currently moving), the unit is rendered in valid static frame 0 with a grayscale filter.
3.  **Frame Calculation**:
    *   The engine automatically detects if a sprite is single-frame (Width ~96px) or multi-frame (Width >96px).
    *   Single-frame sprites will strictly display frame 0.

## 5. Adding a New Unit (Walkthrough)
1.  **Generate Assets**: Create Idle frames (1 or 2) following scale/padding rules.
2.  **Save in Source**: Save to `assets/source/` with correct naming.
3.  **Stitch**: Run `scripts/stitch_sprites.py` with the appropriate inputs.
4.  **Code Update**: In `GameMap.tsx`:
    *   Add a new `useRef` for the sprite.
    *   Call `processImage` in the `useEffect` to load it.
    *   Update the `render` loop to select the correct sprite based on `unit.name`.
