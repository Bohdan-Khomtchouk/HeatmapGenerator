// editor.js
// Controller for dataEditor view
export default class Editor {
  getMatrixData (path, callback) {
    console.log('[Editor] getMatrixData()')
    let fs = require('fs')
    fs.readFile(path, 'utf8', (error, contents) => {
      if (error) throw error
      else {
        var parser = require('papaparse')
        parser.parse(contents, {
          complete: function (matrix) {
            console.log('Matrix data parsed')
            let payload = [...matrix.data]
            callback(payload)
          },
          dynamicTyping: true
        })
      }
    })
  }
  normalizeData (dataArray) {
    let globalMax = 0
    let colHeaders = dataArray.shift() // removes column labels
    let rowHeaders = []
    for (let row of dataArray) {
      rowHeaders.push(row.shift()) // removes row label
      let localMax = row.reduce((max, p) => Math.abs(p) > Math.abs(max) ? p : max, 0)
      if (Math.abs(localMax) > Math.abs(globalMax)) globalMax = localMax
    }
    dataArray = dataArray.map(row => {
      row = row.map(item => item / Math.abs(globalMax))
      row.unshift(rowHeaders.shift())
      return row
    })
    dataArray.unshift(colHeaders)
    return dataArray
  }
  recenterData (dataArray, center) {
    return dataArray.map((row, ndx) => {
      if (ndx !== 0) {
        row = row.map((item, ndy) => {
          if (ndy !== 0) item = item - center
          return item
        })
      }
      return row
    })
  }
  threshold (dataArray, max, min) {
    return dataArray.map((row, ndx) => {
      if (ndx !== 0) {
        row = row.map((item, ndy) => {
          if (ndy !== 0) {
            if (item > max) item = max
            if (item < min) item = min
          }
          return item
        })
      }
      return row
    })
  }
}
