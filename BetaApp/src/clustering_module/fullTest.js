/* eslint-disable */
const addon = require('./build/Release/cclust')
const { performance } = require('perf_hooks')
const papa = require('papaparse')
const fs = require('fs')

let runClustering = function (matrix) {
  let maxTime = 0
  let col = matrix[0].length - 2
  let row = matrix.length - 1

  // Turn matrix into CSV string
  let csv = papa.unparse(matrix)
// Write CSV to file for C++ module
  let filePath = './samples/file.csv'
  try {
    fs.writeFileSync(filePath, csv)
  } catch (error) {
    console.log('ERROR: ' + error)
  }

// Run clustering module
  for (let distance of distanceMetrics) {
    for (let linkage of linkageMetrics) {
      for (let axis of axes) {
        let t0 = performance.now()
        let output_object = addon.ccluster(filePath, distance, linkage, axis)
        let t1 = performance.now()
        let duration = (t1 - t0) / 1000.0
        if (duration > maxTime) maxTime = duration // store largest clustering time
        let elements = row * col
        speeds.push([col, row, duration, distance, linkage, axis, elements])
      }
    }
  }

// Delete file to save memory
  try {
    fs.unlinkSync(filePath)
  } catch (error) {
    console.log('ERROR: ' + error)
  }

  return maxTime;
}

let documentSpeeds = function (speeds) {
  // Create CSV with documented speeds
  let speedCSV = papa.unparse(speeds)
// Write CSV to file
  let speedsPath = './samples/speedTest.csv'
  try {
    fs.writeFileSync(speedsPath, speedCSV)
  } catch (error) {
    console.log('ERROR: ' + error)
  }
}





// Matrix to hold all runs
var speeds = [['Width', 'Height', 'Time(s)', 'Distance', 'Linkage', 'Axes', 'Elements']]

// Testing Configuration
var distanceMetrics = ['e']
var linkageMetrics = ['a']
var axes = ['b']

// Goal: Create a i x j matrix, iterate through widths and heights until we hit 1 min max cluster time?
// Capping at 10 seconds for now

// Initial matrix of size 100x100
//for (let a = 500; a < 10000; a += 500) {
a = 8
var longestClusterTime = 0 // use this to keep track of increasing clustering time
let matrix = []
for (let z = 0; z <= a; z++) {
  matrix.push([])
  matrix[z].push(z)
}
let currNoCols = 0
let colStep = 500 // batches of 100 columns
while (longestClusterTime < 30) {
  // populate columns
  for (let r = 0; r < a; r++) {
    for (let e = currNoCols + 1; e <= currNoCols + colStep; e++) {
      if (r == 0) matrix[0].push(e)
      else matrix[r].push(Math.random())
    }
  }
  // test current config
  longestClusterTime = runClustering(matrix)
  console.log('T(s): ' + longestClusterTime + ', Dim: ' + a + 'x' + (currNoCols + colStep))
  // change size
  if (longestClusterTime > 30 && currNoCols == 0) a = 10000;
  else currNoCols = currNoCols + colStep

}
// }

documentSpeeds(speeds)

