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
*   **Portraits**: `{unit_name}_casting.png` (for large overlays)

Example:
*   `assets/source/alaric_idle_1.png`
*   `assets/source/wizard_idle_1.png` (Single frame idle)
*   `assets/source/wizard_casting.png` (Large portrait)

## 3. Processing Scripts
We use generic Python scripts to handle transparency and stitching.

### A. `scripts/stitch_sprites.py` (Standard Units)
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

### B. `scripts/process_portrait.py` (Large Portraits / Advanced Transparency)
This script allows for "Smart Chroma Keying" using **Blob Detection**. Use this for large, detailed images (like the Wizard Casting Portrait) where simple background removal might accidentally erase eyes or internal white details.

**Usage:**
```bash
python scripts/process_portrait.py [INPUT_PATH] [OUTPUT_PATH]
```

**Example:**
```bash
python scripts/process_portrait.py assets/source/wizard_casting.png public/wizard_casting.png
```

**What it does:**
1.  **Blob Detection**: Scans the image for connected components ("blobs") of white pixels.
2.  **Smart Removal**: Removes a blob ONLY if:
    *   It touches the edge of the image (Background).
    *   It is significantly large (>5% of total pixels).
    *   **Manual Override**: Specific blob sizes can be hardcoded in the script to be removed if the heuristic fails.
3.  **Preservation**: Keeps small, isolated white blobs (like eyes, teeth, or magical highlights).

## 4. Integration
### `GameMap.tsx` Rendering Logic
The rendering engine handles variable frame counts and static sprites:

1.  **Loading**: 
    *   **Standard Units**: Use `processImage` (though ideally pre-process them).
    *   **Portraits**: Load directly using `new Image()`, as `process_portrait.py` has already handled transparency.
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
    *   Call `processImage` (or standard load) in the `useEffect`.
    *   Update the `render` loop to select the correct sprite based on `unit.name`.
