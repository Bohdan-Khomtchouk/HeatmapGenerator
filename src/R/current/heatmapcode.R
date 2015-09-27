# Copyright (C) 2014-2015 Bohdan Khomtchouk and Vytas Dargis-Robinson

# This file is part of HeatmapGenerator.

# This R code is embedded and used within HeatmapGenerator4 for Mac OS X and Windows OS.

# BK wishes to acknowledge full financial support by the United States Department of Defense (DoD) through the National Defense Science and Engineering Graduate Fellowship (NDSEG) Program: this research was conducted with Government support under and awarded by DoD, Army Research Office (ARO), National Defense Science and Engineering Graduate (NDSEG) Fellowship, 32 CFR 168a.

# Please cite: "Khomtchouk et al.: HeatmapGenerator: high performance RNAseq and microarray visualization software suite to examine differential gene expression levels using an R and C++ hybrid computational pipeline. Source Code for Biology and Medicine 2014 9:30" within any source that makes use of any methods inspired by HeatmapGenerator.

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# ------------------------------------------------------------------------------------


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
  heatmap.2(genexp, trace="none", dendrogram="both", Rowv=TRUE, Colv=TRUE, col = colorpanel (256, low="green", high="red"), margins=c(15,15))
  dev.off(which = dev.cur())
  
}

HeatmapGenerator()
rm(HeatmapGenerator)