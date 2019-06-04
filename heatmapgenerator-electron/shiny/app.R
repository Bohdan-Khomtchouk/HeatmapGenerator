library(shiny)
library(data.table)
library(gplots)
library(heatmaply)
library(tools)
# library(BiocManager)
library(devtools)
library(ComplexHeatmap)
install_github("jokergoo/ComplexHeatmap")

shinyApp(
  shinyUI(
    pageWithSidebar(
      headerPanel(h1("")),
      sidebarPanel(
        fluidRow(
          column(width = 5,
            img(src = 'heatmapgenerator_icon.png', width = "100%", height = "100%")
          ),
          column(width = 2, h4(HTML('<br>'), 'HEATMAP', HTML('<br>'), 'GENERATOR'))
        ),
        helpText(HTML('<br>'), 'Sample file downloads:'),
        downloadButton("downloadSmallData", label = "Small sample file", style = 'padding-right: 49px'),
        downloadButton("downloadMidData", label = "Mid-sized sample file", style = 'padding-right: 22px'),
        downloadButton("downloadHugeData", label = "Huge sample file", style = 'padding-right: 50px'),
        helpText(HTML('<br>')),
        fileInput("filename", "Choose File to Upload:", accept = c('.csv')),
        selectInput("lowColor", "Low Value:", c("green", "blue", "purple", "red", "orange", "yellow", "white", "black")),
        selectInput("midColor", "Mid Value:", c("none", "black", "green", "blue", "purple", "red", "orange", "yellow", "white")),
        selectInput("highColor", "High Value:", c("red", "orange", "yellow", "green", "blue", "purple", "orange", "white", "black")),
        selectInput("dendrogram", "Apply Clustering:", c("none", "row", "column", "both")),
        selectInput("distanceMethod", "Distance Metric:", c("euclidean", "maximum", "manhattan", "canberra", "binary", "minkowski")),
        selectInput("agglomerationMethod", "Linkage Algorithm:", c("complete", "single", "average", "centroid", "median", "mcquitty", "ward.D", "ward.D2")),
        selectInput("scale", "Apply Scaling:", c("row", "column", "none")),
        selectInput("key", "Color Key:", c("TRUE", "FALSE")),
        selectInput("trace", "Make Trace:", c("none", "column", "row", "both")),
        sliderInput("xfontsize", "Choose Y Font Size:", min = 0.3, max = 2, value = 0.5),
        sliderInput("yfontsize", "Choose X Font Size:", min = 0.3, max = 2, value = 0.72),
        downloadButton("downloadHeatmap", "Download heatmap", style = 'padding-right: 51px'),
        downloadButton("downloadClusteredInput", "Download clustered input"),
        helpText(HTML('<br>')),
        helpText(a("View source code on Github!", href = "https://github.com/Bohdan-Khomtchouk/shinyheatmap", target = "_blank"))
      ),

      mainPanel(
        tags$head(includeScript("google-analytics.js")),
        tags$style(
          type="text/css",
          ".shiny-output-error { visibility: hidden; }",
          ".shiny-output-error:before { visibility: hidden; }"
        ),
        tabsetPanel(
          tabPanel("Static Heatmap", uiOutput(outputId = "image"), uiOutput("sorry"), plotOutput("static", height = "600px")),
          tabPanel("Interactive Heatmap", uiOutput(outputId = "image2"), uiOutput("sorry2"), plotlyOutput("interactive", height = "700px"))
        )
      )
    )
  ),


  shinyServer(function(input, output) {
      
    # install_github("jokergoo/ComplexHeatmap")
    # BiocManager::install("ComplexHeatmap", type="source")

    # sample file download (small dataset)
    output$downloadSmallData <- downloadHandler(
      filename <- function() {
        paste('small', 'Genes', 'File', '.csv', sep='')
      },
      content <- function(file) {
        file.copy("smallGenesFile.csv", file)
      },
      contentType = "text/csv"
    )

    # sample file download (mid-sized dataset)
    output$downloadMidData <- downloadHandler(
      filename <- function() {
        paste('mid', 'Genes', 'File', '.csv', sep='')
      },
      content <- function(file) {
        file.copy("midGenesFile.csv", file)
      },
      contentType = "text/csv"
    )

    # sample file download (huge dataset)
    output$downloadHugeData <- downloadHandler(
      filename <- function() {
        paste('huge', 'Genes', 'File', '.csv', sep='')
      },
      content <- function(file) {
        file.copy("hugeGenesFile.csv", file)
      },
      contentType = "text/csv"
    )

    # file upload
    datasetInput <- reactive({
      validate(
        need(input$filename != 0, "To begin drawing a heatmap, please select a file for input")
      )
      inFile <- input$filename
      if (is.null(inFile)) return(NULL)
      fread(inFile$datapath)
    })

    # static heatmap prep
    staticHeatmap <- function() {
      genexp <- datasetInput()
      genexp_df <- as.data.frame(genexp)
      names_genexp_df <- genexp_df[,1]
      n <- NROW(names_genexp_df)
      genexp_df_mat <<- data.matrix(genexp_df[-1])  ## make global for clusteredInput() function
      k <- NCOL(genexp_df_mat)
      row.names(genexp_df_mat) <<- names_genexp_df  ## make global for clusteredInput() function
      if (input$scale == "column") {
        genexp_df_mat = scale(genexp_df_mat)
      }
      if (input$scale == "row") {
        genexp_df_mat = t(scale(t(genexp_df_mat)))
      }
      if (n > 2000) {
        output$image <- renderUI({
          tags$img(src = "https://cloud.githubusercontent.com/assets/9893806/19628924/44e7168c-9937-11e6-9808-89452fbdd62d.png")
        })
        url <- a("fastheatmap", href = "http://fastheatmap.com/", target = "_blank")
        output$sorry <- renderUI({tagList("You are using an input dataset with", n, "rows and", k, "columns.  Please use our high-performance computing server", "for visualizing such large datasets:", url)})
      }
      else {
        Heatmap(matrix = genexp_df_mat,
                col = colorpanel(256, low = input$lowColor, high = input$highColor),
                clustering_distance_rows = function(x) dist(x, method = input$distanceMethod),
                row_title_gp = gpar(fontsize = 14),
                column_title_gp = gpar(fontsize = 14),
                cluster_rows = if (input$dendrogram == "row" | input$dendrogram == "both") TRUE else FALSE,
                cluster_columns = if (input$dendrogram == "column" | input$dendrogram == "both") TRUE else FALSE,
                show_heatmap_legend = input$key,
                heatmap_legend_param = list(title = "Density")
        )
      }
    }

    # static heatmap output
    output$static <- renderPlot({
      if(!is.null(datasetInput()))
      withProgress(message = 'Making static heatmap:', value = 0, {
        genexp <- datasetInput()
        genexp_df <- as.data.frame(genexp)
        names_genexp_df <- genexp_df[,1]
        n <- NROW(names_genexp_df)
        for (i in 1:n) {
          incProgress(1/n, detail = "Please wait...")
        }
        staticHeatmap()
      })
    })

    # re-sort input file after hierarchical clustering (prep stage)
    clusteredInput <- function() {
      heatmap_object <- staticHeatmap()
      genexp_df_mat[rev(heatmap_object$rowInd), heatmap_object$colInd]
    }


    # re-sort input file after hierarchical clustering (download stage)
    output$downloadClusteredInput <- downloadHandler(
      filename = function() {
        paste(basename(file_path_sans_ext(input$filename)), '_clustered', '.csv', sep='')
      },
      content = function(file) {
        write.csv(clusteredInput(), file)
      }
    )

    # interactive heatmap prep
    interactiveHeatmap <- reactive({
      genexp <- datasetInput()
      genexp_df <- as.data.frame(genexp)
      names_genexp_df <- genexp_df[,1]
      n <- NROW(names_genexp_df)
      genexp_df_mat <- data.matrix(genexp_df[-1])
      k <- NCOL(genexp_df_mat)
      row.names(genexp_df_mat) <- names_genexp_df
      if (n > 2000) {
        output$image2 <- renderUI({
          tags$img(src = "https://cloud.githubusercontent.com/assets/9893806/19628924/44e7168c-9937-11e6-9808-89452fbdd62d.png")
        })
        url <- a("fastheatmap", href = "http://fastheatmap.com/", target = "_blank")
        output$sorry2 <- renderUI({tagList("You are using an input dataset with", n, "rows and", k, "columns.  Please use our high-performance computing server", "for visualizing such large datasets:", url)})
      } else {
        heatmaply(genexp_df_mat, k_row = 30, k_col = 4, srtCol = 45) %>% layout(margin = list(l = 100, b = 200))
      }
    })

    # interactive heatmap output
    output$interactive <- renderPlotly({
      if(!is.null(datasetInput()))
      withProgress(message = 'Making interactive heatmap:', value = 0, {
        genexp <- datasetInput()
        genexp_df <- as.data.frame(genexp)
        names_genexp_df <- genexp_df[,1]
        n <- NROW(names_genexp_df)
        for (i in 1:n) {
          incProgress(1/n, detail = "Please wait...")
        }
        interactiveHeatmap()
      })
    })

    # static heatmap download
    output$downloadHeatmap <- downloadHandler(
      filename <- function() {
        paste0(basename(file_path_sans_ext(input$filename)), '_heatmap', '.png', sep='')
      },
      content <- function(file) {
        png(file)
        tiff(
          file,
          width = 4000,
          height = 2000,
          units = "px",
          pointsize = 12,
          res = 300
        )
        staticHeatmap()
        dev.off()
      }
    )
  })
)
