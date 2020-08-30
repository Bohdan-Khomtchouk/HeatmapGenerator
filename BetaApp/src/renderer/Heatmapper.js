/* eslint-disable no-trailing-spaces */
// Heatmapper.js
// Module for handling pure heatmap/dendrogram generation

export default class Heatmapper {
  constructor (parent) {
    this.parent = parent
    this.d3 = require('d3')
    this.options = {}
  }

  /**
   * Draw a heatmap
   * @param {String} filePath The path to the data file (.csv, .txt)
   * @param {Dictionary} options Graphical and data-based customizations
   */
  drawHeatmap (filePath, options) {
    options.margin = {top: 100, right: 100, bottom: 100, left: 100}
    options.clusterSpace = 50
    options.cellSize = 50
    this.options = options

    var self = this
    self.parse(filePath).then(function (parsedData) {
      self.process(parsedData)
    }).then(function () {
      if (self.options.clustering.type !== 'none') {
        self.cluster()
      } else {
        self.options.clusterSpace = 0
      }
    }).then(function () {
      self.canvas(self.options)
    }).then(function () {
      self.labels(self.options)
    }).then(function () {
      self.heatmap(self.options)
    }).then(function () {
      if (self.options.clustering.type !== 'none') {
        self.dendrogram(self.options)
      }
    }).then(function () {
    }).catch((error) => {
      console.log('ERROR: ' + error)
    })
  }
  parse (filePath) {
    var fs = require('fs')
    var parser = require('papaparse')
    return new Promise(function (resolve, reject) {
      fs.readFile(filePath, 'utf8', (error, data) => {
        if (error) reject(error)
        else {
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
  process (inputData) {
    var self = this
    return new Promise(function (resolve, reject) {
      var yLabels = inputData.shift() // First subarray is just column labels
      // Iterate through all rows to get the labels -- would it be faster to just iterate through integers, rather than performing a .shift()
      var xLabels = []
      for (let a = 0, b = inputData.length; a < b; a++) {
        xLabels.push(inputData[a].shift()) // First object of each row is its label
      }
      var diff = yLabels.length - inputData[0].length
      if (diff > 0) yLabels.shift(diff) // if there are more column labels than data points, erase the extras (i.e. the corner label)

      var payload = {}
      payload.matrix = inputData
      payload.rowLabels = xLabels
      payload.colLabels = yLabels
      self.payload = payload
      resolve(null)
    })
  }
  cluster () {
    var self = this
    return new Promise(function (resolve, reject) {
      var hcluster = require('./hcluster')
      var matrixByRows = [] // Creates array of row vectors to cluster (column version below)
      for (let x = 0, l = self.payload.matrix.length; x < l; x++) {
        var row = []
        for (let y = 0, d = self.payload.matrix[x].length; y < d; y++) {
          row.push(self.payload.matrix[x][y])
        }
        matrixByRows.push({
          'name': self.payload.rowLabels[x],
          'value': row
        })
      }
      var clusteredRows = hcluster()
        .distance('euclidean')
        .linkage('avg')
        .verbose(false)
        .posKey('value')
        .data(matrixByRows)
      var matrixByColumns = []
      for (let y = 0, d = self.payload.matrix[0].length; y < d; y++) {
        var col = []
        for (let x = 0, l = self.payload.length; x < l; x++) {
          col.push(self.payload.matrix[x][y])
        }
        matrixByColumns.push({
          'name': self.payload.colLabels[y],
          'value': col
        })
      }
      var clusteredColumns = hcluster()
        .distance('euclidean')
        .linkage('avg')
        .verbose(false)
        .posKey('value')
        .data(matrixByColumns)
      var rowLabels = []
      var rowNodes = clusteredRows.orderedNodes()
      // console.log(rowNodes)
      for (let n in rowNodes) {
        rowLabels.push(rowNodes[n].name)
      }
      var colLabels = []
      var colNodes = clusteredColumns.orderedNodes()
      for (let m in colNodes) {
        colLabels.push(colNodes[m].name)
      }

      var rowOrder = clusteredRows.tree().indexes
      var colOrder = clusteredColumns.tree().indexes
      // console.log(clusteredRows.tree())
      var reorganizedMatrix = []
      for (let x = 0, l = self.payload.matrix.length; x < l; x++) {
        let row = []
        let a = rowOrder[x]
        for (let y = 0, d = self.payload.matrix[x].length; y < d; y++) {
          let b = colOrder[y]
          row.push(self.payload.matrix[a][b])
        }
        reorganizedMatrix.push(row)
      }
      self.payload.matrix = reorganizedMatrix
      self.payload.clusteredRows = clusteredRows
      self.payload.clusteredColumns = clusteredColumns
      self.payload.rowLabels = rowLabels
      self.payload.colLabels = colLabels
      if (self.payload.matrix.length === 0 || colNodes.length === 0 || rowNodes.length === 0) return reject(new Error('Failed to cluster data.'))
      else resolve(null)
    })
  }
  canvas () {
    var self = this
    var colNumber = self.payload.matrix[0].length
    var rowNumber = self.payload.matrix.length
    self.options.width = self.options.cellSize * colNumber + self.options.clusterSpace // - margin.left - margin.right,
    self.options.height = self.options.cellSize * rowNumber + self.options.clusterSpace // - margin.top - margin.bottom
    return new Promise(function (resolve, reject) {
      // Step 1: Create a dummy canvas
      // Step 2: Draw labels to the dummy canvas, keep track of the longest text length with a for each loop
      // Step 3: Wipe the text and canvas from steps 1/2
      // Step 4: Rebuild the canvas, all components should now have known lengths.
      self.svg = self.d3.select(self.parent)
        .append('svg')
        .attr('width', self.options.width + self.options.margin.left + self.options.margin.right)
        .attr('height', self.options.height + self.options.margin.top + self.options.margin.bottom)
      resolve(null)
    })
  }
  labels () {
    var self = this
    return new Promise(function (resolve, reject) {
      self.svg.append('g')
        .attr('class', 'rowLabels')
        .selectAll('.rowLabelg')
        .data(self.payload.rowLabels)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return (i + 1) * self.options.cellSize + self.options.clusterSpace
        })
        .style('text-anchor', 'start')
        .attr('transform', 'translate(' + (self.options.width + self.options.cellSize + 5) + ',' + self.options.cellSize / 1.5 + ')')
        .attr('class', function (d, i) {
          return 'rowLabel mono r' + i
        })
      self.svg.append('g')
        .attr('class', 'colLabels')
        .selectAll('.colLabelg')
        .data(self.payload.colLabels)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return (i + 1) * self.options.cellSize
        })
        .style('text-anchor', 'end')
        .attr('transform', 'translate(' + self.options.cellSize / 2 + ',-6) rotate (-90)  translate( -' + (self.options.height + self.options.cellSize * 2 - 30) + ',' + self.options.clusterSpace + ')')
        .attr('class', function (d, i) {
          return 'colLabel mono c' + i
        })

      // Title Labelling
      if (self.options.title) {
        self.svg.append('text')
          .attr('x', ((self.options.width + self.options.margin.left + self.options.margin.right) / 2))
          .attr('y', 16)
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .style('text-decoration', 'bold')
          .text(self.options.title.text)
      }
      // Axis Labelling
      if (self.options.xAxis) {
        var colLabelHeight = self.d3.select('.colLabels').node().getBBox().height
        self.svg.append('text')
          .attr('transform',
            'translate(' + ((self.options.width + self.options.margin.left + self.options.margin.right) / 2) + ' ,' +
            (self.options.height + self.options.margin.top + colLabelHeight) + ')')
          .style('text-anchor', 'middle')
          .text(self.options.xAxis.text)
      }
      if (self.options.yAxis) {
        var rowLabelWidth = self.d3.select('.rowLabels').node().getBBox().width
        self.svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', self.options.width + self.options.margin.left + rowLabelWidth)
          .attr('x', 0 - ((self.options.height + self.options.clusterSpace + self.options.margin.top) / 2))
          .attr('dy', '1em')
          .style('text-anchor', 'middle')
          .text(self.options.yAxis.text)
      }

      resolve(null)
    })
  }
  heatmap () {
    var self = this
    return new Promise(function (resolve, reject) {
      var colors = ['#0084FF', '#188EF7', '#3199EF', '#49A4E8', '#62AFE0', '#7ABAD9', '#93C5D1', '#ABD0C9', '#C4DBC2', '#DCE6BA', '#F5F1B3', '#F5DBA3', '#F6C694', '#F6B085', '#F79B76', '#F78667', '#F87057', '#F85B48', '#F94539', '#F9302A', '#FA1B1B']
      var matrix = []
      var min = 0
      var max = 0
      var colNumber = self.payload.matrix[0].length
      var rowNumber = self.payload.matrix.length
      for (var r = 0; r < rowNumber; r++) {
        for (var c = 0; c < colNumber; c++) {
          matrix.push({row: r + 1, col: c + 1, value: self.payload.matrix[r][c]})
          min = Math.min(min, self.payload.matrix[r][c])
          max = Math.max(max, self.payload.matrix[r][c])
        }
      }
      var middle = self.d3.median(matrix, function (d) {
        return d.value
      })
      var colorScale = self.d3.scaleQuantile([min, middle, max], colors)
      self.svg.append('g').attr('class', 'g3')
        .selectAll('.cellg')
        .data(matrix, function (d) {
          return d.row + ':' + d.col
        })
        .enter()
        .append('rect')
        .attr('x', function (d) {
          return d.col * self.options.cellSize + self.options.clusterSpace
        })
        .attr('y', function (d) {
          return d.row * self.options.cellSize + self.options.clusterSpace
        })
        .attr('class', function (d) {
          return 'cell cell-border cr' + (d.row - 1) + ' cc' + (d.col - 1)
        })
        .attr('width', self.options.cellSize)
        .attr('height', self.options.cellSize)
        .style('fill', function (d) {
          return colorScale(d.value)
        })
        .on('mouseover', function (d) {
          self.d3.select(this).classed('cell-hover', true)
            .style('stroke', '#F00')
            .style('stroke-width', '0.3px')
          // Update the tooltip position and value
          self.d3.select('#d3tooltip')
            .style('left', (self.d3.event.pageX + 10) + 'px')
            .style('top', (self.d3.event.pageY - 10) + 'px')
            .style('position', 'absolute')
            .style('width', '200px')
            .style('height', 'auto')
            .style('padding', '10px')
            .style('background-color', '#fafafa')
            .style('-webkit-border-radius', '10px')
            .style('-moz-border-radius', '10px')
            .style('border-radius', '10px')
            .style('-webkit-box-shadow', '4px 4px 10px rgba(0,0,0,0.4)')
            .style('-moz-box-shadow', '4px 4px 10px rgba(0,0,0,0.4)')
            .style('box-shadow', '4px 4px 10px rgba(0,0,0,0.4)')
            .style('pointer-events', 'none')
            .style('opacity', '0')
            .select('#value')
            .html(
              'Cell type: ' + self.payload.colLabels[d.col - 1] + '<br>Sample name: ' + self.payload.rowLabels[d.row - 1] +
              '<br>Value: ' + d.value
            )
          // Show the tooltip
          self.d3.select('#d3tooltip').transition()
            .duration(200)
            .style('opacity', 0.9)
        })
        .on('mouseout', function () {
          self.d3.select(this).classed('cell-hover', false)
            .style('stroke', 'none')
            .style('stroke-width', '0px')
          self.d3.selectAll('.rowLabel').classed('text-highlight', false)
          self.d3.selectAll('.colLabel').classed('text-highlight', false)
          self.d3.select('#d3tooltip').transition()
            .duration(200)
            .style('opacity', 0)
        })
      resolve(null)
    })
  }
  dendrogram () {
    var self = this
    return new Promise(function (resolve, reject) {
      function elbow (d, i) {
        return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
      }
      self.rowRoot = self.d3.hierarchy(self.payload.clusteredRows.tree())
      self.colRoot = self.d3.hierarchy(self.payload.clusteredColumns.tree())
      self.rowCluster = self.d3.cluster()
        .size([self.options.height - self.options.clusterSpace, self.options.clusterSpace])
      self.colCluster = self.d3.cluster()
        .size([self.options.width - self.options.clusterSpace, self.options.clusterSpace])

      var rTree = self.svg.append('g').attr('class', 'rtree').attr('transform', 'translate (20, ' + (self.options.clusterSpace + self.options.cellSize) + ')')
      rTree.selectAll('.rlink')
        .data(self.rowCluster(self.rowRoot).links())
        .enter().append('path')
        .attr('class', 'rlink')
        .attr('d', elbow)
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '1.5px')

      rTree.selectAll('.rnode')
        .data(self.rowCluster(self.rowRoot))
        .enter().append('g')
        .attr('class', 'rnode')
        .attr('transform', function (d) {
          return 'translate(' + d.y + ',' + d.x + ')'
        })
      var cTree = self.svg.append('g').attr('class', 'ctree').attr('transform', 'rotate (90), translate (30, -' + (self.options.clusterSpace + self.options.cellSize) + ') scale(1,-1)')
      cTree.selectAll('.clink')
        .data(self.colCluster(self.colRoot).links())
        .enter().append('path')
        .attr('class', 'clink')
        .attr('d', elbow)
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '1.5px')

      cTree.selectAll('.cnode')
        .data(self.colCluster(self.colRoot))
        .enter().append('g')
        .attr('class', 'cnode')
        .attr('transform', function (d) {
          return 'translate(' + d.y + ',' + d.x + ')'
        })
      resolve(null)
    })
  }
}
