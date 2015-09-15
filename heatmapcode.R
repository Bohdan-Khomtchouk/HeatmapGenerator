HeatmapGenerator <- function() {
  
  setwd("~/Documents/R_dir")
  infile <- "EXAMPLE.txt"
  outfile <- "EXAMPLE_output.tiff"
  genexp <- read.table(infile, header = TRUE, sep="", stringsAsFactors=FALSE)
  names_genexp <- genexp[,1]
  genexp <- data.matrix(genexp[-1])
  row.names(genexp) <- names_genexp
  if ("gplots" %in% installed.packages()[,"Package"] == FALSE) install.packages("gplots")
  library(gplots)
  tiff(outfile , width=20, height=20, units="cm", res=600)
  heatmap.2(genexp, trace="none", dendrogram="both", Rowv=TRUE, Colv=TRUE, col = colorpanel (256, low="green", high="red"), scale="row", margins=c(5,10), cexRow=0.5, cexCol=0.7)
  dev.off(which = dev.cur())
  
}

HeatmapGenerator()
rm(HeatmapGenerator)