<template>
    <div class="container-fluid">
        <div class="row heatmapperDiv ml-2 mt-3" style="overflow-x: scroll; overflow-y: scroll;">
            <div class="col-9" id="graphDiv" align="center">
            </div>
            <div id="d3tooltip"><p><span id="value"></span></p></div>
            <div class="col-3">
                <div v-if="appearanceData !== null" class="editingTray container sticky-top pt-2">
                    <div class="marginsEditor activeTool pt-2">
                        <div class="row"><div class="col-12"><p class="editorLabels">Margin Top:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.margin.top" @change="changeMarginTop"></b-form-spinbutton>
                            </div>
                        </div>
                        <div class="row"><div class="col-12"><p class="editorLabels">Margin Bottom:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.margin.bottom" @change="changeMarginBottom"></b-form-spinbutton>
                            </div>
                        </div>
                        <div class="row"><div class="col-12"><p class="editorLabels">Margin Left:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.margin.left" @change="changeMarginLeft"></b-form-spinbutton>
                            </div>
                        </div>
                        <div class="row"><div class="col-12"><p class="editorLabels">Margin Right:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.margin.right" @change="changeMarginRight"></b-form-spinbutton>
                            </div>
                        </div>
                    </div>
                    <div class="rowLabelEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Row Label Padding Left:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.rowAxis.labels.padding.left" @change="changeRowLabelPaddingLeft"></b-form-spinbutton>
                            </div>
                        </div>
                        <!--<div class="row"><div class="col-12"><p class="editorLabels">Row Label Font Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.rowAxis.labels.font.size" @change="changeRowLabelFontSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="colLabelEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Col Label Padding Top:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.colAxis.labels.padding.top" @change="changeColLabelPaddingTop"></b-form-spinbutton>
                            </div>
                        </div>
                        <!--<div class="row"><div class="col-12"><p class="editorLabels">Col Label Font Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.colAxis.labels.font.size" @change="changeColLabelFontSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="rowTreeEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Row Tree Padding Right:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.clustering.row.padding.right" @change="changeRowDendrogramPaddingRight"></b-form-spinbutton>
                            </div>
                        </div>
                        <!-- <div class="row"><div class="col-12"><p class="editorLabels">Row Tree Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.clustering.row.size" @change="changeRowDendrogramSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="colTreeEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Col Tree Padding Bottom:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.clustering.col.padding.bottom" @change="changeColDendrogramPaddingBottom"></b-form-spinbutton>
                            </div>
                        </div>
                        <!-- <div class="row"><div class="col-12"><p class="editorLabels">Col Tree Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.clustering.col.size" @change="changeColDendrogramSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="rowAxisEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Row Axis Padding Left:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.rowAxis.title.padding.left" @change="changeRowAxisTitlePaddingLeft"></b-form-spinbutton>
                            </div>
                        </div>
                        <!-- <div class="row"><div class="col-12"><p class="editorLabels">Row Axis Font Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.rowAxis.title.font.size" @change="changeRowAxisTitleFontSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="colAxisEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Col Axis Padding Top:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.colAxis.title.padding.top" @change="changeColAxisTitlePaddingTop"></b-form-spinbutton>
                            </div>
                        </div>
                        <!--<div class="row"><div class="col-12"><p class="editorLabels">Col Axis Font Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.colAxis.title.font.size" @change="changeColAxisTitleFontSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                    <div class="titleEditor inactiveTool d-none pt-4">
                        <div class="row"><div class="col-12"><p class="editorLabels">Title Padding Bottom:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.title.padding.bottom" @change="changeTitleLabelPaddingBottom"></b-form-spinbutton>
                            </div>
                        </div>
                        <!--<div class="row"><div class="col-12"><p class="editorLabels">Title Font Size:</p></div></div>
                        <div class="row">
                            <div class="col-12">
                                <b-form-spinbutton v-model="appearanceData.title.font.size" @change="changeTitleLabelFontSize"></b-form-spinbutton>
                            </div>
                        </div> -->
                    </div>
                </div>
            </div>
        </div>
        <div class="row mx-0 px-0 mt-2">
          <div class="col-12 px-4 mt-0">
            <p class="instruction-text pt-2">The editor allows you to interact with your heatmap figure in real time.
              Hover over individual cells to pull up associated data values. If an element has a black outline upon hovering,
            you can double click to view its properties in the editing tray to the right of the visualization. The element
            currently being inspected will be highlighted. To deselect an element, double click on the highlighted component. </p>
          </div>
        </div>
        <div class="navigationFooter m-0 p-0">
          <div class="viewContainer row pt-2">
            <div class="col-12">
              <b-button variant="outline-primary" class="float-right" style="width: 70px" @click="exportToGraphic" size="sm">Export</b-button>
              <b-button variant="primary" class="float-right mr-2" style="width: 70px" @click="saveHeatmapFile" size="sm">Save</b-button>
            </div>
          </div>
        </div>
    </div>
</template>
<style>
    .activeTool {
        visibility: visible;
    }
    .inactiveTool {
        visibility: hidden;
    }
    .heatmapperDiv {
      border-top: 1px solid #e2e2e2;
      border-left: 1px solid #e2e2e2;
      height: calc(100vh - 200px);
    }
    .editorLabels {
      color: black;
      font-size: 13px;
      margin-top: 10px;
      margin-bottom: 2px;
    }
</style>
<script>
  import Heatmapper from '../custom/Heatmapper.js'

  export default {
    name: 'Generator',
    props: {
      filePath: {
        type: String
      },
      settings: {
        type: Object
      }
    },
    mounted: function () {
      if (this.settings.fileType === 'new') {
        this.generateHeatmap()
      } else {
        this.loadExistingHeatmap()
      }
    },
    watch: {
      settings: function () {
        if (this.settings.fileType === 'new') {
          this.generateHeatmap()
        } else {
          this.loadExistingHeatmap()
        }
      }
    },
    data: () => {
      return {
        heatmapGenerated: false,
        saveFileName: '',
        fileObj: null,
        isLoading: false,
        htmp: null,
        appearanceData: null,
        clusteringProgress: null
      }
    },
    methods: {
      // UI ACTIONS
      loadExistingHeatmap: function () {
        let self = this
        self.clusteringProgress = 0
        self.htmp = new Heatmapper('#graphDiv')
        self.clusteringProgress = 20
        self.htmp.loadFromFile(self.filePath).then(function (data) {
          self.clusteringProgress = 40
          return self.htmp.createHTMP(data)
        }).then(function () {
          self.clusteringProgress = 60
          return self.htmp.renderHeatmapFrom('both', 0, true)
        }).then(function () {
          self.clusteringProgress = 80
          self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
          self.clusteringProgress = 100
          let setupData = self.htmp.heatmapObject.settings
          setupData.fileType = 'existing'
          self.mainTitle = setupData.title
          self.rowAxis = setupData.rowAxis
          self.colAxis = setupData.colAxis
          self.clusteringType = setupData.clustering.type
          self.distanceType = setupData.clustering.distType
          self.linkageType = setupData.clustering.linkType
          self.heatmapGenerated = true
        }).catch((error) => {
          if (error) console.log(error)
        })
      },
      generateHeatmap: function () {
        this.isLoading = true
        this.clusteringProgress = 2
        if (this.htmp != null) document.getElementById('graphDiv').innerHTML = ''
        var self = this
        if (this.htmp === null) this.htmp = new Heatmapper('#graphDiv')
        let options = this.settings
        if (options.clustering.type === 'n') {
          // No clustering
          this.htmp.parse(this.filePath).then(result => {
            self.clusteringProgress = 30
            return self.htmp.process(result)
          }).then(payload => {
            self.clusteringProgress = 60
            return self.htmp.createHTMP(payload, options)
          }).then(() => {
            self.clusteringProgress = 85
            return self.htmp.renderHeatmapFrom('both', 0, true)
          }).then(() => {
            self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
            self.clusteringProgress = 100
          }).catch((error) => {
            console.log(error)
          })
        } else {
          // Clustering
          this.htmp.parse(this.filePath).then(matrix => {
            self.clusteringProgress = 5
            return self.htmp.estimateClusteringLoad(matrix)
          }).then(result => {
            self.clustEst = result
            console.log('estimated time: ' + result)
            if (result > 30) {
              const {dialog} = require('electron').remote
              let decision = dialog.showMessageBoxSync({
                type: 'warning',
                title: 'Large Dataset',
                message: 'This dataset may take well over 30s to cluster, and might not fit within your system\'s memory specs. Are you sure you want to proceed?',
                detail: 'HMG2.0 may run slow due to system-specific limitations. Fastheatmap may be a better option for large dataset clustering.',
                buttons: ['Cancel', 'Cluster'],
                defaultId: 1
              })
              if (decision === 0) return Promise.reject(new Error('aborted'))
              else if (decision === 1) {
                self.clusteringProgress = 20
                let interval = self.clustEst * 1000 / 60
                self.progressInterval = setInterval(function () {
                  if (self.clusteringProgress < 80) self.clusteringProgress += 1
                }, interval)
                return Promise.resolve()
              } else {
                // Fastheatmap -- can't cluster?????
                const urls = [
                  'http://www.fastheatmap.com'
                ]
                var { BrowserWindow } = require('electron').remote
                var win = new BrowserWindow({
                  center: true,
                  title: 'Fastheatmap',
                  resizable: true,
                  backgroundColor: 'white',
                  webPreferences: {
                    nodeIntegration: false,
                    show: false
                  }
                })
                win.loadURL(urls[0])
                win.once('ready-to-show', () => {
                  win.show()
                })

                win.on('closed', () => {
                  win = null
                })
                return Promise.reject(new Error('Using fastheatmap'))
              }
            }
          }).then(() => {
            return self.htmp.cluster(self.filePath, options)
          }).then(payload => {
            clearInterval(self.progressInterval)
            self.clustEst = null
            self.clusteringProgress = 80
            return self.htmp.createHTMP(payload, options)
          }).then(() => {
            self.clusteringProgress = 90
            return self.htmp.renderHeatmapFrom('both', 0, true)
          }).then(() => {
            self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
            self.clusteringProgress = 100
          }).catch((error) => {
            self.progressInterval = null
            self.clustEst = null
            self.clusteringProgress = null
            self.heatmapGenerated = false
            self.isLoading = false
            alert(error.toString())
          })
        }
      },
      saveHeatmapFile () {
        var self = this
        const { dialog } = require('electron').remote
        dialog.showSaveDialog({
          buttonLabel: 'Save',
          properties: ['createDirectory'],
          showsTagField: false,
          filters: [ {name: 'Heatmap Data', extensions: ['htmp']} ]
        }).then((obj) => {
          if (!obj.canceled) {
            var savePath = obj.filePath
            self.htmp.saveHeatmapFile(savePath, (err) => {
              if (err) {
                alert(err)
              } else {
                alert('File saved.')
                self.fileType = 'existing'
                self.filePath = savePath
              }
            })
          }
        })
      },
      exportToGraphic () {
        this.htmp.exportHeatmapFile((err) => {
          if (err) alert(err)
        })
      },
      // UTILITY FUNCTIONS
      resetGUI () {
        document.getElementById('graphDiv').innerHTML = ''
        this.heatmapGenerated = false
        this.isLoading = false
        clearInterval(this.progressInterval)
        this.clusteringProgress = null
        var heatmapSetupDiv = document.getElementById('collapse-1')
        if (heatmapSetupDiv !== null) {
          if (!heatmapSetupDiv.classList.contains('show')) {
            this.$root.$emit('bv::toggle::collapse', 'collapse-1')
          }
        }
      },
      configureEditorDefaults (appearance) {
        this.appearanceData = appearance
        this.heatmapGenerated = true
        this.isLoading = false
      },
      // EDITOR TRAY FUNCTIONS
      //    Margins
      changeMarginTop () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'margin.top', this.appearanceData.margin.top)
      },
      changeMarginBottom () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin2', direction: 'vertical'}, 'margin.bottom', this.appearanceData.margin.bottom)
      },
      changeMarginLeft () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'margin.left', this.appearanceData.margin.left)
      },
      changeMarginRight () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin2', direction: 'horizontal'}, 'margin.right', this.appearanceData.margin.right)
      },
      //    Row Labels
      changeRowLabelPaddingLeft () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'labels', direction: 'horizontal'}, 'rowAxis.labels.padding.left', this.appearanceData.rowAxis.labels.padding.left)
      },
      changeRowLabelFontSize () {
        // Row Label and Col Label changes will need to be calculated, might not fit normal paradigm, also need to make font variable based
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'rowAxis.labels.font.size', this.appearanceData.rowAxis.labels.font.size)
      },
      //    Col Labels
      changeColLabelPaddingTop () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'labels', direction: 'vertical'}, 'colAxis.labels.padding.top', this.appearanceData.colAxis.labels.padding.top)
      },
      changeColLabelFontSize () {
        // Row Label and Col Label changes will need to be calculated, might not fit normal paradigm, also need to make font variable based
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'colAxis.labels.font.size', this.appearanceData.colAxis.labels.font.size)
      },
      //    Row Dendrograms
      changeRowDendrogramPaddingRight () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'clustering.row.padding.right', this.appearanceData.clustering.row.padding.right, {name: 'tree', direction: 'horizontal'})
      },
      changeRowDendrogramSize () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'clustering.row.size', this.appearanceData.clustering.row.size, {name: 'tree', direction: 'horizontal'})
      },
      //    Col Dendrograms
      changeColDendrogramPaddingBottom () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'tree', direction: 'both'}, 'clustering.col.padding.bottom', this.appearanceData.clustering.col.padding.bottom)
      },
      changeColDendrogramSize () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'tree', direction: 'both'}, 'clustering.col.size', this.appearanceData.clustering.col.size)
      },
      //    Row Axis Title
      changeRowAxisTitlePaddingLeft () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'axis', direction: 'horizontal'}, 'rowAxis.title.padding.left', this.appearanceData.rowAxis.title.padding.left)
      },
      changeRowAxisTitleFontSize () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'axis', direction: 'horizontal'}, 'rowAxis.title.font.size', this.appearanceData.rowAxis.title.font.size)
      },
      //    Col Axis Title
      changeColAxisTitlePaddingTop () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'axis', direction: 'vertical'}, 'colAxis.title.padding.top', this.appearanceData.colAxis.title.padding.top)
      },
      changeColAxisTitleFontSize () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'axis', direction: 'vertical'}, 'colAxis.title.font.size', this.appearanceData.colAxis.title.font.size)
      },
      //    Title Label
      changeTitleLabelPaddingBottom () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'title.padding.bottom', this.appearanceData.title.padding.bottom, {name: 'title', direction: 'vertical'})
      },
      changeTitleLabelFontSize () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'margin1', direction: 'both'}, 'title.font.size', this.appearanceData.title.font.size, {name: 'title', direction: 'vertical'})
      },
      //    Heatmap
      changeCellSize () {
        if (this.htmp && this.htmp.heatmapObject) this.htmp.setCellSize(this.cellSize)
      }
    }
  }
</script>

