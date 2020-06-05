if (!require("gplots")) {
  install.packages("gplots", dependencies = TRUE)
  library(gplots)
}
if (!require("RColorBrewer")) {
  install.packages("RColorBrewer", dependencies = TRUE)
  library(RColorBrewer)
}
data <- read.csv('file_input', comment.char="#")

rnames <- data[,1]
mat_data <- data.matrix(data[,2:ncol(data)])
rownames(mat_data) <- rnames
