<template>
    <div class="container">
        <div class="container-fluid mt-5 pb-0">
            <!-- [CREATE HEATMAP] | [OPEN HEATMAP] -->
            <div v-if="!fileSelected" class="row">
                <div class="col-12 d-flex justify-content-center pt-5">
                        <b-button variant="primary" @click="chooseSourceFile">Create Heatmap</b-button>
                </div>
                <div class="col-12 d-flex justify-content-center pt-2">
                    <b-button variant="outline-primary" @click="openExistingFile">Open Heatmap</b-button>
                </div>
            </div>
            <!-- SOURCE FILE: ... | [CHANGE FILE] -->
            <div class="container" v-if="fileSelected">
                    <div class="row">
                        <div class="col-12 d-flex justify-content-center">
                            <p><b>Source: </b>{{filename}}</p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-12 d-flex justify-content-center">
                            <b-btn-group>
                                <b-button v-if="fileType === 'new'" variant="dark" @click="chooseSourceFile">Change Source File</b-button>
                                <b-button v-if="fileType === 'existing'" variant="dark" @click="openExistingFile">Change Heatmap File</b-button>
                                <b-button variant="outline-dark" @click="cancelFile">Cancel</b-button>
                            </b-btn-group>
                        </div>
                    </div>
                </div>
            <!-- Jumbotron for new Heatmap settings -->
            <div v-if="this.fileSelected && this.fileType === 'new'" class="jumbotron mb-2 pb-0 pt-4">
                <div class="row pb-2">
                    <div class="col-10">
                        <h3><b>Heatmap Setup</b></h3>
                    </div>
                    <div class="col-2 pr-0">
                        <b-button v-if="this.heatmapGenerated" v-b-toggle.collapse-1 class="float-right" size="sm" @click="heatmapSettings = !heatmapSettings" variant="dark">
                            <b-icon v-if="heatmapSettings" icon="chevron-up"></b-icon>
                            <b-icon v-else icon="chevron-down"></b-icon>

                        </b-button>
                    </div>
                </div>
                <b-collapse class="pt-2" visible id="collapse-1">
                    <h5 class="">Labelling</h5>
                    <div class="container pb-2">
                        <div class="row align-items-center justify-content-start pb-2">
                            <div class="col-sm input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Graph Title</span>
                                </div>
                                <b-input @input="" v-model="mainTitle"></b-input>
                            </div>
                        </div>
                        <div class="row align-items-center justify-content-start pb-2">
                            <div class="col-sm input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Row Title</span>
                                </div>
                                <b-input @input="" v-model="rowAxis"></b-input>
                            </div>
                        </div>
                        <div class="row align-items-center justify-content-start pb-2">
                            <div class="col-sm input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Column Title</span>
                                </div>
                                <b-input @input="" v-model="colAxis"></b-input>
                            </div>
                        </div>
                    </div>
                    <h5 class="">Data Analysis</h5>
                    <div class="container pb-2">
                        <div class="row align-items-center justify-content-start pb-2">
                            <div class="col-4 input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Clustering</span>
                                </div>
                                <b-form-select v-model="clusteringType" :options="clusteringOptions"></b-form-select>
                            </div>
                            <div v-if="clusteringType !== 'n'" class="col-4 input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Linkage Method</span>
                                </div>
                                <b-form-select v-model="linkageType" :options="linkageOptions"></b-form-select>
                            </div>
                            <div v-if="clusteringType !== 'n'" class="col-4 input-group">
                                <div class="input-group-prepend">
                                    <span class="input-group-text">Distance Metric</span>
                                </div>
                                <b-form-select v-model="distanceType" :options="distanceOptions"></b-form-select>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4 pb-4">
                        <div class="col-12 d-flex justify-content-center">
                            <b-button v-if="!isLoading" variant="success" @click="generateHeatmap">Generate Heatmap</b-button>
                            <b-button variant="primary" v-if="isLoading" disabled>
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                <span class="sr-only">Loading...</span>
                            </b-button>
                        </div>
                    </div>

                </b-collapse>
            </div>
            <!-- [SAVE HEATMAP] | [EXPORT GRAPHIC] -->
          <div class="row pt-0 pb-2">
            <div class="col-12 justify-content-center" v-if="clusteringProgress !== null">
              <b-progress :max="100" height="2rem">
                <b-progress-bar :value="clusteringProgress">
                  <span>Progress: <strong>{{ clusteringProgress.toFixed(2) }} / {{ clusteringProgressMax }}</strong></span>
                </b-progress-bar>
              </b-progress>
            </div>
          </div>
            <!-- Heatmap Display/Editing Container -->
            <div class="container-fluid pt-2 pb-4 mb-2" v-bind:class="{'opacityZero' : !heatmapGenerated}">
                <div class="row">
                    <div class="col-9 pb-4 pr-0 pl-0 mr-0 ml-0" id="graphDiv" align="center" style="padding: 10px 20px; border-style: solid; border-width: 8px; border-color: #F7F7F7; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px; overflow-x: scroll; overflow-y: scroll;">
                    </div>
                    <div id="d3tooltip"><p><span id="value"></span></p></div>
                    <div class="col-3">
                        <div v-if="appearanceData !== null" class="editingTray container sticky-top pt-2">
                            <!-- [SAVE HEATMAP] -->
                            <div class="row text-center">
                                <div class="col-12 pt-2 pb-2">
                                    <b-button @click="saveHeatmapFile" variant="primary">Save Heatmap File</b-button>
                                </div>
                            </div>
                            <!-- [EXPORT GRAPHIC] -->
                            <div class="row text-center pb-4">
                                <div class="col-12">
                                    <b-button @click="exportToGraphic" variant="success">Export Graphic</b-button>
                                </div>
                            </div>
                            <h5 align="center"><b>Editor Tray</b></h5>
                            <div class="marginsEditor activeTool pt-4">
                                <div class="row"><div class="col-12"><p>Margin Top:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.margin.top" @change="changeMarginTop"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Margin Bottom:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.margin.bottom" @change="changeMarginBottom"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Margin Left:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.margin.left" @change="changeMarginLeft"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Margin Right:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.margin.right" @change="changeMarginRight"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="rowLabelEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Row Label Padding Left:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.labels.padding.left" @change="changeRowLabelPaddingLeft"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!--<div class="row"><div class="col-12"><p>Row Label Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.labels.font.size" @change="changeRowLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="colLabelEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Label Padding Top:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.labels.padding.top" @change="changeColLabelPaddingTop"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!--<div class="row"><div class="col-12"><p>Col Label Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.labels.font.size" @change="changeColLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="rowTreeEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Row Tree Padding Right:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.row.padding.right" @change="changeRowDendrogramPaddingRight"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!-- <div class="row"><div class="col-12"><p>Row Tree Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.row.size" @change="changeRowDendrogramSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="colTreeEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Tree Padding Bottom:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.col.padding.bottom" @change="changeColDendrogramPaddingBottom"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!-- <div class="row"><div class="col-12"><p>Col Tree Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.col.size" @change="changeColDendrogramSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="rowAxisEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Row Axis Padding Left:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.title.padding.left" @change="changeRowAxisTitlePaddingLeft"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!-- <div class="row"><div class="col-12"><p>Row Axis Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.title.font.size" @change="changeRowAxisTitleFontSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="colAxisEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Axis Padding Top:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.title.padding.top" @change="changeColAxisTitlePaddingTop"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!--<div class="row"><div class="col-12"><p>Col Axis Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.title.font.size" @change="changeColAxisTitleFontSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                            <div class="titleEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Title Padding Bottom:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.title.padding.bottom" @change="changeTitleLabelPaddingBottom"></b-form-spinbutton>
                                    </div>
                                </div>
                                <!--<div class="row"><div class="col-12"><p>Title Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.title.font.size" @change="changeTitleLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div> -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
    .opacityZero {
        opacity:0;
        overflow: unset;
    }
    .activeTool {
        visibility: visible;
    }
    .inactiveTool {
        visibility: hidden;
    }
</style>
<script>
  import Heatmapper from '../custom/Heatmapper.js'

  export default {
    name: 'Generator',
    data: () => {
      return {
        heatmapSettings: true,
        heatmapGenerated: false,
        saveFileName: '',
        filename: '',
        fileSelected: false,
        fileType: null,
        fileObj: null,
        isLoading: false,
        mainTitle: '',
        rowAxis: '',
        colAxis: '',
        clusteringType: 'n',
        clusteringOptions: [
          { value: 'n', text: 'None' },
          { value: 'b', text: 'Both' },
          { value: 'r', text: 'Row' },
          { value: 'c', text: 'Column' }
        ],
        linkageType: 'a',
        linkageOptions: [
          { value: 'a', text: 'Average' },
          { value: 's', text: 'Single' },
          { value: 'm', text: 'Maximum/Complete' },
          { value: 'c', text: 'Centroid' }
        ],
        distanceType: 'e',
        distanceOptions: [
          { value: 'e', text: 'Euclidean Distance' },
          { value: 'c', text: 'Pearson Correlation Coefficient' },
          { value: 'a', text: 'Absolute Value of Pearson' },
          { value: 'u', text: 'Uncentered Pearson' },
          { value: 'x', text: 'Absolute Uncentered Pearson' },
          { value: 's', text: 'Spearman\'s Rank Correlation' },
          { value: 'k', text: 'Kendall\'s Rank Correlation' },
          { value: 'b', text: 'City-block Distance' }
        ],
        htmp: null,
        appearanceData: null,
        clusteringProgress: null,
        clusteringProgressMax: 100
      }
    },
    methods: {
      // UI ACTIONS
      generateHeatmap: function () {
        this.isLoading = true
        this.clusteringProgress = 2
        if (this.htmp != null) document.getElementById('graphDiv').innerHTML = ''
        // if (this.htmp !== null) this.resetGUI()
        var options = {
          title: this.mainTitle,
          fileName: this.filename,
          rowAxis: this.rowAxis,
          colAxis: this.colAxis,
          clustering: {
            type: this.clusteringType,
            distType: this.distanceType,
            linkType: this.linkageType
          }
        }
        var self = this
        this.htmp = new Heatmapper('#graphDiv')
        if (options.clustering.type === 'n') {
          // No clustering
          this.htmp.parse(this.filename).then(result => {
            self.clusteringProgress = 30
            return self.htmp.process(result)
          }).then(payload => {
            self.clusteringProgress = 60
            return self.htmp.createHTMP(payload, options)
          }).then(() => {
            self.clusteringProgress = 85
            return self.htmp.renderHeatmapFrom('both', 0, true)
          }).then(() => {
            self.$root.$emit('bv::toggle::collapse', 'collapse-1')
            self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
            self.clusteringProgress = 100
          }).catch((error) => {
            console.log(error)
          })
        } else {
          // Clustering
          this.htmp.parse(this.filename).then(matrix => {
            self.clusteringProgress = 10
            return self.htmp.estimateClusteringLoad(matrix)
          }).then(result => {
            self.clustEst = result
            // console.log('estimated time: ' + result)
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
            return self.htmp.cluster(self.filename, options)
          }).then(payload => {
            // console.log(payload)
            clearInterval(self.progressInterval)
            self.clustEst = null
            self.clusteringProgress = 80
            return self.htmp.createHTMP(payload, options)
          }).then(() => {
            self.clusteringProgress = 90
            return self.htmp.renderHeatmapFrom('both', 0, true)
          }).then(() => {
            self.$root.$emit('bv::toggle::collapse', 'collapse-1')
            self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
            self.clusteringProgress = 100
          }).catch((error) => {
            self.progressInterval = null
            self.clustEst = null
            self.clusteringProgress = null
            self.heatmapGenerated = false
            self.isLoading = false
            console.log(error)
          })
        }
      },
      chooseSourceFile () {
        var self = this
        const { dialog } = require('electron').remote
        dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {name: 'Heatmap Data', extensions: ['csv']}
          ]
        }).then((data) => {
          if (data.filePaths.length > 0) {
            if (self.filename !== '') this.resetGUI()
            self.fileType = 'new'
            self.filename = data.filePaths[0]
            self.fileSelected = true
          }
        })
      },
      openExistingFile () {
        var self = this
        const { dialog } = require('electron').remote
        dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {name: 'Heatmap Data', extensions: ['htmp']}
          ]
        }).then((data) => {
          if (data.filePaths.length > 0) {
            self.filename = data.filePaths[0]
            self.fileType = 'existing'
            self.fileSelected = true
            self.clusteringProgress = 0
            if (self.htmp === null) self.htmp = new Heatmapper('#graphDiv')
            self.clusteringProgress = 20
            self.htmp.loadFromFile(self.filename).then(function (data) {
              self.clusteringProgress = 40
              return self.htmp.createHTMP(data)
            }).then(function () {
              self.clusteringProgress = 60
              return self.htmp.renderHeatmapFrom('both', 0, true)
            }).then(function () {
              self.clusteringProgress = 80
              self.configureEditorDefaults(self.htmp.heatmapObject.appearance)
              self.clusteringProgress = 100
            }).catch((error) => {
              if (error) console.log(error)
            })
          }
        })
      },
      cancelFile () {
        Object.assign(this.$data, this.$options.data()) // Clears all generator state data
        this.resetGUI()
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
                self.filename = savePath
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

