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
                    <div class="jumbotron pb-3 pt-4">
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
                                </div>
                            </div>
                            <h5 class="">Appearance</h5>
                            <div class="container pb-2">
                                <div class="row align-items-center justify-content-start pb-2">
                                    <div class="col-sm input-group">
                                        <div class="input-group-prepend">
                                            <span class="input-group-text">Color Scheme</span>
                                        </div>
                                        <b-form-select v-model="colorScheme" :options="colorSchemeOptions"></b-form-select>
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
                </div>
                <div class="container">
                    <div class="col-8 offset-2" id="graphDiv">
                    </div>
                    <div id="d3tooltip"><p><span id="value"></span></p></div>
                </div>
        </div>
    </div>
</template>

<script>
  import Heatmapper from '../custom/Heatmapper.js'
  export default {
    name: 'Generator',
    data: () => {
      return {
        heatmapSettings: true,
        heatmapGenerated: false,
        filename: '',
        fileSelected: false,
        fileObj: null,
        isLoading: false,
        mainTitle: '',
        rowAxis: '',
        colAxis: '',
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
        clusteringType: 'none',
        clusteringOptions: [
          { value: 'none', text: 'None' },
          { value: 'both', text: 'Both' },
          { value: 'row', text: 'Row' },
          { value: 'col', text: 'Column' }
        ],
        generationProgress: 0
      }
    },
    methods: {
      generateHeatmap: function () {
        // this.isLoading = true
        this.$root.$emit('bv::toggle::collapse', 'collapse-1')
        this.generationProgress = 0
        document.getElementById('graphDiv').innerHTML = ''
        var htmp = new Heatmapper('#graphDiv')
        var options = {
          title: this.mainTitle,
          rowAxis: this.rowAxis,
          colAxis: this.colAxis,
          clustering: {
            type: this.clusteringType
          }
        }
        htmp.drawHeatmap(this.filename, options)
        this.heatmapGenerated = true
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
            if (this.filename !== '') this.resetGUI()
            this.filename = data.filePaths[0]
            this.fileSelected = true
          }
        })
      },
      cancelFile () {
        Object.assign(this.$data, this.$options.data()) // Clears all generator state data
        this.resetGUI()
      },
      resetGUI () {
        document.getElementById('graphDiv').innerHTML = ''
        this.heatmapGenerated = false
        var heatmapSetupDiv = document.getElementById('collapse-1')
        if (heatmapSetupDiv !== null) {
          if (!heatmapSetupDiv.classList.contains('show')) {
            this.$root.$emit('bv::toggle::collapse', 'collapse-1')
          }
        }
      }
    }
  }
</script>

