from PIL import Image

try:
    paths = [
        "assets/source/knight_frame1.png",
        "assets/source/knight_frame2.png"
    ]

    for p in paths:
        img = Image.open(p)
        # Flip
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
        # Overwrite
        img.save(p)
        print(f"Flipped and saved {p}")

except Exception as e:
    print(f"Error: {e}")
