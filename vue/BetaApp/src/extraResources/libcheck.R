# This script simply checks if the HeatmapGenerator dependencies are already downloaded.
# A separate script will be responsible for auto-installing the missing packages, in case the user does not want it to be done for them.

missingPackages <- c(TRUE,TRUE)

if(!require("gplots")) missingPackages[1] <- FALSE
if(!require("dplyr")) missingPackages[2] <- FALSE



print(missingPackages)