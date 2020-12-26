/* eslint-disable */
const addon = require('./build/Release/cclust')
const { performance } = require('perf_hooks')
const papa = require('papaparse')
const fs = require('fs')

let runClustering = function (matrix) {
  let maxTime = 0
  let col = matrix[0].length - 1
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
        let ratio = col / row
        speeds.push([col, row, duration, distance, linkage, axis, elements, ratio])
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
var speeds = [['Width', 'Height', 'Time(s)', 'Distance', 'Linkage', 'Axes', 'Elements', 'Ratio']]

// Testing Configuration
var distanceMetrics = ['e']
var linkageMetrics = ['a']
var axes = ['b']

// Generate Random, Square Datasets
var matrix = []
var initialN = 1000
var prod = initialN * initialN
var step = 100
var floorVal = 100
var oldY = initialN
for (var i = initialN; i > floorVal; i -= step) {
  var yCap = Math.round(prod / i)
  if (i == initialN) {
    // Establish the matrix
    for (let x = 0; x <= i; x++) {
      // Iterate from first new row through target # of rows
      matrix.push([x])
      for (let y = 1; y <= yCap; y++) {
        if (x == 0) matrix[x].push(y)
        else matrix[x].push(Math.floor(Math.random()*100)/100)
      }
    }
  } else {
    matrix.splice(i+step)
    for (let x = 0; x <= i; x++) {
      for (let y = oldY; y < yCap; y++) {
        if (x == 0) matrix[x].push(y)
        else matrix[x].push(Math.floor(Math.random()*100)/100)
      }
    }
  }
  oldY = yCap

  runClustering(matrix)
}

documentSpeeds(speeds)

