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
                <div class="row jumbotron">
                    <div class="col-6 offset-3">
                        <b-input placeholder="Output File Name" v-model="outputFilename"></b-input>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 d-flex justify-content-center">
                        <b-button v-if="!isLoading" variant="success" @click="generateHeatmap" v-bind:disabled="outputFilename == ''">Generate Heatmap</b-button>
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
        filename: '',
        fileSelected: false,
        isLoading: false,
        outputFilename: ''
      }
    },
    methods: {
      generateHeatmap: function () {
        var self = this
        self.isLoading = true
        // eslint-disable-next-line one-var
        var exec = require('child_process').exec, child
        const path = require('path')
        var locationOfHeatmapScript = path.join(path.dirname(__dirname), 'extraResources', 'h1_simple.r')
        console.log(locationOfHeatmapScript)
        // UPDATE: depending on arguments to pass, this query must be updated
        var commandString = 'rscript ' + locationOfHeatmapScript + ' ' + this.filename + ' ' + this.outputFilename + '.png'
        child = exec(commandString,
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
        child()
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
        this.filename = ''
        this.fileSelected = false
      }
    }
  }
</script>
