import os
import sys

def main():
    try:
        from PIL import Image
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        from PIL import Image
    
    import shutil

    src = r"C:\Users\Devraj\.gemini\antigravity-ide\brain\d6657f6d-d1fd-4437-8da1-123be17cdf33\neurofeed_logo_1779994427299.png"
    dst_dir = r"c:\Users\Devraj\Desktop\neurofeed\frontend\public"

    img = Image.open(src)
    img = img.convert("RGBA")

    # Copy the original as logo.png
    shutil.copy(src, dst_dir + r"\logo.png")

    # Generate sizes
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }

    for name, size in sizes.items():
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(dst_dir, name))

    # Save ico
    img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(dst_dir, "favicon.ico"))

    print("Images generated successfully.")

if __name__ == "__main__":
    main()
