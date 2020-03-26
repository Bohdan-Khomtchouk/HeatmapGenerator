<template>
    <div class="container">
        <div class="row mt-5 mb-5">
            <div class="col-12">
                <h1 class="text-center">Heatmap Generator</h1>
            </div>
        </div>
        <transition name="bounce">
            <div v-if="!fileSelected" class="row mb-3">
                <div class="col-12 d-flex justify-content-center">
                        <b-button variant="outline-primary" @click="chooseFile">Choose File</b-button>
                </div>
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
                            <b-button variant="danger" @click="chooseFile">Change File</b-button>
                            <b-button variant="outline-danger" @click="cancelFile">Cancel</b-button>
                        </b-btn-group>
                    </div>
                </div>
                <div class="jumbotron">
                    <div class="row pb-2">
                        <div class="col-6 offset-3">
                            <b-input placeholder="Output File Name*" @input="dataVerification" v-model="outputFilename"></b-input>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-sm">
                            <b-input placeholder="Graph Title" v-model="mainTitle"></b-input>
                        </div>
                        <div class="col-sm">
                            <b-input placeholder="X-axis Title" v-model="xLab"></b-input>
                        </div>
                        <div class="col-sm">
                            <b-input placeholder="Y-axis Title" v-model="yLab"></b-input>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 d-flex justify-content-center">
                        <b-button v-if="!isLoading" variant="success" @click="generateHeatmap" v-bind:disabled="!dataVerified">Generate Heatmap</b-button>
                        <b-button v-if="isLoading" variant="primary" disabled>
                            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span class="sr-only">Loading...</span>
                        </b-button>
                    </div>
                </div>
                <div class="row">

                </div>
            </div>
        </transition>

    </div>
</template>

<script>
  export default {
    name: 'homepage',
    data: () => {
      return {
        dataVerified: false,
        filename: '',
        fileSelected: false,
        isLoading: false,
        outputFilename: '',
        mainTitle: '',
        xLab: '',
        yLab: ''
      }
    },
    methods: {
      generateHeatmap: function () {
        var self = this
        self.isLoading = true
        var exec = require('child_process').exec
        const path = require('path')
        var locationOfHeatmapScript = path.join(path.dirname(__dirname), 'extraResources', 'h1_simple.R')
        // UPDATE: depending on arguments to pass, this query must be updated
        var processedMainTitle = this.mainTitle.replace(/  */g, '%20') // Replace spaces with %20, will take them out on the R end
        if (!processedMainTitle) processedMainTitle = 'nil'
        var processedXLab = this.xLab.replace(/  */g, '%20') // Replace spaces with %20, will take them out on the R end
        if (!processedXLab) processedXLab = 'nil'
        var processedYLab = this.yLab.replace(/  */g, '%20') // Replace spaces with %20, will take them out on the R end
        if (!processedYLab) processedYLab = 'nil'
        var commandString = 'rscript ' + locationOfHeatmapScript + ' ' + this.filename + ' ' + this.outputFilename + '.png' + ' ' + processedMainTitle + ' ' + processedXLab + ' ' + processedYLab
        exec(commandString,
          function (error, stdout, stderr) {
            console.log('stdout: ' + stdout)
            console.log('stderr: ' + stderr)
            // Make heatmap viewable
            self.isLoading = false
            self.viewHeatmap()
            if (error !== null) {
              console.log('exec error: ' + error)
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
      viewHeatmap () {
        const {shell} = require('electron')
        shell.openItem(this.outputFilename + '.png')
      },
      cancelFile () {
        Object.assign(this.$data, this.$options.data())
      },
      dataVerification () {
        // eslint-disable-next-line eqeqeq
        if (!/[^a-z0-9_.@()-]/i.test(this.outputFilename) && !this.outputFilename == '') this.dataVerified = true // Regex for Filename, add some sort of alert that the file name isn't approp.
        else this.dataVerified = false
      }
    }
  }
</script>
