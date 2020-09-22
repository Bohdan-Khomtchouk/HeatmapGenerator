/* eslint-disable no-trailing-spaces */
// Heatmap.js
// Module for encoding all heatmap data in one cohesive object.

export default class Heatmap {
  /**
   * Initialize heatmap object
   * @param {Dictionary} data matrix, rTree, cTree, rLabels, cLabels
   * @param {Dictionary} setup title, rowAxis, colAxis, clustering
   */
  constructor (data, setup) {
    if (setup) {
      this.data = {} // Purely sourced from the data file
      this.settings = {} // Configurations known beforehand (still mutable!)
      this.appearance = {} // Can be modified after the heatmap is generated

      this.data = data
      this.settings = setup

      this.setDefaults()
    } else {
      Object.assign(this, JSON.parse(data))
    }
  }
  /**
   * Configures default appearance settings, can be changed after heatmap is generated.
   */
  setDefaults () {
    this.appearance.heatmap = {}
    this.appearance.heatmap.cellSize = 50
    this.appearance.heatmap.columns = this.data.matrix[0].length
    this.appearance.heatmap.rows = this.data.matrix.length
    this.appearance.heatmap.width = this.appearance.heatmap.cellSize * this.appearance.heatmap.columns
    this.appearance.heatmap.height = this.appearance.heatmap.cellSize * this.appearance.heatmap.rows

    // Main Title
    if (this.settings.title !== '') {
      this.appearance.title = {
        font: {
          size: 16
        },
        padding: {
          bottom: 20
        }
      }
    } else {
      this.appearance.title = {
        font: {
          size: 0
        },
        padding: {
          bottom: 0
        }
      }
    }
    // Row Axis Title
    this.appearance.rowAxis = {}
    if (this.settings.rowAxis !== '') {
      this.appearance.rowAxis.title = {
        font: {
          size: 12
        },
        padding: {
          left: 30
        }
      }
    } else {
      this.appearance.rowAxis.title = {
        font: {
          size: 0
        },
        padding: {
          left: 0
        }
      }
    }
    // Col Axis Title
    this.appearance.colAxis = {}
    if (this.settings.colAxis !== '') {
      this.appearance.colAxis.title = {
        font: {
          size: 10
        },
        padding: {
          top: 30
        }
      }
    } else {
      this.appearance.colAxis.title = {
        font: {
          size: 0
        },
        padding: {
          top: 0
        }
      }
    }
    // Row Labels
    this.appearance.rowAxis.labels = {
      font: {
        size: 10
      },
      padding: {
        left: 15
      },
      width: this.data.rowLabels.width
    }
    // Col Labels
    this.appearance.colAxis.labels = {
      font: {
        size: 10
      },
      padding: {
        top: 15
      },
      height: this.data.colLabels.height
    }
    // Clustering
    var size = [] // Row Size, Col Size
    var padding = [] // Row R, Col T (only between dendrogram and heatmap)
    switch (this.settings.clustering.type) {
      case 'n':
        size = [0, 0]
        padding = [0, 0]
        break
      case 'r':
        size = [100, 0]
        padding = [10, 0]
        break
      case 'c':
        size = [0, 50]
        padding = [0, 10]
        break
      case 'b':
        size = [100, 50]
        padding = [10, 10]
        break
      default:
        size = [0, 0]
        padding = [0, 0]
        break
    }
    this.appearance.clustering = {
      row: {
        size: size[0],
        padding: {
          right: padding[0]
        }
      },
      col: {
        size: size[1],
        padding: {
          bottom: padding[1]
        }
      }
    }

    // Canvas
    this.appearance.margin = {
      left: 50,
      right: 50,
      top: 50,
      bottom: 50
    }
    this.configureComponents()
  }

  /**
   * Initializes and calculates component sizes
   */
  configureComponents () {
    var self = this
    this.components = {}
    this.components.horizontal = {}
    this.components.vertical = {}

    // Layout component 'compositions'
    this.components.horizontal.dictionary =
      {
        margin1: ['margin.left'],
        tree: ['clustering.row.size', 'clustering.row.padding.right'],
        heatmap: ['heatmap.width'],
        labels: ['rowAxis.labels.padding.left', 'rowAxis.labels.width'],
        axis: ['rowAxis.title.padding.left', 'rowAxis.title.font.size'],
        margin2: ['margin.right']
      }
    this.components.vertical.dictionary =
      {
        margin1: ['margin.top'],
        title: ['title.font.size', 'title.padding.bottom'],
        tree: ['clustering.col.size', 'clustering.col.padding.bottom'],
        heatmap: ['heatmap.height'],
        labels: ['colAxis.labels.padding.top', 'colAxis.labels.height'],
        axis: ['colAxis.title.padding.top', 'colAxis.title.font.size'],
        margin2: ['margin.bottom']
      }

    var hKeys = Object.keys(this.components.horizontal.dictionary)
    var vKeys = Object.keys(this.components.vertical.dictionary)

    // Build map so that values can be stored sequentially in array -- should be faster look up?
    this.components.horizontal.map = {}
    this.components.vertical.map = {}
    var _ = require('lodash')

    // Calculate default component size values
    this.components.horizontal.values = []
    this.components.vertical.values = []
    for (let x = 0, l = hKeys.length; x < l; x++) {
      let key = hKeys[x]
      let arr = this.components.horizontal.dictionary[key]
      var htot = 0
      arr.forEach(subComp => {
        htot = htot + _.get(self.appearance, subComp)
      })
      this.components.horizontal.map[key] = x
      this.components.horizontal.values[x] = htot
    }
    for (let y = 0, l = vKeys.length; y < l; y++) {
      let key = vKeys[y]
      let arr = this.components.vertical.dictionary[key]
      var vtot = 0
      arr.forEach(subComp => { vtot += _.get(self.appearance, subComp) })
      this.components.vertical.map[key] = y
      this.components.vertical.values[y] = vtot
    }
  }

  /**
   * Updates all necessary properties for a Heatmap object and recalculates spacing data.
   * @param {Object} comp Direction and name of component
   * @param {String} [prop] Name of property key to change
   * @param {Number} [change] Name of new value
   * @param {Object} comp Alternative component to update (diff from starting comp)
   * If both, can not start from asymmetric component (title)
   *
   */
  updateAppearance (comp, prop, change, callback, altComp) {
    var _ = require('lodash')
    prop = prop || null
    change = change || null
    altComp = altComp || null
    if (prop !== null && change !== null) _.set(this.appearance, prop, change) // only manipulate properties if given
    if (comp.direction === 'both') {
      // Calculate it both ways, but only return the horizontal
      if (altComp) {
        this.recalculateComponentSize(altComp.direction, altComp.name)
        callback(null, this.recalculateComponentSize('horizontal', comp.name))
      } else {
        this.recalculateComponentSize('vertical', comp.name)
        callback(null, this.recalculateComponentSize('horizontal', comp.name))
      }
    } else {
      callback(null, this.recalculateComponentSize(comp.direction, comp.name))
    }
  }

  recalculateComponentSize (direction, name) {
    var _ = require('lodash')
    var self = this
    var index = this.components[direction].map[name]
    var subComps = this.components[direction].dictionary[name]
    var tot = 0
    subComps.forEach(subComp => { tot += _.get(self.appearance, subComp) })
    this.components[direction].values[index] = tot
    return index
  }
  /**
   * Get pixel space occupied
   * @param {String} direction Direction of spacing
   * @param {String} [end] Name of last component to include
   * @param {String} [start] Name of first component to include
   */
  spacingTill (direction, end, start) {
    end = end || 'margin2'
    start = start || 'margin1'
    if (end === start) {
      let index = this.components[direction].map[end]
      return this.components[direction].values[index]
    } else {
      let index1 = this.components[direction].map[start]
      let index2 = this.components[direction].map[end]
      var tot = 0
      for (let s = index1, e = index2 + 1; s < e; s++) {
        tot += this.components[direction].values[s]
      }
      return tot
    }
  }
}
