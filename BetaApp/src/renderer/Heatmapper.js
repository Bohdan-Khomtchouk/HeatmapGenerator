/* eslint-disable no-trailing-spaces */
// Heatmapper.js
// Module for handling pure heatmap/dendrogram generation

export default class Heatmapper {
  constructor (parent) {
    this.parent = parent
    this.d3 = require('d3')
  }
  drawHeatmapWithDendrogram (filePath, options) {
    options.margin = {top: 10, right: 0, bottom: 10, left: 0}
    options.height = 150 - options.margin.top - options.margin.bottom
    options.clusterSpace = 100 // size of the cluster tree
    options.cellSize = 50

    var self = this
    self.parse(filePath).then(function (parsedData) {
      console.log('parsed')
      return self.cluster(parsedData)
    }).then(function (payload) {
      console.log('clustered')
      self.payload = payload
      self.canvas(options)
    }).then(function () {
      console.log('canvassed')
      self.labels(options)
    }).then(function () {
      console.log('labelled')
      self.heatmap(options)
    }).then(function () {
      console.log('heatmapped')
      self.dendrogram(options)
    }).then(function () {
      console.log('dendrogrammed')
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
  cluster (inputData) {
    return new Promise(function (resolve, reject) {
      var hcluster = require('./hcluster')
      var yLabels = inputData.shift()
      var xLabels = []
      for (var a = 0, b = inputData.length; a < b; a++) {
        xLabels.push(inputData[a].shift())
      }

      var diff = yLabels.length - inputData[0].length
      if (diff > 0) yLabels.shift(diff)

      var matrixByRows = []
      for (var x = 0, l = inputData.length; x < l; x++) {
        var row = []
        for (var y = 0, d = inputData[x].length; y < d; y++) {
          row.push(inputData[x][y])
        }
        matrixByRows.push({
          'name': xLabels[x],
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
      for (y = 0, d = inputData[0].length; y < d; y++) {
        var col = []
        for (x = 0, l = inputData.length; x < l; x++) {
          col.push(inputData[x][y])
        }
        matrixByColumns.push({
          'name': yLabels[y],
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
      for (var n in rowNodes) {
        rowLabels.push(rowNodes[n].name)
      }
      var colLabels = []
      var colNodes = clusteredColumns.orderedNodes()
      for (var m in colNodes) {
        colLabels.push(colNodes[m].name)
      }

      var finalPayload = {}
      finalPayload.matrix = inputData
      finalPayload.clusteredRows = clusteredRows
      finalPayload.clusteredColumns = clusteredColumns
      finalPayload.rowLabels = rowLabels
      finalPayload.colLabels = colLabels
      if (inputData.length === 0 || colNodes.length === 0 || rowNodes.length === 0) return reject(new Error('Failed to cluster data.'))
      else resolve(finalPayload)
    })
  }
  canvas (options) {
    var self = this
    var colNumber = self.payload.matrix[0].length
    var rowNumber = self.payload.matrix.length
    options.width = options.cellSize * colNumber + options.clusterSpace // - margin.left - margin.right,
    options.height = options.cellSize * rowNumber + options.clusterSpace // - margin.top - margin.bottom

    return new Promise(function (resolve, reject) {
      self.svg = self.d3.select(self.parent)
        .append('svg')
        .attr('width', '500px')
        .attr('height', '1000px')
      self.svg.selectAll('*').remove()
      self.svg.attr('width', options.width + options.margin.left + options.margin.right + options.clusterSpace)
        .attr('height', options.height + options.margin.top + options.margin.bottom + options.clusterSpace)
      resolve(null)
    })
  }
  labels (options) {
    var self = this
    return new Promise(function (resolve, reject) {
      self.svg.append('g')
        .selectAll('.rowLabelg')
        .data(self.payload.rowLabels)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return (i + 1) * options.cellSize + options.clusterSpace
        })
        .style('text-anchor', 'start')
        .attr('transform', 'translate(' + (options.width + options.cellSize) + ',' + options.cellSize / 1.5 + ')')
        .attr('class', function (d, i) {
          return 'rowLabel mono r' + i
        })
      self.svg.append('g')
        .selectAll('.colLabelg')
        .data(self.payload.colLabels)
        .enter()
        .append('text')
        .text(function (d) {
          return d
        })
        .attr('x', 0)
        .attr('y', function (d, i) {
          return (i + 1) * options.cellSize
        })
        .style('text-anchor', 'end')
        .attr('transform', 'translate(' + options.cellSize / 2 + ',-6) rotate (-90)  translate( -' + (options.height + options.cellSize * 2) + ',' + options.clusterSpace + ')')
        .attr('class', function (d, i) {
          return 'colLabel mono c' + i
        })
      resolve(null)
    })
  }
  heatmap (options) {
    var self = this
    return new Promise(function (resolve, reject) {
      self.rowRoot = self.d3.hierarchy(self.payload.clusteredRows.tree())
      self.colRoot = self.d3.hierarchy(self.payload.clusteredColumns.tree())
      self.rowCluster = self.d3.cluster()
        .size([options.height - options.clusterSpace, options.clusterSpace])
      self.colCluster = self.d3.cluster()
        .size([options.width - options.clusterSpace, options.clusterSpace])
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
          return d.col * options.cellSize + options.clusterSpace
        })
        .attr('y', function (d) {
          return d.row * options.cellSize + options.clusterSpace
        })
        .attr('class', function (d) {
          return 'cell cell-border cr' + (d.row - 1) + ' cc' + (d.col - 1)
        })
        .attr('width', options.cellSize)
        .attr('height', options.cellSize)
        .style('fill', function (d) {
          return colorScale(d.value)
        })
        .on('mouseover', function (d) {
          self.d3.select(this).classed('cell-hover', true)
          // Update the tooltip position and value
          self.d3.select('#d3tooltip')
            .style('left', (self.d3.event.pageX + 10) + 'px')
            .style('top', (self.d3.event.pageY - 10) + 'px')
            .select('#value')
            .html(
              'Cell type: ' + self.payload.colLabels[d.col] + '<br>Sample name: ' + self.payload.rowLabels[d.row] +
              '<br>Value: ' + d.value
            )
          // Show the tooltip
          self.d3.select('#d3tooltip').transition()
            .duration(200)
            .style('opacity', 0.9)
        })
        .on('mouseout', function () {
          self.d3.select(this).classed('cell-hover', false)
          self.d3.selectAll('.rowLabel').classed('text-highlight', false)
          self.d3.selectAll('.colLabel').classed('text-highlight', false)
          self.d3.select('#d3tooltip').transition()
            .duration(200)
            .style('opacity', 0)
        })
      resolve(null)
    })
  }
  dendrogram (options) {
    var self = this
    return new Promise(function (resolve, reject) {
      function elbow (d, i) {
        return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
      }
      var rTree = self.svg.append('g').attr('class', 'rtree').attr('transform', 'translate (10, ' + (options.clusterSpace + options.cellSize) + ')')
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
      var cTree = self.svg.append('g').attr('class', 'ctree').attr('transform', 'rotate (90), translate (10, -' + (options.clusterSpace + options.cellSize) + ') scale(1,-1)')
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
