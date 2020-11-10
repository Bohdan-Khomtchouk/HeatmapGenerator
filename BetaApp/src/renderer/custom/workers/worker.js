var registerPromiseWorker = require('promise-worker/register')

registerPromiseWorker((message) => {
  if (message.type === 'parse') {
    console.log('parsing')
    return new Promise(function (resolve, reject) {
      let filePath = message.filePath
      var fs = require('fs')
      fs.readFile(filePath, 'utf8', (error, data) => {
        if (error) reject(error)
        else {
          var parser = require('../../../../node_modules/papaparse')
          parser.parse(data, {
            complete: function (results) {
              resolve([...results.data])
            },
            dynamicTyping: true
          })
        }
      })
    })
  } else if (message.type === 'process') {
    console.log('processing')
    return new Promise(function (resolve, reject) {
      let matrix = message.matrix
      var colLabels = matrix.shift() // first sub-array is just column labels
      var rowLabels = []
      for (let a = 0, b = matrix.length; a < b; a++) rowLabels.push(matrix[a].shift()) // first object of each sub-array is the row's label
      var offset = colLabels.length - matrix[0].length
      if (offset > 0) colLabels.shift(offset) // band-aid solution for removing corner labels
      if (matrix.length === 0 || matrix[0].length === 0) reject(new Error('Matrix has no content or formatting issues.'))
      else if (colLabels.length === 0) reject(new Error('Column labels missing.'))
      else if (rowLabels.length === 0) reject(new Error('Row labels missing'))
      else {
        resolve({
          matrix: matrix,
          rowLabels: {
            data: rowLabels,
            width: null
          },
          colLabels: {
            data: colLabels,
            height: null
          },
          rowTree: null,
          colTree: null
        })
      }
    })
  } else if (message.type === 'clusterTime') {
    return new Promise(function (resolve, reject) {
      let matrix = message.matrix
      let numOfRows = matrix.length - 1
      let numOfCols = matrix[1].length
      let numOfElements = numOfRows * numOfCols
      console.log('num of elements: ' + numOfElements)
      var fs = require('fs')
      let path = require('path')
      let url = path.resolve(__dirname, './speedTest.csv')
      fs.readFile(url, 'utf8', (error, data) => {
        if (error) reject(error)
        else {
          var parser = require('../../../../node_modules/papaparse')
          parser.parse(data, {
            complete: function (results) {
              var speeds = [...results.data]
              var x = 1
              var width = 0
              var height = 0
              var elements = width * height
              var time = 0
              while (elements < numOfElements && x < speeds.length) {
                width = speeds[x][0]
                height = speeds[x][1]
                elements = width * height
                time = speeds[x][2]
                x++
              }
              resolve(time)
            },
            dynamicTyping: true
          })
        }
      })
    })
  } else if (message.type === 'cluster') {
    console.log('clustering')
    return new Promise(function (resolve, reject) {
      var clusteringModule = require('../../clustering_module/build/Release/cclust')
      var obj = clusteringModule.ccluster(message.filePath, message.distFn, message.linkFn, message.axes)
      resolve(obj)
    })
  }
})
