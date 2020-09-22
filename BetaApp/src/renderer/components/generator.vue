<template>
    <div class="container-fluid">
        <div class="container-fluid mt-5">
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
            <div v-if="this.fileSelected && this.fileType === 'new'" class="jumbotron pb-3 pt-4">
                <div class="row">
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
                    <div class="row mt-4 pb-2">
                        <div class="col-12 d-flex justify-content-center">
                            <b-button v-if="!isLoading" variant="success" @click="generateHeatmap">Generate Heatmap</b-button>
                            <b-button variant="primary" disabled v-if="isLoading">
                                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                <span class="sr-only">Loading...</span>
                            </b-button>
                        </div>
                    </div>
                </b-collapse>
            </div>
            <!-- [SAVE HEATMAP] | [EXPORT GRAPHIC] -->

            <!-- Heatmap Display/Editing Container -->
            <div class="container-fluid pt-2 pb-4" v-bind:class="{'opacityZero' : !heatmapGenerated}">
                <div class="row">
                    <div class="col-9 pb-4 pr-0 pl-0 mr-0 ml-0" id="graphDiv" align="center" style="padding: 10px 20px; border-style: solid; border-width: 8px; border-color: #F7F7F7; -webkit-border-radius: 3px; -moz-border-radius: 3px; border-radius: 3px;">
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
                                <div class="row"><div class="col-12"><p>Row Label Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.labels.font.size" @change="changeRowLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="colLabelEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Label Padding Top:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.labels.padding.top" @change="changeColLabelPaddingTop"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Col Label Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.labels.font.size" @change="changeColLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="rowTreeEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Row Tree Padding Right:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.row.padding.right" @change="changeRowDendrogramPaddingRight"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Row Tree Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.row.size" @change="changeRowDendrogramSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="colTreeEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Tree Padding Bottom:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.col.padding.bottom" @change="changeColDendrogramPaddingBottom"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Col Tree Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.clustering.col.size" @change="changeColDendrogramSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="rowAxisEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Row Axis Padding Left:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.title.padding.left" @change="changeRowAxisTitlePaddingLeft"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Row Axis Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.rowAxis.title.font.size" @change="changeRowAxisTitleFontSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="colAxisEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Col Axis Padding Top:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.title.padding.top" @change="changeColAxisTitlePaddingTop"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Col Axis Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.colAxis.title.font.size" @change="changeColAxisTitleFontSize"></b-form-spinbutton>
                                    </div>
                                </div>
                            </div>
                            <div class="titleEditor inactiveTool d-none pt-4">
                                <div class="row"><div class="col-12"><p>Title Padding Bottom:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.title.padding.bottom" @change="changeTitleLabelPaddingBottom"></b-form-spinbutton>
                                    </div>
                                </div>
                                <div class="row"><div class="col-12"><p>Title Font Size:</p></div></div>
                                <div class="row">
                                    <div class="col-12">
                                        <b-form-spinbutton v-model="appearanceData.title.font.size" @change="changeTitleLabelFontSize"></b-form-spinbutton>
                                    </div>
                                </div>
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
        appearanceData: null
      }
    },
    methods: {
      // UI ACTIONS
      generateHeatmap: function () {
        // this.isLoading = true
        this.$root.$emit('bv::toggle::collapse', 'collapse-1')
        document.getElementById('graphDiv').innerHTML = ''
        if (this.htmp !== null) this.resetGUI()
        var options = {
          title: this.mainTitle,
          rowAxis: this.rowAxis,
          colAxis: this.colAxis,
          clustering: {
            type: this.clusteringType,
            distType: this.distanceType,
            linkType: this.linkageType
          }
        }
        this.htmp = new Heatmapper('#graphDiv')
        var self = this
        this.htmp.buildHeatmap(this.filename, options, (error, appearance) => {
          if (error) alert(error)
          else self.configureEditorDefaults(appearance)
        })
      },
      chooseSourceFile () {
        var self = this
        const { dialog } = require('electron').remote
        dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {name: 'Heatmap Data', extensions: ['txt', 'csv']}
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
            if (self.htmp === null) self.htmp = new Heatmapper('#graphDiv')
            self.htmp.buildHeatmap(self.filename, null, (error, appearance) => {
              if (error) alert(error)
              else {
                self.configureEditorDefaults(appearance)
              }
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
        var self = this
        const { dialog } = require('electron').remote
        dialog.showSaveDialog({
          buttonLabel: 'Save',
          properties: ['createDirectory'],
          showsTagField: false,
          filters: [ {name: 'PNG', extensions: ['png']}, {name: 'JPEG', extensions: ['jpg']}, {name: 'PDF', extensions: ['pdf']} ]
        }).then((obj) => {
          if (!obj.canceled) {
            var savePath = obj.filePath
            self.htmp.exportHeatmapFile(savePath, (err) => {
              if (err) {
                alert(err)
              } else {
                alert('Graphic exported.')
              }
            })
          }
        })
      },
      // UTILITY FUNCTIONS
      resetGUI () {
        document.getElementById('graphDiv').innerHTML = ''
        this.heatmapGenerated = false
        var heatmapSetupDiv = document.getElementById('collapse-1')
        if (heatmapSetupDiv !== null) {
          if (!heatmapSetupDiv.classList.contains('show')) {
            this.$root.$emit('bv::toggle::collapse', 'collapse-1')
          }
        }
        this.cellSize = 50
        this.rowLabelPaddingLeft = 15
      },
      configureEditorDefaults (appearance) {
        this.appearanceData = appearance
        this.heatmapGenerated = true
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
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'labels', direction: 'horizontal'}, 'rowAxis.labels.font.size', this.appearanceData.rowAxis.labels.font.size)
      },
      //    Col Labels
      changeColLabelPaddingTop () {
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'labels', direction: 'vertical'}, 'colAxis.labels.padding.top', this.appearanceData.colAxis.labels.padding.top)
      },
      changeColLabelFontSize () {
        // Row Label and Col Label changes will need to be calculated, might not fit normal paradigm, also need to make font variable based
        if (this.htmp) this.htmp.changeHeatmapAppearance({name: 'labels', direction: 'vertical'}, 'colAxis.labels.font.size', this.appearanceData.colAxis.labels.font.size)
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

