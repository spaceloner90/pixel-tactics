from PIL import Image
import os

def remove_white_background(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is white-ish (tolerance for compression artifacts)
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0)) # Fully transparent
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(image_path, "PNG")
        print(f"Saved {image_path}")
    except Exception as e:
        print(f"Failed to process {image_path}: {e}")

target_dir = os.path.join("public", "assets", "portraits")
if not os.path.exists(target_dir):
    print(f"Directory not found: {target_dir}")
    exit(1)

for filename in os.listdir(target_dir):
    if filename.endswith(".png"):
        remove_white_background(os.path.join(target_dir, filename))
