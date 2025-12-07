import sys
from PIL import Image
import math
import os

def distance(c1, c2):
    return math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2 + (c1[2] - c2[2])**2)

def stitch_sprites(output_path, frame_paths):
    print(f"Stitching {len(frame_paths)} frames to {output_path}...")
    
    frames = []
    for path in frame_paths:
        if not os.path.exists(path):
            print(f"Error: File not found: {path}")
            return
        frames.append(Image.open(path).convert("RGBA"))

    # Config
    frame_size = (96, 96)
    gap = 4
    
    # Resize all frames
    frames = [f.resize(frame_size) for f in frames]

    # Calculate sheet size
    total_width = (frame_size[0] * len(frames)) + (gap * (len(frames) - 1))
    sheet_size = (total_width, frame_size[1])

    sheet = Image.new("RGBA", sheet_size)

    for i, frame in enumerate(frames):
        x = i * (frame_size[0] + gap)
        sheet.paste(frame, (x, 0))

    # Clean Background
    datas = sheet.getdata()
    newData = []
    
    bgColor = (255, 255, 255) 
    tolerance = 60 

    for item in datas:
        # Check if already transparent
        if item[3] == 0:
             newData.append(item)
             continue
             
        dist = distance(item[:3], bgColor)
        
        if dist < tolerance:
            newData.append((0, 0, 0, 0)) # Transparent
        else:
            newData.append(item)

    sheet.putdata(newData)
    
    # Save
    sheet.save(output_path, "PNG")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python stitch_sprites.py <output_file> <input_frame1> <input_frame2> ...")
    else:
        stitch_sprites(sys.argv[1], sys.argv[2:])
