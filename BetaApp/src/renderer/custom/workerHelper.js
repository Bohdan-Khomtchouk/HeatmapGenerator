// Title: workerHelper.js
// Description: Data processing functions necessary for clustering / heatmap generation
// Notes: Functions will be moved back to Heatmapper most likely.

// Setup
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker'
import PromiseWorker from 'promise-worker'
const worker = new Worker()
const promiseWorker = new PromiseWorker(worker)

// Function: Parse
// Description: Reads data from file path and returns as JS matrix
const parse = (filePath) => {
  return new Promise(function (resolve, reject) {
    var fs = require('fs')
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) reject(error)
      else {
        var parser = require('papaparse')
        parser.parse(data, {
          complete: function (results) {
            resolve([...results.data])
          },
          dynamicTyping: true
        })
      }
    })
  })
}

// Function: Process
// Description: Data verification/polishing after parsing (but before visualization/clustering)
const process = (matrix) => {
  return new Promise(function (resolve, reject) {
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
}

// Function: Cluster
// Description: Invokes clustering from worker.js.
const cluster = (filePath, options) => promiseWorker.postMessage({
  type: 'cluster', filePath: filePath, distFn: options.clustering.distType, linkFn: options.clustering.linkType, axes: options.clustering.type
})

// Function: ClusterTime (rename)
// Description: Uses experimental data to provide progress bar estimate.
const clusterTime = (matrix) => {
  return new Promise(function (resolve, reject) {
    let numOfRows = matrix.length - 1
    let numOfCols = matrix[1].length
    let numOfElements = numOfRows * numOfCols
    let path = require('path')
    let process = require('electron').remote.process
    var dataPath
    if (process.env.NODE_ENV === 'production') dataPath = path.resolve(path.dirname(__dirname), '../../extraResources', 'speedTest.csv')
    else dataPath = path.resolve('src/extraResources', 'speedTest.csv')
    console.log('dataPath: ' + dataPath)
    var fs = require('fs')
    fs.readFile(dataPath, 'utf8', (error, data) => {
      if (error) reject(error)
      else {
        var parser = require('papaparse')
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
}

export default { parse, process, cluster, clusterTime }
