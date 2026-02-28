import pyautogui
import time

time.sleep(2)
x,y = pyautogui.position()
print(f'X : {x}, Y: {y}')