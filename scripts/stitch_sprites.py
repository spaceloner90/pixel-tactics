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
        
        # Flood Fill Transparency
        # Flood from corners removing white background
        w, h = img.size
        corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
        
        try:
             for corner in corners:
                ImageDraw.floodfill(img, corner, (0, 0, 0, 0), thresh=50)
        except Exception as e:
            print(f"Floodfill error: {e}")

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
