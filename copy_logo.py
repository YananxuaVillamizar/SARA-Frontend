import os
import shutil

user_profile = os.environ.get("USERPROFILE", "")
src = os.path.join(user_profile, ".gemini", "antigravity", "brain", "143cd643-64f4-4c81-8f94-9eb51e064e0c", "media__1781137989881.png")
dst = os.path.join("public", "logo_sara.png")

if os.path.exists(src):
    shutil.copy(src, dst)
    print("Logo copiado exitosamente")
else:
    print(f"Error: El logo de origen no existe en {src}")
