<template>
    <div class="container">
        <div class="container mt-5">
                <div v-if="!fileSelected" class="row">
                    <div class="col-12 d-flex justify-content-center pt-5">
                            <b-button variant="primary" @click="chooseFile">Create Heatmap</b-button>
                    </div>
                    <!--
                    <div class="col-12 d-flex justify-content-center pt-2">
                        <b-button variant="outline-primary" @click="chooseFile">Open Heatmap</b-button>
                    </div>
                    <div class="col-12 d-flex justify-content-center pt-2">
                        <b-button variant="outline-primary" @click="chooseFile">Sample Heatmap</b-button>
                    </div>-->
                </div>
                <div v-if="fileSelected">
                    <div class="row">
                        <div class="col-12 d-flex justify-content-center">
                            <p><b>Source: </b>{{filename}}</p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-12 d-flex justify-content-center">
                            <b-btn-group>
                                <b-button variant="dark" @click="chooseFile">Change File</b-button>
                                <b-button variant="outline-dark" @click="cancelFile">Cancel</b-button>
                            </b-btn-group>
                        </div>
                    </div>
                    <div class="jumbotron mt-4 pb-2">
                        <h5 class="pb-2">Labelling</h5>
                        <div class="container">
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
                                        <span class="input-group-text">X-Axis Title</span>
                                    </div>
                                    <b-input @input="" v-model="xLab"></b-input>
                                </div>
                            </div>
                            <div class="row align-items-center justify-content-start pb-2">
                                <div class="col-sm input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">Y-Axis Title</span>
                                    </div>
                                    <b-input @input="" v-model="yLab"></b-input>
                                </div>
                            </div>
                        </div>
                        <h5 class="pt-2">Appearance</h5>
                        <div class="container">
                            <div class="row align-items-center justify-content-start pb-2">
                                <div class="col-sm input-group">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">Color Scheme</span>
                                    </div>
                                    <b-form-select v-model="colorScheme" :options="colorSchemeOptions"></b-form-select>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-4">
                            <div class="col-12 d-flex justify-content-center">
                                <b-button v-if="!isLoading" variant="success" @click="generateHeatmap" v-bind:disabled="!dataVerified">Generate Heatmap</b-button>
                                <b-button variant="primary" disabled v-if="isLoading">
                                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <span class="sr-only">Loading...</span>
                                </b-button>
                            </div>
                        </div>
                        <div class="row mt-4 mb-0">
                            <div class="col-12">
                                <b-progress :value="this.generationProgress" animated></b-progress>
                            </div>
                        </div>
                    </div>
                </div>
            <div class="container">
                <div class="row">
                    <div id="graphDiv" class="col-12" style="height: 100%"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
  import Heatmapper from '../Heatmapper.js'
  var Plotly = require('../custom-plotly')
  export default {
    name: 'Generator',
    data: () => {
      return {
        dataVerified: true,
        filename: '',
        fileSelected: false,
        fileObj: null,
        isLoading: false,
        mainTitle: '',
        xLab: '',
        yLab: '',
        colorScheme: 'Default',
        colorSchemeOptions: [
          { value: 'Default', text: 'Default Color Scheme' },
          { value: 'YlOrRd', text: 'YlOrRd (Dark Red to Light Yellow)' },
          { value: 'YlGnBu', text: 'YlGnBu (Dark Blue to Light Green/Yellow)' },
          { value: 'RdBu', text: 'Rdbu (Blue to Red)' },
          { value: 'Portland', text: 'Portland (Soft Rainbow)' },
          { value: 'Picnic', text: 'Picnic (Blue to Red, White Center)' },
          { value: 'Jet', text: 'Jet (Harsh Rainbow)' },
          { value: 'Hot', text: 'Hot (Traditional Heatmap Scheme)' },
          { value: 'Greys', text: 'Greys (Black to White, Greyscale)' },
          { value: 'Greens', text: 'Greens (Green to White)' },
          { value: 'Electric', text: 'Electric (Black to Yellow, Purple Center)' },
          { value: 'Earth', text: 'Earth (Blue to Brown with White Center)' },
          { value: 'Bluered', text: 'Bluered (Blue to Red, Purple Center)' },
          { value: 'Blackbody', text: 'Blackbody (Black to Sky Blue, Yellow Center)' },
          { value: 'Custom', text: 'Custom Colorscale', disabled: true }
        ],
        generationProgress: 0
      }
    },
    methods: {
      generateHeatmap: function () {
        this.isLoading = true
        this.generationProgress = 0
        let self = this
        var htmp = new Heatmapper(this.filename, this.mainTitle, this.xLab, this.yLab, this.colorScheme)
        htmp.processData((prog) => {
          this.generationProgress = prog
        }, (error, data, layout) => {
          self.generationProgress = 40
          if (error == null) {
            self.isLoading = false
            self.heatmapGenerated = true
            Plotly.newPlot('graphDiv', data, layout).then(() => {
              self.generationProgress = 100
            })
          } else {
            self.isLoading = false
            self.heatmapGenerated = false
            alert(error.toString())
          }
        })
      },
      chooseFile () {
        const { dialog } = require('electron').remote
        dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {name: 'Heatmap Data', extensions: ['txt', 'csv']}
          ]
        }).then((data) => {
          if (data.filePaths.length > 0) {
            this.filename = data.filePaths[0]
            this.fileSelected = true
          }
        })
      },
      cancelFile () {
        Object.assign(this.$data, this.$options.data()) // Clears all generator state data
        Plotly.purge('graphDiv')
      },
      dataVerification () {
        // eslint-disable-next-line eqeqeq
        var mainTitleValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.mainTitle)
        var xLabValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.xLab)
        var yLabValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.yLab)
        if (mainTitleValid && xLabValid && yLabValid) this.dataVerified = true // Regex for Filename, add some sort of alert that the file name isn't approp.
        else this.dataVerified = false
      }
    }
  }
</script>

