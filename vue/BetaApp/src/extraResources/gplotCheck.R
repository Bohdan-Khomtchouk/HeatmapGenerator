# This script simply checks if the HeatmapGenerator dependencies are already downloaded.
# A separate script will be responsible for auto-installing the missing packages, in case the user does not want it to be done for them.

if(!require("gplots", warn.conflicts = FALSE)) {
  print("false")
} else print("true")
