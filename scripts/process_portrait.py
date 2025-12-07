
import sys
from PIL import Image

def process_portrait(input_path, output_path):
    print(f"Processing {input_path} -> {output_path}")
    
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    visited = set()
    
    # Threshold for "white"
    def is_white(r, g, b, a):
        return r > 240 and g > 240 and b > 240
    
    # Iterate over all pixels
    for y in range(height):
        for x in range(width):
            if (x, y) in visited:
                continue
                
            r, g, b, a = pixels[x, y]
            
            if is_white(r, g, b, a):
                # Found a new white blob
                stack = [(x, y)]
                blob_pixels = []
                visiting_stack = set([(x, y)]) # Avoid re-adding same pixel to stack
                
                is_touching_edge = False
                
                # BFS/DFS
                while stack:
                    cx, cy = stack.pop()
                    visited.add((cx, cy))
                    blob_pixels.append((cx, cy))
                    
                    if cx == 0 or cx == width - 1 or cy == 0 or cy == height - 1:
                        is_touching_edge = True
                    
                    # Neighbors
                    for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if (nx, ny) not in visited and (nx, ny) not in visiting_stack:
                                nr, ng, nb, na = pixels[nx, ny]
                                if is_white(nr, ng, nb, na):
                                    stack.append((nx, ny))
                                    visiting_stack.add((nx, ny))
                
                # Analyze Blob
                blob_size = len(blob_pixels)
                
                # Heuristic: Remove if touching edge OR very large (> 5% of pixels)
                # USER OVERRIDE: Remove specific artifact of size 162 at (471, 533)
                large_threshold = (width * height) * 0.05
                
                if is_touching_edge or blob_size > large_threshold or blob_size == 162:
                    print(f"Removing blob at ({x}, {y}): Size {blob_size}, Touching Edge: {is_touching_edge}")
                    for px, py in blob_pixels:
                        pixels[px, py] = (0, 0, 0, 0) # Transparent
                else:
                    print(f"Keeping blob at ({x}, {y}): Size {blob_size} (Eyes/Highlights)")
    
    img.save(output_path)
    print("Done.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_portrait.py <input> <output>")
    else:
        process_portrait(sys.argv[1], sys.argv[2])
