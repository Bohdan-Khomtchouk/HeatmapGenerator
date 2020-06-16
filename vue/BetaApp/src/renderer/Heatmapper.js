// Heatmapper.js
// Module for handling heatmap formation and R interfacing

export default class Heatmapper {
  constructor (manager, filename, mainTitle, xAxis, yAxis, colorScheme) {
    this.systemManager = manager
    this.filename = filename
    this.mainTitle = mainTitle
    console.log(mainTitle)
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
    var data = [
      {
        z: [[1, null, 30, 50, 1], [20, 1, 60, 80, 30], [30, 60, 1, -10, 20]],
        x: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        y: ['Morning', 'Afternoon', 'Evening'],
        type: 'heatmap',
        colorscale: this.colorScheme
      }
    ]
    var layout = {
      title: {
        text: this.mainTitle
        /*
        font: {
          family: 'Courier New, monospace',
          size: 24
        },
        xref: 'paper',
        x: 0.05 */
      },
      xaxis: {
        title: {
          text: this.xAxis
          /*
          font: {
            family: 'Courier New, monospace',
            size: 18,
            color: '#7f7f7f'
          } */
        }
      },
      yaxis: {
        title: {
          text: this.yAxis
          /*
          font: {
            family: 'Courier New, monospace',
            size: 18,
            color: '#7f7f7f'
          } */
        }
      }
    }
    callback(null, data, layout)
  }
}
