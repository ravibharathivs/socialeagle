import pyautogui
import time


"""
#mouse operation
#pyautogui.click(100,100)
#pyautogui.rightClick(100,100)
time.sleep(2)

# to get the position 
#x,y = pyautogui.position()

#print(f'X:{x}, Y: {y}')

#pyautogui.rightClick(3624,382)

# pyautogui.doubleClick(3624,382)

#pyautogui.drag(100,100,200,200)

# pyautogui.scrollDown(500)

#Keyboard operations

pyautogui.click(809,590)
#pyautogui.write("Line writen by pyautogui") #writing the given string where the cursor is available
#print("Line writen by pyautogui")
#pyautogui.write('Ravibharathi VS')

# pyautogui.press('enter') # it press the key which key want to pres once above lines completed

pyautogui.hotkey('ctrl','a') #it does ctrl+a operation as selecting all the lines or files in it
"""

#Image
location = pyautogui.locateOnScreen('gemini.png',confidence=0.9)

print(location)
time.sleep(2)

print(pyautogui.size()) # calculate and print the screen size

ss = pyautogui.screenshot() # it took the screenshot of the current screen.
ss.save('screen.png') # it store the screenshot in this current dir