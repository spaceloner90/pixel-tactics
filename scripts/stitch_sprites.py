import sys
from PIL import Image, ImageDraw
import math
import os

def stitch_sprites(output_path, frame_paths):
    print(f"Stitching {len(frame_paths)} frames to {output_path}...")
    
    frames = []
    for path in frame_paths:
        if not os.path.exists(path):
            print(f"Error: File not found: {path}")
            return
        
        img = Image.open(path).convert("RGBA")
        
        # Custom BFS Floodfill to avoid PIL implementation ambiguity
        # Strictly compares against (255, 255, 255)
        pixels = img.load()
        w, h = img.size
        visited = set()
        queue = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
        tolerance = 65
        
        target_r, target_g, target_b = 255, 255, 255

        # Initialize queue with valid corners (only if they are within tolerance of white)
        # Note: We assume corners are background.
        
        while queue:
            x, y = queue.pop(0)
            
            if (x, y) in visited:
                continue
            
            # Bounds check
            if x < 0 or x >= w or y < 0 or y >= h:
                continue

            visited.add((x, y))

            # Get Color
            r, g, b, a = pixels[x, y]

            # Check if transparent already (if we revisit or overlap)
            if a == 0:
                pass # Already processed, but neighbors might need check? 
                     # If it was already 0, it might cut off path.
                     # But we are setting to 0.
            
            # Check Tolerance vs PURE WHITE
            r_diff = abs(r - target_r)
            g_diff = abs(g - target_g)
            b_diff = abs(b - target_b)

            if r_diff < tolerance and g_diff < tolerance and b_diff < tolerance:
                # Match! Make transparent
                pixels[x, y] = (0, 0, 0, 0)

                # Add neighbors
                queue.append((x+1, y))
                queue.append((x-1, y))
                queue.append((x, y+1))
                queue.append((x, y-1))

        frames.append(img)

    # Config
    frame_size = (96, 96)
    gap = 4
    
    # Resize all frames
    frames = [f.resize(frame_size, resample=Image.NEAREST) for f in frames] # Nearest neighbor for pixel art

    # Calculate sheet size
    total_width = (frame_size[0] * len(frames)) + (gap * (len(frames) - 1))
    sheet_size = (total_width, frame_size[1])

    sheet = Image.new("RGBA", sheet_size)

    for i, frame in enumerate(frames):
        x = i * (frame_size[0] + gap)
        sheet.paste(frame, (x, 0))
    
    # Save
    sheet.save(output_path, "PNG")
    print(f"Saved to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python stitch_sprites.py <output_file> <input_frame1> <input_frame2> ...")
    else:
        stitch_sprites(sys.argv[1], sys.argv[2:])
