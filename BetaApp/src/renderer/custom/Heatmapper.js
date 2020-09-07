/* eslint-disable no-trailing-spaces */
// Heatmapper.js
// Module for handling pure heatmap/dendrogram generation

import HeatmapObject from './heatmap'

export default class Heatmapper {
  constructor (parent) {
    this.parent = parent
    this.d3 = require('d3')
  }

  /**
   * Draw a heatmap
   * @param {String} filePath The path to the data file (.csv, .txt)
   * @param {Dictionary} options Graphical and data-based customizations
   */
  drawHeatmap (filePath, settings) {
    this.settings = settings
    var self = this
    self.parse(filePath).then(function (parsedData) {
      self.process(parsedData)
    }).then(function () {
      if (settings.clustering.type !== 'none') {
        self.cluster()
      }
    }).then(function () {
      self.canvas()
    }).then(function () {
      self.labels()
    }).then(function () {
      self.heatmap()
    }).then(function () {
      if (settings.clustering.type !== 'none') {
        self.dendrogram()
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

      self.payload = {
        matrix: inputData,
        rowLabels: {
          data: xLabels,
          width: null
        },
        colLabels: {
          data: yLabels,
          height: null
        },
        rowTree: null,
        colTree: null
      }
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
          'name': self.payload.rowLabels.data[x],
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
          'name': self.payload.colLabels.data[y],
          'value': col
        })
      }
      var clusteredColumns = hcluster()
        .distance('euclidean')
        .linkage('avg')
        .verbose(false)
        .posKey('value')
        .data(matrixByColumns)
      var rowLabelsArr = []
      var rowNodes = clusteredRows.orderedNodes()
      for (let n in rowNodes) {
        rowLabelsArr.push(rowNodes[n].name)
      }
      var colLabelsArr = []
      var colNodes = clusteredColumns.orderedNodes()
      for (let m in colNodes) {
        colLabelsArr.push(colNodes[m].name)
      }

      var rowOrder = clusteredRows.tree().indexes
      var colOrder = clusteredColumns.tree().indexes
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
      self.payload = {
        matrix: reorganizedMatrix,
        rowLabels: {
          data: rowLabelsArr,
          width: null
        },
        colLabels: {
          data: colLabelsArr,
          height: null
        },
        rowTree: clusteredRows,
        colTree: clusteredColumns
      }
      if (self.payload.matrix.length === 0 || colNodes.length === 0 || rowNodes.length === 0) return reject(new Error('Failed to cluster data.'))
      else resolve(null)
    })
  }
  canvas () {
    var self = this
    return new Promise(function (resolve, reject) {
      self.svg = self.d3.select(self.parent)
        .append('svg')
        .attr('width', 1000)
        .attr('height', 1000)
      var maxRowLabelWidth = 0
      var maxColLabelHeight = 0
      self.svg.append('g')
        .attr('class', 'rowLabels')
        .selectAll('.rowLabelg')
        .data(self.payload.rowLabels.data)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', 0)
        .style('text-anchor', 'start')
        .attr('class', function (d, i) {
          return 'rowLabel mono r' + i
        })
        .text(function (d) { return d })
        .each(function (d, i) {
          var thisWidth = this.getComputedTextLength()
          if (thisWidth > maxRowLabelWidth) maxRowLabelWidth = thisWidth
          this.remove() // remove them just after displaying them
        })
      self.payload.rowLabels.width = maxRowLabelWidth
      self.svg.append('g')
        .attr('class', 'colLabels')
        .selectAll('.colLabelg')
        .data(self.payload.colLabels.data)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', 0)
        .style('text-anchor', 'end')
        .attr('class', function (d, i) {
          return 'colLabel mono c' + i
        })
        .text(function (d) { return d })
        .each(function (d, i) {
          var thisWidth = this.getComputedTextLength()
          if (thisWidth > maxColLabelHeight) maxColLabelHeight = thisWidth
          this.remove() // remove them just after displaying them
        })
      self.payload.colLabels.height = maxColLabelHeight
      self.heatmapObject = {}
      self.heatmapObject = new HeatmapObject(self.payload, self.settings)
      self.d3.select(self.parent).selectAll('*').remove()
      self.svg = self.d3.select(self.parent)
        .append('svg')
        .attr('width', self.heatmapObject.spacingTill('horizontal'))
        .attr('height', self.heatmapObject.spacingTill('vertical'))
      resolve(null)
    })
  }
  labels () {
    var self = this
    return new Promise(function (resolve, reject) {
      self.svg.append('g')
        .attr('class', 'rowLabels')
        .selectAll('.rowLabelg')
        .data(self.heatmapObject.data.rowLabels.data)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return i * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('vertical', 'tree')
        })
        .style('text-anchor', 'start')
        .attr('transform', 'translate(' + (self.heatmapObject.spacingTill('horizontal', 'heatmap') + self.heatmapObject.appearance.rowAxis.labels.padding.left) + ',' + self.heatmapObject.appearance.heatmap.cellSize / 1.5 + ')')
        .attr('class', function (d, i) {
          return 'rowLabel mono r' + i
        })
      self.svg.append('g')
        .attr('class', 'colLabels')
        .selectAll('.colLabelg')
        .data(self.heatmapObject.data.colLabels.data)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return i * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('horizontal', 'tree')
        })
        .style('text-anchor', 'end')
        .attr('transform', 'translate(' + self.heatmapObject.appearance.heatmap.cellSize / 2 + ', 0) rotate (-90)  translate( -' + (self.heatmapObject.spacingTill('vertical', 'heatmap') + self.heatmapObject.appearance.colAxis.labels.padding.top) + ',' + 0 + ')')
        .attr('class', function (d, i) {
          return 'colLabel mono c' + i
        })

      // Title Labelling
      if (self.heatmapObject.settings.title !== '') {
        self.svg.append('text')
          .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
          .attr('y', self.heatmapObject.spacingTill('vertical', 'margin1'))
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .text(self.heatmapObject.settings.title)
      }
      // Axis Labelling
      if (self.heatmapObject.settings.colAxis !== '') {
        self.svg.append('text')
          .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
          .attr('y', self.heatmapObject.spacingTill('vertical', 'labels') + self.heatmapObject.appearance.colAxis.title.padding.top)
          .attr('text-anchor', 'middle')
          .text(self.heatmapObject.settings.colAxis)
      }
      if (self.heatmapObject.settings.rowAxis !== '') {
        self.svg.append('text')
          .attr('x', -(self.heatmapObject.spacingTill('vertical', 'tree') + (self.heatmapObject.appearance.heatmap.height / 2)))
          .attr('y', self.heatmapObject.spacingTill('horizontal', 'labels') + self.heatmapObject.appearance.rowAxis.title.padding.left)
          .attr('transform', 'rotate(-90)')
          .attr('text-anchor', 'middle')
          .text(self.heatmapObject.settings.rowAxis)
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
      for (var r = 0; r < self.heatmapObject.appearance.heatmap.rows; r++) {
        for (var c = 0; c < self.heatmapObject.appearance.heatmap.columns; c++) {
          matrix.push({row: r, col: c, value: self.heatmapObject.data.matrix[r][c]})
          min = Math.min(min, self.heatmapObject.data.matrix[r][c])
          max = Math.max(max, self.heatmapObject.data.matrix[r][c])
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
          return d.col * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('horizontal', 'tree')
        })
        .attr('y', function (d) {
          return d.row * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('vertical', 'tree')
        })
        .attr('class', function (d) {
          return 'cell cell-border cr' + d.row + ' cc' + d.col
        })
        .attr('width', self.heatmapObject.appearance.heatmap.cellSize)
        .attr('height', self.heatmapObject.appearance.heatmap.cellSize)
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
              'Cell type: ' + self.heatmapObject.data.colLabels.data[d.col] + '<br>Sample name: ' + self.heatmapObject.data.rowLabels.data[d.row] +
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
      self.rowRoot = self.d3.hierarchy(self.heatmapObject.data.rowTree.tree())
      self.colRoot = self.d3.hierarchy(self.heatmapObject.data.colTree.tree())
      self.rowCluster = self.d3.cluster()
        .size([self.heatmapObject.appearance.heatmap.height, self.heatmapObject.appearance.clustering.row.size])
      self.colCluster = self.d3.cluster()
        .size([self.heatmapObject.appearance.heatmap.width, self.heatmapObject.appearance.clustering.col.size])

      var rTree = self.svg.append('g').attr('class', 'rtree').attr('transform', 'translate (' + self.heatmapObject.spacingTill('horizontal', 'margin1') + ', ' + self.heatmapObject.spacingTill('vertical', 'tree') + ')')
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
      var cTree = self.svg.append('g').attr('class', 'ctree').attr('transform', 'rotate (90), translate (' + self.heatmapObject.spacingTill('vertical', 'title') + ', -' + (self.heatmapObject.spacingTill('horizontal', 'tree')) + ') scale(1,-1)')
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
