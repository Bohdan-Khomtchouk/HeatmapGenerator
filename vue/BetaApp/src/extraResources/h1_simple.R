library(gplots)
library(tools)
  
  ### Output Management ###
  OS <- .Platform$OS.type
  mainDir <- "nil"
  subDir <- "HMG/"
  if (OS == "unix"){
    mainDir <- "~/" # MAC file path
  } else if (OS == "windows"){
    mainDir <- file.path(Sys.getenv("USERPROFILE")) # windows file path
    print(Sys.getenv("USERPROFILE"))
  } else {
    print("ERROR: OS could not be identified")
  }
  dir.create(file.path(mainDir, subDir), showWarnings = FALSE)
  setwd(file.path(mainDir, subDir))

  ### Inputting/Formatting Data ###

  # Potential Arguments
  outputFilename <- 'Heatmap.png'
  mainTitle <- 'Correlation' # Default Value
  
  # Import Arguments
  args = commandArgs(trailingOnly=TRUE) 
    # Arg 1 = File Path
    # Arg 2 = Output File Name [outputFilename]
    # Arg 3 = Main Heatmap Title
    # Arg 4 = Optional XLab (nil if not used)
    # Arg 5 = Optional YLab (nil if not used)
  
  # Assign Arguments
  sourceFile <- args[1]
  outputFilename <- args[2] # Need to do some string processing, data verification (on the JS end probably)
  for (argument in args) {
    print(argument)
  }
  mainTitle <- args[3]
  xLabel <- args[4]
  yLabel <- args[5]
  
  # Process Arguments
  mainTitle <- gsub("%20", " ", mainTitle)
  xLabel <- gsub("%20", " ", xLabel)
  if (xLabel == 'nil') xLabel = ""
  yLabel <- gsub("%20", " ", yLabel)
  if (yLabel == 'nil') yLabel = ""
  
  # Parse Actual Data
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
  
  finalPath <- paste(outputFilename)
  print(paste("FINAL OUTPUT PATH: ", finalPath))
  png(finalPath,
    width = 5*300,        # 5 x 300 pixels
    height = 5*300,
    res = 300,            # 300 pixels per inch
    pointsize = 8)        # smaller font size
  
  heatmap.2(mat_data,
    main = mainTitle,     # main label for heatmap
    xlab = xLabel,            # x-axis label
    ylab= yLabel,              # y-axis label
 #  Rowv = false,         # determines if dendrogram should be reordered by row mean (row clustering) -- def=true
 #  Colv = false,         # determines if dendrogram shoudl be reordered by col mean (col clustering) -- def=true
 #  distfun = dist,       # use a custom func to calc distance/dissimilarity b/w rows and cols (make some presets?) -- def=dist
 #  hclustfun = hclust,   # use a custom func to compute hierarchical clustering -- def=hclust
 #  dendrogram = "none",  # draw 'none', 'row', 'column', or 'both' -- def=both
 #  reorderfun = ...      # dendrogram func for reordering rows and columns
 #  symm = true,          # determines if x should be treated symmetrically (must be square matrix)
 #  scale = "none",       # detemrines if values should be centered in row or col direction -- def=none
 #  cellnote = mat_data,  # same data set for cell labels
    notecol="black",      # change font color of cell labels to black
    density.info="none",  # turns off density plot inside color legend
    trace="none",         # turns off trace lines inside the heat map
    margins =c(12,9),     # widens margins around plot
    col=my_palette,       # use on color palette defined earlier
  # breaks=col_breaks,    # enable color transition at specified limits
    dendrogram="none",     # only draw a row dendrogram
    )           
  print(paste("Working Directory: ", getwd()))
  dev.off()
  quit()



