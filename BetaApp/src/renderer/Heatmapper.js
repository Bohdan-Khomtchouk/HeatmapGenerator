// Heatmapper.js
// Module for handling heatmap formation and R interfacing

export default class Heatmapper {
  constructor (filename, mainTitle, xAxis, yAxis, colorScheme, appParent) {
    this.filename = filename
    this.mainTitle = mainTitle
    this.xAxis = xAxis
    this.yAxis = yAxis
    this.colorScheme = colorScheme
    this.parent = appParent
  }

  processData (progress, callback) {
    let self = this
    var fs = require('fs')
    fs.readFile(this.filename, 'utf8', function (err, data) {
      if (err) {
        callback(err)
      } else {
        // 10%
        progress(10)
        var Papa = require('papaparse')
        Papa.parse(data, {
          complete: function (results) {
          // 25%
            progress(25)
            var parsedData = results.data
            // Extract column/row labels
            var columnLabels = parsedData[0].slice(1)
            parsedData = parsedData.slice(1)
            var rowLabels = parsedData.map(function (x) {
              return x.shift()
            })
            // 35%
            progress(35)
            // Plotly Data Object
            var data = [{
              z: parsedData,
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
            // 40%
            progress(40)
            callback(null, data, layout)
          },
          dynamicTyping: true
        })
      }
    })
  }
}
