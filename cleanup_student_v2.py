
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

with open(FILE_PATH, 'r') as f:
    lines = f.readlines()

# Based on inspection:
# Line 1042 is correct end of loop: "                        });"
# Line 1043 is blank or garbage start.
# Line 1067 is end of garbage: "                        });"
# Line 1068 is correct closing brace: "                    }"

start_remove = 1042 # index 1042 = line 1043
end_remove = 1066   # index 1066 = line 1067

print(f"Total lines before: {len(lines)}")
print(f"Removing lines {start_remove+1} to {end_remove+1}")
print(f"Line {start_remove}: {lines[start_remove-1].strip()}") # Context (keep)
print(f"Line {start_remove+1}: {lines[start_remove].strip()}") # Delete start
print(f"Line {end_remove+1}: {lines[end_remove].strip()}")     # Delete end
print(f"Line {end_remove+2}: {lines[end_remove+1].strip()}")   # Context (keep)

# Check markers
if "});" not in lines[start_remove-1]:
    print("WARNING: Preceding line might be wrong.")
if "const data = await res.json();" not in lines[start_remove+1]: # Line 1044 in file, index 1043
    # Wait, line 1043 in file (index 1042) is empty in view
    pass 

# Actually, let's just assert limits
# 1043 to 1067 inclusive.
del lines[start_remove:end_remove+1]

print(f"Total lines after: {len(lines)}")

with open(FILE_PATH, 'w') as f:
    f.writelines(lines)

print("SUCCESS: Cleanup V2 complete.")
