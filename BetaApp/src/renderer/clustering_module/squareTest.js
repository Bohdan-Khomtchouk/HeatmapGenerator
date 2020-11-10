/* eslint-disable */
const addon = require('./build/Release/cclust')
const { performance } = require('perf_hooks')
const papa = require('papaparse')
const fs = require('fs')

// Matrix to hold all runs
var speeds = [['Width', 'Height', 'Time(s)', 'Distance', 'Linkage', 'Axes', 'Elements']]

// Testing Configuration
var distanceMetrics = ['e']
var linkageMetrics = ['a']
var axes = ['b']

// Generate Random, Square Datasets
const maxN = 5000
const squareStep = 500
var matrix = []
for (let i = 0; i < maxN; i += squareStep) {
  // Iterations of progressively larger spreadsheets; i = previousDim
  // console.log('i: ' + i)
  let targetDim = i + squareStep
  // console.log('targetDim: ' + targetDim)
  if (i != 0) {
    for (let x = 0; x <= i; x++) {
      // Iterate through existing rows
      // console.log('existing rows loop')
      for (let y = i + 1; y <= targetDim; y++) {
        // Iterate from first new column to target # of columns
        // Skips populated columns
        // console.log('existing; x:' + x + ', y:' + y)
        if ( x == 0 ) { // Column Label row
          // console.log('this is a column label.')
          matrix[x].push(y)
        }
        else {
          let val = Math.random()
          // console.log('this is a cell. setting value to: ' + val)
          matrix[x].push(val)
        }
      }
    }
    for (let x = i + 1; x <= targetDim; x++) {
      // Iterate from first new row through target # of rows
      // console.log('new rows loop')
      matrix.push([])
      for (let y = 0; y <= targetDim; y++) {
        // Iterate from 0 through target # of columns
        // console.log('new; x:' + x + ', y:' + y)
        if (x == 0 && y == 0) matrix[x].push('Test_Data') // Corner
        else if (x == 0) { // Column labels
          // console.log('this is a column label.')
          matrix[x].push(y)
        }
        else if (y == 0) {  // Row Labels
          // console.log('this is a row label.')
          matrix[x].push(x)
        }
        else {
          let val = Math.random()
          // console.log('this is a cell. setting value to: ' + val)
          matrix[x].push(val)
        }
      }
    }
  }
if ( i == 0 ) {
  // First time
  for (let x = 0; x <= targetDim; x++) {
    // Iterate from first new row through target # of rows
    // console.log('new rows loop')
    matrix.push([])
    for (let y = 0; y <= targetDim; y++) {
      // Iterate from 0 through target # of columns
      // console.log('new; x:' + x + ', y:' + y)
      if (x == 0 && y == 0) matrix[x].push('Test_Data') // Corner
      else if (x == 0) { // Column labels
        // console.log('this is a column label.')
        matrix[x].push(y)
      }
      else if (y == 0) {  // Row Labels
        // console.log('this is a row label.')
        matrix[x].push(x)
      }
      else {
        let val = Math.random()
        // console.log('this is a cell. setting value to: ' + val)
        matrix[x].push(val)
      }
    }
  }
}
  // Turn matrix into CSV string
  let csv = papa.unparse(matrix)
  // Write CSV to file for C++ module
  let filePath = './samples/square' + targetDim + '.csv'
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
        let elements = targetDim * targetDim
        console.log('#: ' + targetDim + 'x' + targetDim + ' (' + duration + 's).')
        speeds.push([targetDim, targetDim, duration, distance, linkage, axis, elements])
      }
    }
  }

  // Delete file to save memory

  try {
    fs.unlinkSync(filePath)
  } catch (error) {
    console.log('ERROR: ' + error)
  }
}

// Create CSV with documented speeds
let speedCSV = papa.unparse(speeds)
// Write CSV to file
let speedsPath = './samples/speedTest.csv'
try {
  fs.writeFileSync(speedsPath, speedCSV)
} catch (error) {
  console.log('ERROR: ' + error)
}
