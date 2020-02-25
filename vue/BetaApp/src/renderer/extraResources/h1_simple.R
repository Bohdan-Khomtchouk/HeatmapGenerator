library(gplots)
library(RColorBrewer)
library(tools)
  
  ### Inputting/Formatting Data ###

  # Potential Arguments
  outputFilename <- ''
  
  # Handling Arguments
  args = commandArgs(trailingOnly=TRUE) # Arg 1 = File Path
  sourceFile <- args[1]
  if (length(args) > 1) {
    ## Arg 2 = Output File Name
    outputFilename <- trimws(args[2]) # Need to do some string processing, data verification (on the JS end probably)
  }
  
  data <- NULL # Instantiate data var -- data will always be a .txt or .csv -- should I use else still? Just to be safe?
  if (file_ext(sourceFile) == "csv") data <- read.csv(sourceFile, comment.char="#")
  if (file_ext(sourceFile) == "txt") data <- read.delim(sourceFile, comment.char = "#")
  rnames <- data[,1]                            # assign labels in column 1 to "rnames"
  mat_data <- data.matrix(data[,2:ncol(data)])  # transform column 2-5 into a matrix
  rownames(mat_data) <- rnames                  # assign row names
  
  ### Color/Customization ###
  
  # creates a own color palette from red to green
  my_palette <- colorRampPalette(c("red", "brown", "green"))(n = 299)
  
  # (optional) defines the color breaks manuallsly for a "skewed" color transition
  # col_breaks = c(seq(-1,0,length=100),   # for red
  #  seq(0.01,0.7,length=100),            # for yellow
  #  seq(0.71,1,length=100))              # for green
  
  # creates a 5 x 5 inch image
  
  png(outputFilename,
    width = 5*300,        # 5 x 300 pixels
    height = 5*300,
    res = 300,            # 300 pixels per inch
    pointsize = 8)        # smaller font size
  
  heatmap.2(mat_data,
 #   cellnote = mat_data,  # same data set for cell labels
    main = "Correlation", # heat map title
    notecol="black",      # change font color of cell labels to black
    density.info="none",  # turns off density plot inside color legend
    trace="none",         # turns off trace lines inside the heat map
    margins =c(12,9),     # widens margins around plot
    col=my_palette,       # use on color palette defined earlier
  # breaks=col_breaks,    # enable color transition at specified limits
    dendrogram="none",     # only draw a row dendrogram
    Colv="NA")            # turn off column clustering
  
  dev.off()
  quit()



