// Heatmapper.js
// Module for handling heatmap formation and R interfacing

export default class Heatmapper {
  constructor (manager, filename, outputFileName, mainTitle, xAxis, yAxis) {
    this.systemManager = manager
    this.filename = filename
    this.outputFileName = outputFileName + '.png'
    this.mainTitle = mainTitle
    console.log(mainTitle)
    this.xAxis = xAxis
    this.yAxis = yAxis
    this.outputFilePath = ''
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
}
