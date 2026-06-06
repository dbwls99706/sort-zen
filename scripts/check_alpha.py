from PIL import Image
import sys

def check_transparency(path):
    try:
        img = Image.open(path)
        print(f"Mode: {img.mode}")
        if img.mode == 'RGBA':
            # Check if any pixel has alpha < 255
            has_alpha = any(p[3] < 255 for p in img.getdata())
            print(f"Has transparent pixels: {has_alpha}")
        else:
            print("No alpha channel (RGB/other)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_transparency(sys.argv[1])
