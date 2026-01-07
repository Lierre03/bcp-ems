
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

with open(FILE_PATH, 'r') as f:
    lines = f.readlines()

# We want to keep lines up to 1087 (index 1087 is line 1088)
# Line indices are 0-based.
# Line 1087 in file is index 1086.
# We want to remove lines 1088 to 1142 (inclusive).
# And keep line 1143 (which should be '                    }')
# 1-based: remove 1088..1142.
# 0-based: remove 1087..1141.

start_remove = 1087
end_remove = 1141

print(f"Removing lines {start_remove+1} to {end_remove+1}")
print(f"Line {start_remove+1}: {lines[start_remove].strip()}")
print(f"Line {end_remove+1}: {lines[end_remove].strip()}")
print(f"Line after (kept): {lines[end_remove+1].strip()}")

del lines[start_remove:end_remove+1]

with open(FILE_PATH, 'w') as f:
    f.writelines(lines)

print("SUCCESS: Cleanup complete.")
