/* eslint-disable no-trailing-spaces */
// Heatmapper.js
// Module for handling pure heatmap/dendrogram generation

// Imports
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker'
import PromiseWorker from 'promise-worker'
import HeatmapObject from './heatmap'

export default class Heatmapper {
  constructor (parent) {
    const worker = new Worker()
    this.promiseWorker = new PromiseWorker(worker)
    this.parent = parent
    this.d3 = require('d3')
    this.payload = {}
  }

  // Public Functions
  // Data Processing
  parse (filePath) {
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

  cluster (filePath, options) {
    return this.promiseWorker.postMessage({
      type: 'cluster', filePath: filePath, distFn: options.clustering.distType, linkFn: options.clustering.linkType, axes: options.clustering.type
    })
  }

  estimateClusteringLoad (matrix) {
    return new Promise(function (resolve, reject) {
      let numOfRows = matrix.length - 1
      let numOfCols = matrix[1].length
      let numOfElements = numOfRows * numOfCols
      let path = require('path')
      // let process = require('electron').remote.process
      var dataPath
      if (process.env.NODE_ENV === 'production') dataPath = path.resolve(path.dirname(__dirname), '../../extraResources', 'speedTest.csv')
      else dataPath = path.resolve('src/extraResources', 'speedTest.csv')
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
              console.log(time)
              console.log(elements)
              resolve(time)
            },
            dynamicTyping: true
          })
        }
      })
    })
  }

  changeHeatmapAppearance (comp, prop, change, altComp) {
    var self = this
    altComp = altComp || null
    this.heatmapObject.updateAppearance(comp, prop, change, function (error, ndx) {
      if (error) console.log(error)
      self.renderHeatmapFrom(comp.direction, ndx, false)
    }, altComp)
  }

  loadFromFile (filePath) {
    return new Promise(function (resolve, reject) {
      var fs = require('fs')
      fs.readFile(filePath, 'utf8', (error, data) => {
        if (error) reject(error)
        else {
          resolve(data)
        }
      })
    })
  }

  saveHeatmapFile (filePath, callback) {
    const fs = require('fs')
    const data = JSON.stringify(this.heatmapObject)
    fs.writeFile(filePath, data, (err) => {
      callback(err)
    })
  }

  exportHeatmapFile (callback) {
    // clear the interactivity UI first
    this.d3.select('.editingTray')
      .select('.activeTool')
      .classed('activeTool', false)
      .classed('inactiveTool', true)
      .classed('d-none', true)
    this.d3.select('.editingTray')
      .select('.marginsEditor')
      .classed('inactiveTool', false)
      .classed('activeTool', true)
      .classed('d-none', false)
    this.d3.select('.selectedRect')
      .classed('selectedRect', false)
      .style('fill', 'none')

    var svgString = this.getSVGString(this.svg.node())
    var svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'})
    var FileSaver = require('file-saver')
    let fpath = this.heatmapObject.settings.fileName
    let path = require('path')
    let filename = path.basename(fpath, path.extname(fpath))
    FileSaver.saveAs(svgBlob, filename + '.svg')
    callback(null)
  }

  getSVGString (svgNode) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink')
    var cssStyleText = getCSSStyles(svgNode)
    appendCSS(cssStyleText, svgNode)

    var serializer = new XMLSerializer()
    var svgString = serializer.serializeToString(svgNode)
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink=') // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href') // Safari NS namespace fix

    return svgString

    function getCSSStyles (parentElement) {
      var selectorTextArr = []

      // Add Parent element Id and Classes to the list
      selectorTextArr.push('#' + parentElement.id)
      for (let c = 0; c < parentElement.classList.length; c++) {
        if (!contains('.' + parentElement.classList[c], selectorTextArr)) {
          selectorTextArr.push('.' + parentElement.classList[c])
        }
      }

      // Add Children element Ids and Classes to the list
      var nodes = parentElement.getElementsByTagName('*')
      for (let i = 0; i < nodes.length; i++) {
        var id = nodes[i].id
        if (!contains('#' + id, selectorTextArr)) selectorTextArr.push('#' + id)

        var classes = nodes[i].classList
        for (let c = 0; c < classes.length; c++) {
          if (!contains('.' + classes[c], selectorTextArr)) selectorTextArr.push('.' + classes[c])
        }
      }

      // Extract CSS Rules
      var extractedCSSText = ''
      for (var i = 0; i < document.styleSheets.length; i++) {
        var s = document.styleSheets[i]

        try {
          if (!s.cssRules) continue
        } catch (e) {
          if (e.name !== 'SecurityError') throw e // for Firefox
          continue
        }

        var cssRules = s.cssRules
        for (var r = 0; r < cssRules.length; r++) {
          if (contains(cssRules[r].selectorText, selectorTextArr)) extractedCSSText += cssRules[r].cssText
        }
      }
      return extractedCSSText

      function contains (str, arr) {
        return arr.indexOf(str) !== -1
      }
    }

    function appendCSS (cssText, element) {
      var styleElement = document.createElement('style')
      styleElement.setAttribute('type', 'text/css')
      styleElement.innerHTML = cssText
      var refNode = element.hasChildNodes() ? element.children[0] : null
      element.insertBefore(styleElement, refNode)
    }
  }

  svgString2Image (svgString, width, height, format, callback) {
    format = format || 'png'

    var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString))) // Convert SVG string to data URL

    var canvas = document.createElement('canvas')
    var context = canvas.getContext('2d')

    canvas.width = width
    canvas.height = height

    var image = new Image()
    image.onload = function () {
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      canvas.toBlob(function (blob) {
        if (blob) {
          if (callback) callback(blob, null)
        } else {
          // console.log('no blob')
        }
      }, 'image/jpeg', 0.9)
    }

    image.src = imgsrc
  }

  // PRIVATE FUNCTIONS

  // General Functions
  /**
   * Creates heatmap object and estimates row/col label sizes.
   * @param {String} direction Horizontal, vertical, or both.
   * @param {Number} ndx The index to start rendering the graphic from (see heatmap.js for index map).
   */
  renderHeatmapFrom (direction, ndx, creation) {
    var self = this
    return new Promise(function (resolve, reject) {
      var horizontal = (direction === 'horizontal')
      var vertical = (direction === 'vertical')
      if (vertical) ndx-- // aligns vertical and horizontal -- if both, use horizontal scale
      self.canvas(creation).then(function () {
        if (ndx < 1 && !horizontal) {
          self.titleLabel()
        }
      }).then(function () {
        if (ndx < 2) {
          if (horizontal) {
            self.rowDendrogram()
          } else if (vertical) {
            self.colDendrogram()
          } else {
            self.rowDendrogram()
            self.colDendrogram()
          }
        }
      }).then(function () {
        if (ndx < 3) {
          self.heatmap()
        }
      }).then(function () {
        if (ndx < 4) {
          if (horizontal) {
            self.rowLabels()
          } else if (vertical) {
            self.colLabels()
          } else {
            self.rowLabels()
            self.colLabels()
          }
        }
      }).then(function () {
        if (ndx < 5) {
          if (horizontal) {
            self.rowAxisLabel()
            self.colorScale()
          } else if (vertical) {
            self.colAxisLabel()
          } else {
            self.rowAxisLabel()
            self.colAxisLabel()
            self.colorScale()
          }
        }
      }).then(function () {
        resolve(null)
      }).catch((error) => {
        reject(error)
      })
    })
  }
  /**
   * Creates heatmap object and estimates row/col label sizes.
   * @param {Object} payload Data object for creating new heatmap.js object
   */
  createHTMP (payload, settings) {
    settings = settings || null
    var self = this
    return new Promise(function (resolve, reject) {
      if (settings === null) {
        self.heatmapObject = new HeatmapObject(payload)
        resolve(null)
      } else {
        self.svg = self.d3.select(self.parent).append('svg')
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
          .text(function (d) {
            return d
          })
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
          .text(function (d) {
            return d
          })
          .each(function (d, i) {
            var thisSize = this.getComputedTextLength()
            if (thisSize > height) height = thisSize
            this.remove() // remove them just after displaying them
          })
        payload.rowLabels.width = width
        payload.colLabels.height = height
        self.heatmapObject = {}
        self.heatmapObject = new HeatmapObject(payload, settings)
        resolve(null)
      }
    })
  }

  // D3.js Component Blocks
  /**
   * Establishes an SVG canvas.
   * @param {Boolean} creation Whether the heatmap is being created or updated.
   */
  canvas (creation) {
    var self = this
    return new Promise(function (resolve, reject) {
      if (creation) {
        // new canvas
        self.d3.select(self.parent).selectAll('*').remove()
        let w = self.heatmapObject.spacingTill('horizontal')
        let h = self.heatmapObject.spacingTill('vertical')
        self.svg = self.d3.select(self.parent)
          .append('svg')
          .attr('class', 'canvas')
          .attr('width', w)
          .attr('height', h)
          .style('background-color', 'white')
        resolve(null)
      } else {
        // updating existing canvas
        let w = self.heatmapObject.spacingTill('horizontal')
        let h = self.heatmapObject.spacingTill('vertical')
        self.d3.select(self.parent)
          .select('svg')
          .transition()
          .attr('width', w)
          .attr('height', h)
        resolve(null)
      }
    })
  }
  /**
   * Draws a row dendrogram to the left of the heatmap.
   */
  rowDendrogram () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.clustering.type === 'b' || self.heatmapObject.settings.clustering.type === 'r') {
        let xTransform = self.heatmapObject.spacingTill('horizontal', 'margin1')
        let yTransform = self.heatmapObject.spacingTill('vertical', 'tree')
        let rowRoot = self.d3.hierarchy(self.heatmapObject.data.rowTree)
        let width = self.heatmapObject.appearance.clustering.row.size
        let height = self.heatmapObject.appearance.heatmap.height
        var rowCluster = self.d3.cluster()
          .size([height, width])
        if (self.svg.select('.rtree').empty()) {
          let rTree = self.svg.append('svg')
            .attr('class', 'rtree')
            .attr('style', 'pointer-events: bounding-box;')
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)
            .datum([{'selected': null}])
            .on('mouseover', function (d) {
              if (self.svg.select('.rowTreeRect').empty()) {
                let box = self.d3.select('.rtree')
                let x = box.attr('x')
                let y = box.attr('y')
                let w = box.attr('width')
                let h = box.attr('height')
                self.svg.append('rect')
                  .attr('class', 'rowTreeRect')
                  .attr('x', x)
                  .attr('y', y)
                  .attr('height', h)
                  .attr('width', w)
                  .style('stroke', 'none')
                  .style('fill', 'none')
                  .style('stroke-width', 2)
                  .style('stroke-opacity', 0.7)
                  .style('fill-opacity', 0.3)
                  .lower()
              }
              let editor = self.d3.select('.rowTreeEditor')
              if (editor.classed('inactiveTool') && d.selected) d.selected = false
              let fillColor = ''
              if (d.selected) fillColor = 'yellow'
              else fillColor = 'none'
              self.d3.select('.rowTreeRect')
                .transition()
                .duration(200)
                .style('stroke', 'black')
                .style('fill', fillColor)
            })
            .on('mouseout', function (d) {
              self.d3.select('.rowTreeRect')
                .transition()
                .duration(200)
                .style('stroke', 'none')
            })
            .on('dblclick', function (d) {
              d.selected = d.selected || false
              if (!d.selected) {
                self.d3.select('.selectedRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.rowTreeRect')
                  .classed('selectedRect', true)
                  .transition()
                  .duration(200)
                  .style('fill', 'yellow')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.rowTreeEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              } else {
                self.d3.select('.rowTreeRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.marginsEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              }
              d.selected = !d.selected
            })
          rTree.selectAll('.rlink')
            .data(rowCluster(rowRoot).links())
            .enter()
            .append('path')
            .attr('class', 'rlink')
            .attr('d', function (d, i) {
              return ('M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y)
            })
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-width', '1.5px')
            .style('pointer-events', 'none')
            .style('user-select', 'none')
          rTree.selectAll('.rnode')
            .data(rowCluster(rowRoot))
            .enter().append('g')
            .attr('class', 'rnode')
            .attr('x', function (d) {
              return d.x
            })
            .attr('y', function (d) {
              return d.y
            })
            .style('pointer-events', 'none')
            .style('user-select', 'none')
          resolve(null)
        } else {
          let rTree = self.svg.select('.rtree')
            .transition()
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)

          rTree.selectAll('.rlink')
            .transition()
            .attr('d', function (d, i) {
              return 'M' + (d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y)
            })
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-width', '1.5px')
          rTree.selectAll('.rnode')
            .transition()
            .attr('x', function (d) {
              return d.x
            })
            .attr('y', function (d) {
              return d.y
            })
          self.d3.select('.rowTreeRect')
            .transition()
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)
          resolve(null)
        }
      } else resolve(null)
    })
  }
  /**
   * Draws a column dendrogram on top of the heatmap.
   */
  colDendrogram () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.clustering.type === 'b' || self.heatmapObject.settings.clustering.type === 'c') {
        let xTransform = self.heatmapObject.spacingTill('vertical', 'title')
        let yTransform = self.heatmapObject.spacingTill('horizontal', 'tree')
        let width = self.heatmapObject.appearance.clustering.col.size
        let height = self.heatmapObject.appearance.heatmap.width
        let colRoot = self.d3.hierarchy(self.heatmapObject.data.colTree)
        let colCluster = self.d3.cluster()
          .size([height, width])
        let data = colCluster(colRoot)
        if (self.svg.select('.ctree').empty()) {
          let cTree = self.svg.append('g')
            .attr('transform', 'rotate(90), scale(1,-1)')
            .append('svg')
            .attr('class', 'ctree')
            .attr('style', 'pointer-events: bounding-box;')
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)
            .datum([{'selected': null}])
            .on('mouseover', function (d) {
              if (self.svg.select('.colTreeRect').empty()) {
                let box = self.d3.select('.ctree')
                let x = box.attr('x')
                let y = box.attr('y')
                let w = box.attr('width')
                let h = box.attr('height')
                self.svg.append('rect')
                  .attr('class', 'colTreeRect')
                  .attr('transform', 'rotate(90), scale(1,-1)')
                  .attr('x', x)
                  .attr('y', y)
                  .attr('width', w)
                  .attr('height', h)
                  .style('stroke', 'none')
                  .style('fill', 'none')
                  .style('stroke-width', 2)
                  .style('stroke-opacity', 0.7)
                  .style('fill-opacity', 0.3)
                  .lower()
              }
              let editor = self.d3.select('.colTreeEditor')
              if (editor.classed('inactiveTool') && d.selected) d.selected = false
              let fillColor = ''
              if (d.selected) fillColor = 'yellow'
              else fillColor = 'none'
              self.d3.select('.colTreeRect')
                .transition()
                .duration(200)
                .style('stroke', 'black')
                .style('fill', fillColor)
            })
            .on('mouseout', function (d) {
              self.d3.select('.colTreeRect')
                .transition()
                .duration(200)
                .style('stroke', 'none')
            })
            .on('dblclick', function (d) {
              d.selected = d.selected || false
              if (!d.selected) {
                self.d3.select('.selectedRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.colTreeRect')
                  .classed('selectedRect', true)
                  .transition()
                  .duration(200)
                  .style('fill', 'yellow')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.colTreeEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              } else {
                self.d3.select('.colTreeRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.marginsEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              }
              d.selected = !d.selected
            })
          cTree.selectAll('.clink')
            .data(data.links())
            .enter().append('path')
            .attr('class', 'clink')
            .attr('d', function (d, i) {
              return ('M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y)
            })
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-width', '1.5px')
            .style('pointer-events', 'none')
            .style('user-select', 'none')
          cTree.selectAll('.cnode')
            .data(data)
            .enter().append('g')
            .attr('class', 'cnode')
            .attr('x', function (d) {
              return d.x
            })
            .attr('y', function (d) {
              return d.y
            })
            .style('pointer-events', 'none')
            .style('user-select', 'none')
          resolve(null)
        } else {
          let cTree = self.svg.select('.ctree')
            .transition()
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)

          cTree.selectAll('.clink')
            .transition()
            .attr('d', function (d, i) {
              return ('M' + d.source.y + ',' + d.source.x + 'V' + d.target.x + 'H' + d.target.y)
            })
            .style('fill', 'none')
            .style('stroke', '#ccc')
            .style('stroke-width', '1.5px')

          cTree.selectAll('.cnode')
            .transition()
            .attr('x', function (d) {
              return d.x
            })
            .attr('y', function (d) {
              return d.y
            })
          self.d3.select('.colTreeRect')
            .transition()
            .attr('x', xTransform)
            .attr('y', yTransform)
            .attr('width', width)
            .attr('height', height)
          resolve(null)
        }
      } else resolve(null)
    })
  }
  /**
   * Draws a heatmap.
   */
  heatmap () {
    var self = this
    return new Promise(function (resolve, reject) {
      let hSpace = self.heatmapObject.spacingTill('horizontal', 'tree')
      let vSpace = self.heatmapObject.spacingTill('vertical', 'tree')
      let size = self.heatmapObject.appearance.heatmap.cellSize
      let width = self.heatmapObject.appearance.heatmap.width
      let height = self.heatmapObject.appearance.heatmap.height
      if (self.svg.select('.htmpSVG').empty()) {
        // let colors = ['#0084FF', '#188EF7', '#3199EF', '#49A4E8', '#62AFE0', '#7ABAD9', '#93C5D1', '#ABD0C9', '#C4DBC2', '#DCE6BA', '#F5F1B3', '#F5DBA3', '#F6C694', '#F6B085', '#F79B76', '#F78667', '#F87057', '#F85B48', '#F94539', '#F9302A', '#FA1B1B']
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
        /* let middle = self.d3.median(matrix, function (d) {
          return d.value
        }) */
        // let colorScale = self.d3.scaleQuantile([min, middle, max])
        self.svg.append('svg')
          .attr('class', 'htmpSVG')
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .selectAll('.cellg')
          .data(matrix, function (d) {
            return d.row + ':' + d.col
          })
          .enter()
          .append('rect')
          .attr('x', function (d) {
            return (d.col * size)
          })
          .attr('y', function (d) {
            return (d.row * size)
          })

          .attr('class', function (d) {
            return 'cell cell-border cr' + d.row + ' cc' + d.col
          })
          .attr('width', size)
          .attr('height', size)
          .style('fill', function (d) {
            let shift = d.value - min
            let norm = shift / (max - min)
            let val
            switch (self.heatmapObject.settings.colorScheme.type) {
              case 'BrBG':
                val = self.d3.interpolateBrBG(norm)
                break
              case 'PiYG':
                val = self.d3.interpolatePiYG(norm)
                break
              case 'RdGy':
                val = self.d3.interpolateRdGy(norm)
                break
              default:
                val = self.d3.interpolateRdBu(norm)
                break
            }
            return val
          })
          .on('mouseover', function (d) {
            self.d3.select(this).classed('cell-hover', true)
              .style('stroke', '#ff0000')
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
                'Column: ' + self.heatmapObject.data.colLabels.data[d.col] + '<br>Row: ' + self.heatmapObject.data.rowLabels.data[d.row] +
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
        self.svg.select('.htmpSVG')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .selectAll('rect')
          .attr('x', function (d) {
            return (d.col * size)
          })
          .attr('y', function (d) {
            return (d.row * size)
          })
          .attr('width', size)
          .attr('height', size)
        resolve(null)
      }
    })
  }
  /**
   * Draws row labels to the right of the heatmap.
   */
  rowLabels () {
    var self = this
    return new Promise(function (resolve, reject) {
      let size = self.heatmapObject.appearance.heatmap.cellSize
      let space = size / 2
      let hSpace = self.heatmapObject.spacingTill('horizontal', 'heatmap') + self.heatmapObject.appearance.rowAxis.labels.padding.left
      let vSpace = self.heatmapObject.spacingTill('vertical', 'tree')
      let width = self.heatmapObject.appearance.rowAxis.labels.width
      let height = self.heatmapObject.appearance.heatmap.height

      if (self.svg.select('.rowLabels').empty()) {
        self.svg.append('svg')
          .attr('class', 'rowLabels')
          .attr('style', 'pointer-events: bounding-box;')
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .datum([{'selected': null}])
          .on('mouseover', function (d) {
            if (self.svg.select('.rowLabelRect').empty()) {
              let box = self.d3.select('.rowLabels')
              let x = box.attr('x')
              let y = box.attr('y')
              let w = box.attr('width')
              let h = box.attr('height')
              self.svg.append('rect')
                .attr('class', 'rowLabelRect')
                .attr('x', x)
                .attr('y', y)
                .attr('height', h)
                .attr('width', w)
                .style('stroke', 'none')
                .style('fill', 'none')
                .style('stroke-width', 2)
                .style('stroke-opacity', 0.7)
                .style('fill-opacity', 0.3)
                .lower()
            }
            let editor = self.d3.select('.rowLabelEditor')
            if (editor.classed('inactiveTool') && d.selected) d.selected = false
            let fillColor = ''
            if (d.selected) fillColor = 'yellow'
            else fillColor = 'none'
            self.d3.select('.rowLabelRect')
              .transition()
              .duration(200)
              .style('stroke', 'black')
              .style('fill', fillColor)
          })
          .on('mouseout', function (d) {
            self.d3.select('.rowLabelRect')
              .transition()
              .duration(200)
              .style('stroke', 'none')
          })
          .on('dblclick', function (d) {
            d.selected = d.selected || false
            if (!d.selected) {
              self.d3.select('.selectedRect')
                .classed('selectedRect', false)
                .transition()
                .duration(200)
                .style('fill', 'none')
              self.d3.select('.rowLabelRect')
                .classed('selectedRect', true)
                .transition()
                .duration(200)
                .style('fill', 'yellow')
              self.d3.select('.editingTray')
                .select('.activeTool')
                .classed('activeTool', false)
                .classed('inactiveTool', true)
                .classed('d-none', true)
              self.d3.select('.editingTray')
                .select('.rowLabelEditor')
                .classed('inactiveTool', false)
                .classed('activeTool', true)
                .classed('d-none', false)
            } else {
              self.d3.select('.rowLabelRect')
                .classed('selectedRect', false)
                .transition()
                .duration(200)
                .style('fill', 'none')
              self.d3.select('.editingTray')
                .select('.activeTool')
                .classed('activeTool', false)
                .classed('inactiveTool', true)
                .classed('d-none', true)
              self.d3.select('.editingTray')
                .select('.marginsEditor')
                .classed('inactiveTool', false)
                .classed('activeTool', true)
                .classed('d-none', false)
            }
            d.selected = !d.selected
          })
          .selectAll('.rowLabelg')
          .data(self.heatmapObject.data.rowLabels.data)
          .enter()
          .append('text')
          .text(function (d) {
            return d
          })
          .style('font-size', 12)
          .attr('x', 0)
          .attr('y', function (d, i) {
            return ((i * size) + space)
          })
          .style('text-anchor', 'start')
          .attr('class', function (d, i) {
            return 'rowLabel mono r' + i
          })
          .style('pointer-events', 'none')
          .style('user-select', 'none')
        resolve(null)
      } else {
        self.svg.select('.rowLabels')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .selectAll('text')
          .attr('x', 0)
          .attr('y', function (d, i) {
            return ((i * size) + space)
          })
        self.d3.select('.rowLabelRect')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
        resolve(null)
      }
    })
  }
  /**
   * Draws column labels underneath the heatmap.
   */
  colLabels () {
    var self = this
    return new Promise(function (resolve, reject) {
      let size = self.heatmapObject.appearance.heatmap.cellSize
      let space = size / 2
      let hSpace = self.heatmapObject.spacingTill('horizontal', 'tree')
      let vSpace = self.heatmapObject.spacingTill('vertical', 'heatmap') + self.heatmapObject.appearance.colAxis.labels.padding.top
      let width = self.heatmapObject.appearance.heatmap.width
      let height = self.heatmapObject.appearance.colAxis.labels.height
      if (self.svg.select('.colLabels').empty()) {
        self.svg.append('svg')
          .attr('class', 'colLabels')
          .attr('style', 'pointer-events: bounding-box;')
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .datum([{'selected': null}])
          .on('mouseover', function (d) {
            if (self.svg.select('.colLabelRect').empty()) {
              let box = self.d3.select('.colLabels')
              let x = box.attr('x')
              let y = box.attr('y')
              let w = box.attr('width')
              let h = box.attr('height')
              self.svg.append('rect')
                .attr('class', 'colLabelRect')
                .attr('x', x)
                .attr('y', y)
                .attr('height', h)
                .attr('width', w)
                .style('stroke', 'none')
                .style('fill', 'none')
                .style('stroke-width', 2)
                .style('stroke-opacity', 0.7)
                .style('fill-opacity', 0.3)
                .lower()
            }
            let editor = self.d3.select('.colLabelEditor')
            if (editor.classed('inactiveTool') && d.selected) d.selected = false
            let fillColor = ''
            if (d.selected) fillColor = 'yellow'
            else fillColor = 'none'
            self.d3.select('.colLabelRect')
              .transition()
              .duration(200)
              .style('stroke', 'black')
              .style('fill', fillColor)
          })
          .on('mouseout', function (d) {
            self.d3.select('.colLabelRect')
              .transition()
              .duration(200)
              .style('stroke', 'none')
          })
          .on('dblclick', function (d) {
            d.selected = d.selected || false
            if (!d.selected) {
              self.d3.select('.selectedRect')
                .classed('selectedRect', false)
                .transition()
                .duration(200)
                .style('fill', 'none')
              self.d3.select('.colLabelRect')
                .classed('selectedRect', true)
                .transition()
                .duration(200)
                .style('fill', 'yellow')
              self.d3.select('.editingTray')
                .select('.activeTool')
                .classed('activeTool', false)
                .classed('inactiveTool', true)
                .classed('d-none', true)
              self.d3.select('.editingTray')
                .select('.colLabelEditor')
                .classed('inactiveTool', false)
                .classed('activeTool', true)
                .classed('d-none', false)
            } else {
              self.d3.select('.colLabelRect')
                .classed('selectedRect', false)
                .transition()
                .duration(200)
                .style('fill', 'none')
              self.d3.select('.editingTray')
                .select('.activeTool')
                .classed('activeTool', false)
                .classed('inactiveTool', true)
                .classed('d-none', true)
              self.d3.select('.editingTray')
                .select('.marginsEditor')
                .classed('inactiveTool', false)
                .classed('activeTool', true)
                .classed('d-none', false)
            }
            d.selected = !d.selected
          })
          .append('g')
          .attr('class', 'colLabelRot')
          .attr('transform', 'rotate (270)')
          .selectAll('.colLabelg')
          .data(self.heatmapObject.data.colLabels.data)
          .enter()
          .append('text')
          .text(function (d) {
            return d
          })
          .style('text-anchor', 'end')
          .style('font-size', 12)
          .attr('x', 0)
          .attr('y', function (d, i) {
            return ((i * size) + space)
          })
          .attr('class', function (d, i) {
            return 'colLabel mono c' + i
          })
          .style('pointer-events', 'none')
          .style('user-select', 'none')

        resolve(null)
      } else {
        self.svg.select('.colLabels')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
          .selectAll('text')
          .attr('x', 0)
          .attr('y', function (d, i) {
            return ((i * size) + space)
          })
        self.svg.select('.colLabelRot')
          .transition()
          .attr('transform', 'rotate (270)')
        self.d3.select('.colLabelRect')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
          .attr('width', width)
          .attr('height', height)
        resolve(null)
      }
    })
  }
  /**
   * Draws a title label above the heatmap.
   */
  titleLabel () {
    console.log(this.heatmapObject.settings)
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.title !== '') {
        let hSpace = self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2)
        let vSpace = self.heatmapObject.spacingTill('vertical', 'margin1')
        if (self.svg.select('.titleLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'titleLabel')
            .style('pointer-events', 'bounding-box')
            .attr('text-anchor', 'middle')
            .attr('x', hSpace)
            .attr('y', vSpace)
            .style('font-size', 16)
            .datum([{'selected': null}])
            .on('mouseover', function (d) {
              if (self.svg.select('.titleLabelRect').empty()) {
                let box = self.d3.select('.titleLabel').node().getBBox()
                let x = box.x
                let y = box.y
                let w = box.width
                let h = box.height
                self.svg.append('rect')
                  .attr('class', 'titleLabelRect')
                  .attr('x', x)
                  .attr('y', y)
                  .attr('width', w)
                  .attr('height', h)
                  .style('stroke', 'none')
                  .style('fill', 'none')
                  .style('stroke-width', 2)
                  .style('stroke-opacity', 0.7)
                  .style('fill-opacity', 0.3)
                  .lower()
              }
              let editor = self.d3.select('.titleEditor')
              if (editor.classed('inactiveTool') && d.selected) d.selected = false
              let fillColor = ''
              if (d.selected) fillColor = 'yellow'
              else fillColor = 'none'
              self.d3.select('.titleLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'black')
                .style('fill', fillColor)
            })
            .on('mouseout', function (d) {
              self.d3.select('.titleLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'none')
            })
            .on('dblclick', function (d) {
              d.selected = d.selected || false
              if (!d.selected) {
                self.d3.select('.selectedRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.titleLabelRect')
                  .classed('selectedRect', true)
                  .transition()
                  .duration(200)
                  .style('fill', 'yellow')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.titleEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              } else {
                self.d3.select('.titleLabelRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.marginsEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              }
              d.selected = !d.selected
            })
            .text(self.heatmapObject.settings.title)
            .style('user-select', 'none')
          resolve(null)
        } else {
          self.svg.select('.titleLabel')
            .transition()
            .attr('x', self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2))
            .attr('y', self.heatmapObject.spacingTill('vertical', 'margin1'))
          let box = self.d3.select('.titleLabel').node().getBBox()
          let w = box.width
          let h = box.height
          self.svg.select('.titleLabelRect')
            .transition()
            .attr('x', hSpace - (w / 2))
            .attr('y', vSpace - (3 * h / 4))
            .attr('width', w)
            .attr('height', h)
          resolve(null)
        }
      } else resolve(null)
    })
  }
  /**
   * Draws a title for the row axis to the right of the heatmap.
   */
  rowAxisLabel () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.rowAxis !== '') {
        let hSpace = -(self.heatmapObject.spacingTill('vertical', 'tree') + (self.heatmapObject.appearance.heatmap.height / 2))
        let vSpace = self.heatmapObject.spacingTill('horizontal', 'labels') + self.heatmapObject.appearance.rowAxis.title.padding.left
        if (self.svg.select('.rowAxisLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'rowAxisLabel')
            .style('pointer-events', 'bounding-box')
            .attr('text-anchor', 'middle')
            .attr('x', hSpace)
            .attr('y', vSpace)
            .attr('transform', 'rotate(-90)')
            .datum([{'selected': null}])
            .on('mouseover', function (d) {
              if (self.svg.select('.rowAxisLabelRect').empty()) {
                let box = self.d3.select('.rowAxisLabel').node().getBBox()
                let x = box.x
                let y = box.y
                let w = box.width
                let h = box.height
                self.svg.append('rect')
                  .attr('class', 'rowAxisLabelRect')
                  .attr('transform', 'rotate(-90)')
                  .attr('x', x)
                  .attr('y', y)
                  .attr('height', h)
                  .attr('width', w)
                  .style('stroke', 'none')
                  .style('fill', 'none')
                  .style('stroke-width', 2)
                  .style('stroke-opacity', 0.7)
                  .style('fill-opacity', 0.3)
                  .lower()
              }
              let editor = self.d3.select('.rowAxisEditor')
              if (editor.classed('inactiveTool') && d.selected) d.selected = false
              let fillColor = ''
              if (d.selected) fillColor = 'yellow'
              else fillColor = 'none'
              self.d3.select('.rowAxisLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'black')
                .style('fill', fillColor)
            })
            .on('mouseout', function (d) {
              self.d3.select('.rowAxisLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'none')
            })
            .on('dblclick', function (d) {
              d.selected = d.selected || false
              if (!d.selected) {
                self.d3.select('.selectedRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.rowAxisLabelRect')
                  .classed('selectedRect', true)
                  .transition()
                  .duration(200)
                  .style('fill', 'yellow')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.rowAxisEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              } else {
                self.d3.select('.rowAxisLabelRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.marginsEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              }
              d.selected = !d.selected
            })
            .text(self.heatmapObject.settings.rowAxis)
            .style('user-select', 'none')
          resolve(null)
        } else {
          self.svg.select('.rowAxisLabel')
            .transition()
            .attr('x', hSpace)
            .attr('y', vSpace)
          let box = self.svg.select('.rowAxisLabel').node().getBBox()
          let w = box.width
          let h = box.height
          // If this breaks once fonts are changeable, consider whether the box Bbox updates fast enough...
          self.svg.select('.rowAxisLabelRect')
            .transition()
            .attr('x', hSpace - (w / 2))
            .attr('y', vSpace - (3 * h / 4))
            .attr('width', w)
            .attr('height', h)
          resolve(null)
        }
      } else resolve(null)
    })
  }
  /**
   * Draws a title for the column axis underneath the heatmap.
   */
  colAxisLabel () {
    var self = this
    return new Promise(function (resolve, reject) {
      if (self.heatmapObject.settings.colAxis !== '') {
        let hSpace = self.heatmapObject.spacingTill('horizontal', 'tree') + (self.heatmapObject.appearance.heatmap.width / 2)
        let vSpace = self.heatmapObject.spacingTill('vertical', 'labels') + self.heatmapObject.appearance.colAxis.title.padding.top
        if (self.svg.select('.colAxisLabel').empty()) {
          self.svg.append('text')
            .attr('class', 'colAxisLabel')
            .style('pointer-events', 'bounding-box')
            .attr('text-anchor', 'middle')
            .attr('x', hSpace)
            .attr('y', vSpace)
            .datum([{'selected': null}])
            .on('mouseover', function (d) {
              if (self.svg.select('.colAxisLabelRect').empty()) {
                let box = self.d3.select('.colAxisLabel').node().getBBox()
                let x = box.x
                let y = box.y
                let w = box.width
                let h = box.height
                self.svg.append('rect')
                  .attr('class', 'colAxisLabelRect')
                  .attr('x', x)
                  .attr('y', y)
                  .attr('height', h)
                  .attr('width', w)
                  .style('stroke', 'none')
                  .style('fill', 'none')
                  .style('stroke-width', 2)
                  .style('stroke-opacity', 0.7)
                  .style('fill-opacity', 0.3)
                  .lower()
              }
              let editor = self.d3.select('.colAxisEditor')
              if (editor.classed('inactiveTool') && d.selected) d.selected = false
              let fillColor = ''
              if (d.selected) fillColor = 'yellow'
              else fillColor = 'none'
              self.d3.select('.colAxisLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'black')
                .style('fill', fillColor)
            })
            .on('mouseout', function (d) {
              self.d3.select('.colAxisLabelRect')
                .transition()
                .duration(200)
                .style('stroke', 'none')
            })
            .on('dblclick', function (d) {
              d.selected = d.selected || false
              if (!d.selected) {
                self.d3.select('.selectedRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.colAxisLabelRect')
                  .classed('selectedRect', true)
                  .transition()
                  .duration(200)
                  .style('fill', 'yellow')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.colAxisEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              } else {
                self.d3.select('.colAxisLabelRect')
                  .classed('selectedRect', false)
                  .transition()
                  .duration(200)
                  .style('fill', 'none')
                self.d3.select('.editingTray')
                  .select('.activeTool')
                  .classed('activeTool', false)
                  .classed('inactiveTool', true)
                  .classed('d-none', true)
                self.d3.select('.editingTray')
                  .select('.marginsEditor')
                  .classed('inactiveTool', false)
                  .classed('activeTool', true)
                  .classed('d-none', false)
              }
              d.selected = !d.selected
            })
            .text(self.heatmapObject.settings.colAxis)
            .style('user-select', 'none')
          resolve(null)
        } else {
          self.svg.select('.colAxisLabel')
            .transition()
            .attr('x', hSpace)
            .attr('y', vSpace)
          let box = self.svg.select('.colAxisLabel').node().getBBox()
          let w = box.width
          let h = box.height
          // If this breaks once fonts are changeable, consider whether the box Bbox updates fast enough...
          self.svg.select('.colAxisLabelRect')
            .transition()
            .attr('x', hSpace - (w / 2))
            .attr('y', vSpace - (3 * h / 4))
            .attr('width', w)
            .attr('height', h)
        }
      } else resolve(null)
    })
  }
  /*
   * Draws color scale beneath figure
   */
  colorScale () {
    var self = this
    return new Promise(function (resolve, reject) {
      let hSpace = self.heatmapObject.spacingTill('horizontal', 'axis') + self.heatmapObject.appearance.scale.padding.left
      let vSpace = self.heatmapObject.spacingTill('vertical', 'tree')
      if (self.svg.select('.colorScale').empty()) {
        let defs = self.svg.append('defs')
        let linearGradient = defs.append('linearGradient').attr('id', 'linear-gradient')
        linearGradient.attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%')
        /*
        let startColor
        let endColor
        switch (self.heatmapObject.settings.colorScheme.type) {
          case 'BrBG':
            startColor = '#543005'
            endColor = '#003c30'
            break
          case 'PiYG':
            startColor = '#8e0152'
            endColor = '#276419'
            break
          case 'RdGy':
            startColor = '#67001f'
            endColor = '#1a1a1a'
            break
          default:
            startColor = '#67001f'
            endColor = '#053061'
            break
        }
        */
        linearGradient.append('stop').attr('offset', '0%').attr('stop-color', '#053061')
        linearGradient.append('stop').attr('offset', '10%').attr('stop-color', '#2166ac')
        linearGradient.append('stop').attr('offset', '20%').attr('stop-color', '#4393c3')
        linearGradient.append('stop').attr('offset', '30%').attr('stop-color', '#92c5de')
        linearGradient.append('stop').attr('offset', '40%').attr('stop-color', '#d1e5f0')
        linearGradient.append('stop').attr('offset', '50%').attr('stop-color', '#f7f7f7')
        linearGradient.append('stop').attr('offset', '60%').attr('stop-color', '#fddbc7')
        linearGradient.append('stop').attr('offset', '70%').attr('stop-color', '#f4a582')
        linearGradient.append('stop').attr('offset', '80%').attr('stop-color', '#d6604d')
        linearGradient.append('stop').attr('offset', '90%').attr('stop-color', '#b2182b')
        linearGradient.append('stop').attr('offset', '100%').attr('stop-color', '#67001f')

        /*
        self.svg.append('text')
          .attr('class', 'highText')
          .attr('text-anchor', 'middle')
          .attr('x', hSpace + self.heatmapObject.appearance.scale.width / 2)
          .attr('y', vSpace)
          .text('1.0')
        self.svg.append('text')
          .attr('class', 'lowText')
          .attr('text-anchor', 'middle')
          .attr('x', hSpace + self.heatmapObject.appearance.scale.width / 2)
          .attr('y', vSpace + 36 + self.heatmapObject.appearance.scale.height)
          .text('-1.0')
         */
        self.svg.append('rect')
          .attr('class', 'colorScale')
          .attr('x', hSpace)
          .attr('y', vSpace + 12)
          .attr('width', self.heatmapObject.appearance.scale.width)
          .attr('height', self.heatmapObject.appearance.scale.height)
          .style('user-select', 'none')
          .style('fill', 'url(#linear-gradient')
        resolve(null)
      } else {
        self.svg.select('.colorScale')
          .transition()
          .attr('x', hSpace)
          .attr('y', vSpace)
        /*
        self.svg.select('.highText')
          .transition()
          .attr('x', hSpace + self.heatmapObject.appearance.scale.width / 2)
          .attr('y', vSpace)
        self.svg.select('.lowText')
          .transition()
          .attr('x', hSpace + self.heatmapObject.appearance.scale.width / 2)
          .attr('y', self.heatmapObject.spacingTill('vertical', 'labels') - 12)
          */
      }
    })
  }
}
