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
    var self = this
    this.settings = settings
    this.payload = {}
    self.parse(filePath).then(function (data) {
      return self.process(data)
    }).then(function (payload) {
      if (settings.clustering.type !== 'none') {
        return self.cluster(payload, settings.clustering.type)
      } else {
        return payload
      }
    }).then(function (finalPayload) {
      self.createHTMP(finalPayload)
    }).then(function () {
      self.canvas()
    }).then(function () {
      self.rowLabels()
    }).then(function () {
      self.colLabels()
    }).then(function () {
      self.titleLabel()
    }).then(function () {
      self.rowAxisLabel()
    }).then(function () {
      self.colAxisLabel()
    }).then(function () {
      self.heatmap()
    }).then(function () {
      switch (settings.clustering.type) {
        case 'none':
          break
        case 'row':
          self.rowDendrogram()
          break
        case 'col':
          self.colDendrogram()
          break
        case 'both':
          self.rowDendrogram()
          self.colDendrogram()
          break
        default:
          break
      }
    }).then(function () {
    }).catch((error) => {
      console.log('ERROR: ' + error)
    })
  }
  /**
   * Parses the CSV/TXT file associated with a given file path.
   * Returns 2D matrix.
   * @param {String} filePath The path to the data file (.csv, .txt)
   */
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
  /**
   * Extracts labels from the matrix.
   * Returns data object.
   * @param {Number []} matrix The path to the data file (.csv, .txt)
   */
  process (matrix) {
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
  /**
   * Clusters matrix and updates data object.
   * Returns updated data object.
   * @param {Object} payload Data object for heatmap.js
   * @param {String} option Clustering type (both, row, col, none)
   */
  cluster (payload, option) {
    return new Promise(function (resolve, reject) {
      var hcluster = require('./hcluster')
      var rowIndices = [...Array(payload.rowLabels.data.length)].map((u, i) => i)
      var colIndices = [...Array(payload.colLabels.data.length)].map((u, i) => i)
      if (option === 'row' || option === 'both') {
        var rowVectors = []
        for (let x = 0, l = payload.matrix.length; x < l; x++) {
          var row = []
          for (let y = 0, d = payload.matrix[x].length; y < d; y++) {
            row.push(payload.matrix[x][y])
          }
          rowVectors.push({
            'name': payload.rowLabels.data[x],
            'value': row
          })
        }
        payload.rowTree = hcluster()
          .distance('euclidean')
          .linkage('avg')
          .verbose(false)
          .posKey('value')
          .data(rowVectors)
        payload.rowLabels.data = payload.rowTree.orderedNodes().map(node => { return node.name })
        rowIndices = payload.rowTree.tree().indexes
      }
      if (option === 'col' || option === 'both') {
        var colVectors = []
        for (let y = 0, d = payload.matrix[0].length; y < d; y++) {
          var col = []
          for (let x = 0, l = payload.length; x < l; x++) {
            col.push(payload.matrix[x][y])
          }
          colVectors.push({
            'name': payload.colLabels.data[y],
            'value': col
          })
        }
        payload.colTree = hcluster()
          .distance('euclidean')
          .linkage('avg')
          .verbose(false)
          .posKey('value')
          .data(colVectors)
        payload.colLabels.data = payload.colTree.orderedNodes().map(node => { return node.name })
        colIndices = payload.colTree.tree().indexes
      }

      payload.matrix = payload.matrix.map((row, rowInd) => {
        return row.map((col, colInd) => {
          let r = rowIndices[rowInd]
          let c = colIndices[colInd]
          return payload.matrix[r][c]
        })
      })

      if (payload.matrix.length === 0) reject(new Error('Failed to cluster data.'))
      else resolve(payload)
    })
  }
  /**
   * Creates heatmap object and estimates row/col label sizes.
   * @param {Object} payload Data object for heatmap.js
   */
  createHTMP (payload) {
    var self = this
    return new Promise(function (resolve, reject) {
      self.svg = self.d3.select(self.parent)
        .append('svg')
      var width = 0
      self.svg.append('g')
        .attr('class', 'rowLabels')
        .selectAll('.rowLabelg')
        .data(payload.rowLabels.data)
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
          var thisSize = this.getComputedTextLength()
          if (thisSize > width) width = thisSize
          this.remove()
        })
      var height = 0
      self.svg.append('g')
        .attr('class', 'colLabels')
        .selectAll('.colLabelg')
        .data(payload.colLabels.data)
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
          var thisSize = this.getComputedTextLength()
          if (thisSize > height) height = thisSize
          this.remove() // remove them just after displaying them
        })
      payload.rowLabels.width = width
      payload.colLabels.height = height
      self.heatmapObject = {}
      self.heatmapObject = new HeatmapObject(payload, self.settings)
    })
  }
  canvas () {
    var self = this
    return new Promise(function (resolve, reject) {
      self.d3.select(self.parent).selectAll('*').remove()
      var w = self.heatmapObject.spacingTill('horizontal')
      var h = self.heatmapObject.spacingTill('vertical')
      self.svg = self.d3.select(self.parent)
        .append('svg')
        .attr('viewBox', '0 0 ' + w + ' ' + h)
      resolve(null)
    })
  }
  rowLabels () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.svg.select('.rowLabels').empty()) {
        self.svg.append('g')
          .attr('class', 'rowLabels')
          .selectAll('.rowLabelg')
          .data(self.heatmapObject.data.rowLabels.data)
          .enter()
          .append('text')
          .text(function (d) {
            return d
          })
          .attr('x', self.heatmapObject.spacingTill('horizontal', 'heatmap') + self.heatmapObject.appearance.rowAxis.labels.padding.left)
          .attr('y', function (d, i) {
            return (i * self.heatmapObject.appearance.heatmap.cellSize) + self.heatmapObject.appearance.heatmap.cellSize / 1.5 + self.heatmapObject.spacingTill('vertical', 'tree')
          })
          .style('text-anchor', 'start')
          .attr('class', function (d, i) {
            return 'rowLabel mono r' + i
          })
        resolve(null)
      } else {
        self.svg.selectAll('.rowLabel')
          .data(self.heatmapObject.data.rowLabels.data)
          .transition()
          .attr('x', self.heatmapObject.spacingTill('horizontal', 'heatmap') + self.heatmapObject.appearance.rowAxis.labels.padding.left)
          .attr('y', function (d, i) {
            return (i * self.heatmapObject.appearance.heatmap.cellSize) + self.heatmapObject.appearance.heatmap.cellSize / 1.5 + self.heatmapObject.spacingTill('vertical', 'tree')
          })
        resolve(null)
      }
    })
  }
  colLabels () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.svg.select('.colLabels').empty()) {
        self.svg.append('g')
          .attr('class', 'colLabels')
          .selectAll('.colLabelg')
          .data(self.heatmapObject.data.colLabels.data)
          .enter()
          .append('text')
          .text(function (d) {
            return d
          })
          .style('text-anchor', 'end')
          .attr('transform', 'rotate (-90)')
          .attr('x', -(self.heatmapObject.spacingTill('vertical', 'heatmap') + self.heatmapObject.appearance.colAxis.labels.padding.top))
          .attr('y', function (d, i) {
            return i * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('horizontal', 'tree') + self.heatmapObject.appearance.heatmap.cellSize / 2
          })
          .attr('class', function (d, i) {
            return 'colLabel mono c' + i
          })
        resolve(null)
      } else {
        self.selectAll('.colLabel')
          .data(self.heatmapObject.data.colLabels.data)
          .transition()
          .attr('x', -(self.heatmapObject.spacingTill('vertical', 'heatmap') + self.heatmapObject.appearance.colAxis.labels.padding.top))
          .attr('y', function (d, i) {
            return i * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('horizontal', 'tree') + self.heatmapObject.appearance.heatmap.cellSize / 2
          })
        resolve(null)
      }
    })
  }
  titleLabel () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.title !== '') {
        if (self.svg.select('.titleLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'titleLabel')
            .attr('text-anchor', 'middle')
            .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
            .attr('y', self.heatmapObject.spacingTill('vertical', 'margin1'))
            .style('font-size', '16px')
            .text(self.heatmapObject.settings.title)
          resolve(null)
        } else {
          self.svg.select('.titleLabel')
            .transition()
            .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
            .attr('y', self.heatmapObject.spacingTill('vertical', 'margin1'))
          resolve(null)
        }
      } else resolve(null)
    })
  }
  rowAxisLabel () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.rowAxis !== '') {
        if (self.svg.select('.rowAxisLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'rowAxisLabel')
            .attr('text-anchor', 'middle')
            .attr('x', -(self.heatmapObject.spacingTill('vertical', 'tree') + (self.heatmapObject.appearance.heatmap.height / 2)))
            .attr('y', self.heatmapObject.spacingTill('horizontal', 'labels') + self.heatmapObject.appearance.rowAxis.title.padding.left)
            .attr('transform', 'rotate(-90)')
            .text(self.heatmapObject.settings.rowAxis)
          resolve(null)
        } else {
          self.svg.select('.rowAxisLabel')
            .transition()
            .attr('x', -(self.heatmapObject.spacingTill('vertical', 'tree') + (self.heatmapObject.appearance.heatmap.height / 2)))
            .attr('y', self.heatmapObject.spacingTill('horizontal', 'labels') + self.heatmapObject.appearance.rowAxis.title.padding.left)
          resolve(null)
        }
      } else resolve(null)
    })
  }
  colAxisLabel () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.colAxis !== '') {
        if (self.svg.select('.colAxisLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'colAxisLabel')
            .attr('text-anchor', 'middle')
            .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
            .attr('y', self.heatmapObject.spacingTill('vertical', 'labels') + self.heatmapObject.appearance.colAxis.title.padding.top)
            .text(self.heatmapObject.settings.colAxis)
          resolve(null)
        } else {
          self.svg.select('.colAxisLabel')
            .transition()
            .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
            .attr('y', self.heatmapObject.spacingTill('vertical', 'labels') + self.heatmapObject.appearance.colAxis.title.padding.top)
        }
      } else resolve(null)
    })
  }
  heatmap () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.svg.select('.g3').empty()) {
        let colors = ['#0084FF', '#188EF7', '#3199EF', '#49A4E8', '#62AFE0', '#7ABAD9', '#93C5D1', '#ABD0C9', '#C4DBC2', '#DCE6BA', '#F5F1B3', '#F5DBA3', '#F6C694', '#F6B085', '#F79B76', '#F78667', '#F87057', '#F85B48', '#F94539', '#F9302A', '#FA1B1B']
        let matrix = []
        let min = 0
        let max = 0
        for (let r = 0, q = self.heatmapObject.appearance.heatmap.rows; r < q; r++) {
          for (let c = 0, z = self.heatmapObject.appearance.heatmap.columns; c < z; c++) {
            matrix.push({row: r, col: c, value: self.heatmapObject.data.matrix[r][c]})
            min = Math.min(min, self.heatmapObject.data.matrix[r][c])
            max = Math.max(max, self.heatmapObject.data.matrix[r][c])
          }
        }
        let middle = self.d3.median(matrix, function (d) {
          return d.value
        })
        let colorScale = self.d3.scaleQuantile([min, middle, max], colors)
        self.svg.append('g')
          .attr('class', 'g3')
          .selectAll('.cellg')
          .data(matrix, function (d) {
            return d.row + ':' + d.col
          })
          .enter()
          .append('rect')
          .attr('x', function (d) {
            return (d.col * self.heatmapObject.appearance.heatmap.cellSize) + self.heatmapObject.spacingTill('horizontal', 'tree')
          })
          .attr('y', function (d) {
            return (d.row * self.heatmapObject.appearance.heatmap.cellSize) + self.heatmapObject.spacingTill('vertical', 'tree')
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
      } else {
        let colors = ['#0084FF', '#188EF7', '#3199EF', '#49A4E8', '#62AFE0', '#7ABAD9', '#93C5D1', '#ABD0C9', '#C4DBC2', '#DCE6BA', '#F5F1B3', '#F5DBA3', '#F6C694', '#F6B085', '#F79B76', '#F78667', '#F87057', '#F85B48', '#F94539', '#F9302A', '#FA1B1B']
        let matrix = []
        let min = 0
        let max = 0
        for (let r = 0, q = self.heatmapObject.appearance.heatmap.rows; r < q; r++) {
          for (let c = 0, z = self.heatmapObject.appearance.heatmap.columns; c < z; c++) {
            matrix.push({row: r, col: c, value: self.heatmapObject.data.matrix[r][c]})
            min = Math.min(min, self.heatmapObject.data.matrix[r][c])
            max = Math.max(max, self.heatmapObject.data.matrix[r][c])
          }
        }
        let middle = self.d3.median(matrix, function (d) {
          return d.value
        })
        let colorScale = self.d3.scaleQuantile([min, middle, max], colors)
        self.svg.selectAll('.cell')
          .data(matrix, function (d) {
            return d.row + ':' + d.col
          })
          .transition()
          .attr('x', function (d) {
            return d.col * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('horizontal', 'tree')
          })
          .attr('y', function (d) {
            return d.row * self.heatmapObject.appearance.heatmap.cellSize + self.heatmapObject.spacingTill('vertical', 'tree')
          })
          .attr('width', self.heatmapObject.appearance.heatmap.cellSize)
          .attr('height', self.heatmapObject.appearance.heatmap.cellSize)
          .style('fill', function (d) {
            return colorScale(d.value)
          })
      }
    })
  }

  rowDendrogram () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.svg.select('.rtree').empty()) {
        self.rowRoot = self.d3.hierarchy(self.heatmapObject.data.rowTree.tree())
        self.rowCluster = self.d3.cluster()
          .size([self.heatmapObject.appearance.heatmap.height, self.heatmapObject.appearance.clustering.row.size])
        let rTree = self.svg.append('g')
          .attr('class', 'rtree')
          .attr('transform', 'translate(' + self.heatmapObject.spacingTill('horizontal', 'margin1') + ', ' + self.heatmapObject.spacingTill('vertical', 'tree') + ')')
        rTree.selectAll('.rlink')
          .data(self.rowCluster(self.rowRoot).links())
          .enter()
          .append('path')
          .attr('class', 'rlink')
          .attr('d', function (d, i) {
            return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', '1.5px')
        rTree.selectAll('.rnode')
          .data(self.rowCluster(self.rowRoot))
          .enter().append('g')
          .attr('class', 'rnode')
          .attr('x', function (d) {
            return d.x
          })
          .attr('y', function (d) {
            return d.y
          })
        resolve(null)
      } else {
        self.rowRoot = self.d3.hierarchy(self.heatmapObject.data.rowTree.tree())
        self.rowCluster = self.d3.cluster()
          .size([self.heatmapObject.appearance.heatmap.height, self.heatmapObject.appearance.clustering.row.size])
        let rTree = self.svg.select('.rtree')
          .transition()
          .attr('transform', 'translate(' + self.heatmapObject.spacingTill('horizontal', 'margin1') + ' ,' + self.heatmapObject.spacingTill('vertical', 'tree') + ')')
        rTree.selectAll('.rlink')
          .data(self.rowCluster(self.rowRoot).links())
          .transition()
          .attr('d', function (d, i) {
            return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', '1.5px')
        rTree.selectAll('.rnode')
          .data(self.rowCluster(self.rowRoot))
          .transition()
          .attr('transform', function (d) {
            return 'translate(' + d.y + ',' + d.x + ')'
          })
        resolve(null)
      }
    })
  }
  colDendrogram () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.svg.select('.ctree').empty()) {
        self.colRoot = self.d3.hierarchy(self.heatmapObject.data.colTree.tree())
        self.colCluster = self.d3.cluster()
          .size([self.heatmapObject.appearance.heatmap.width, self.heatmapObject.appearance.clustering.col.size])
        let cTree = self.svg.append('g')
          .attr('class', 'ctree')
          .attr('transform', 'rotate (90), scale(1,-1), translate(' + self.heatmapObject.spacingTill('vertical', 'title') + ', ' + self.heatmapObject.spacingTill('horizontal', 'tree') + ')')
        cTree.selectAll('.clink')
          .data(self.colCluster(self.colRoot).links())
          .enter().append('path')
          .attr('class', 'clink')
          .attr('d', function (d, i) {
            return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
          })
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
      } else {
        self.colRoot = self.d3.hierarchy(self.heatmapObject.data.colTree.tree())
        self.colCluster = self.d3.cluster()
          .size([self.heatmapObject.appearance.heatmap.width, self.heatmapObject.appearance.clustering.col.size])
        let cTree = self.svg.select('.ctree')
          .transition()
          .attr('transform', 'translate(' + self.heatmapObject.spacingTill('vertical', 'title') + ', ' + self.heatmapObject.spacingTill('horizontal', 'tree') + ')')
        cTree.selectAll('.clink')
          .data(self.colCluster(self.colRoot).links())
          .transition()
          .attr('d', function (d, i) {
            return 'M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', '1.5px')

        cTree.selectAll('.cnode')
          .data(self.colCluster(self.colRoot))
          .transition()
          .attr('transform', function (d) {
            return 'translate(' + d.y + ',' + d.x + ')'
          })
        resolve(null)
      }
    })
  }
  /* rerenderHeatmap (comp, prop, change) {
    this.heatmapObject.updateAppearance(comp, prop, change, function (ndx) {
      var horizontal = (comp.direction === 'horizontal')
      var components = Object.keys(this.heatmapObject.components[comp.direction].map)
      for (var c in components) {
        switch (c) {
          case 'margin1':
            if (horizontal) {

            } else {

            }
            break
          case 'title':
            break
          case 'tree':
            break
          case 'heatmap':
            break
          case 'labels':
            break
          case 'axis':
            break
          case 'margin2'
            break
        }
      }
    })
  }
  updateCellSize (size) {
    var self = this
    self.heatmapObject.appearance.heatmap.cellSize = size
    var newWidth = size * self.heatmapObject.appearance.heatmap.columns
    var newHeight = size * self.heatmapObject.appearance.heatmap.rows
    var comp1 = { direction: 'horizontal', name: 'heatmap' }
    var comp2 = { direction: 'vertical', name: 'heatmap' }
    self.heatmapObject.updateAppearance(comp1, 'heatmap.width', newWidth)
    self.heatmapObject.updateAppearance(comp2, 'heatmap.height', newHeight)
    return new Promise(function (resolve, reject) {
      self.canvas().then(function () {
        self.labels()
      }).then(function () {
        self.heatmap()
      }).then(function () {
        if (self.heatmapObject.settings.clustering.type !== 'none') {
          self.dendrogram()
        }
      }).then(function () {
      }).catch((error) => {
        console.log('ERROR: ' + error)
      })
    })
  } */
}
