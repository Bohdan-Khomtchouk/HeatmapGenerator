// Heatmapper.js
// Module for handling heatmap formation and R interfacing

export default class Heatmapper {
  constructor (manager, filename, mainTitle, xAxis, yAxis, colorScheme) {
    this.systemManager = manager
    this.filename = filename
    this.mainTitle = mainTitle
    this.xAxis = xAxis
    this.yAxis = yAxis
    this.colorScheme = colorScheme
  }

  generateHeatmap (callback) {
    var exec = require('child_process').exec
    var self = this
    const path = require('path')
    var locationOfHeatmapScript = ''
    if (process.env.NODE_ENV === 'development') {
      locationOfHeatmapScript = path.resolve(__dirname, '../extraResources', 'h1_simple.R')
    } else {
      locationOfHeatmapScript = path.resolve(process.resourcesPath, 'extraResources', 'h1_simple.R')
    }
    var processedMainTitle = this.mainTitle.replace(/  */g, '%20') // Replace spaces with %20, will take them out on the R end
    if (processedMainTitle === '') processedMainTitle = 'nil'
    var processedXLab = this.xAxis.replace(/  */g, '%20')
    if (processedXLab === '') processedXLab = 'nil'
    var processedYLab = this.yAxis.replace(/  */g, '%20')
    if (processedYLab === '') processedYLab = 'nil'
    let parameters = [this.systemManager.getRScriptPath() + ' ', locationOfHeatmapScript + ' ', this.filename + ' ', this.outputFileName + ' ', processedMainTitle + ' ', processedXLab + ' ', processedYLab + ' ']
    var commandString = parameters.join('')
    exec(commandString,
      function (error, stdout, stderr) {
        if (error == null) {
          self.outputFilePath = self.systemManager.getOutputFilePath(self.outputFileName)
          console.log(stdout)
          callback(null)
        } else {
          callback(error)
        }
      })
  }

  presentHeatmap (callback) {
    const electron = require('electron')
    electron.shell.openItem(this.outputFilePath)
  }

  processData (callback) {
    // Read the CSV
    let self = this
    var fs = require('fs')
    fs.readFile(this.filename, 'utf8', function (err, data) {
      if (err) {
        callback(err)
      } else {
        var Papa = require('papaparse')
        Papa.parse(data, {
          complete: function (results) {
            var parsedData = results.data
            // Extract column/row labels
            var columnLabels = parsedData[0].slice(1)
            parsedData = parsedData.slice(1)
            var rowLabels = parsedData.map(function (x) {
              return x[0]
            })
            // Get just the values (no labels) after -- this method is probably slow...
            var finalData = parsedData.map(function (x) {
              x.shift()
              return x
            })
            // Plotly Data Object
            var data = [{
              z: finalData,
              x: columnLabels,
              y: rowLabels,
              type: 'heatmap',
              colorscale: self.colorScheme
            }]
            // Plotly Layout Object
            var layout = {
              title: self.mainTitle,
              xaxis: {
                title: {
                  text: self.xAxis
                }
              },
              yaxis: {
                title: {
                  text: self.yAxis
                }
              }
            }
            callback(null, data, layout)
          },
          dynamicTyping: true
        })
      }
    })
  }
}
