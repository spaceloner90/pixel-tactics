from PIL import Image
import math

def distance(c1, c2):
    return math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2 + (c1[2] - c2[2])**2)

try:
    # Load Image
    path = "public/knight.png"
    img = Image.open(path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    
    # Sample Top-Left pixel as background key
    bgColor = datas[0][:3] 
    tolerance = 80 # Aggressive tolerance for "polluted" magenta

    print(f"Sampling Background: {bgColor}")

    for item in datas:
        # Check Euclidean distance
        dist = distance(item[:3], bgColor)
        
        if dist < tolerance:
            newData.append((0, 0, 0, 0)) # Transparent
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(path, "PNG")
    print(f"Successfully cleaned {path} with tolerance {tolerance}")

except Exception as e:
    print(f"Error: {e}")
