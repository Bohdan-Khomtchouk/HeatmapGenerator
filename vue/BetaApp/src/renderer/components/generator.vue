<template>
    <div class="container">
        <div class="container mt-5">
            <transition name="bounce">
                <div v-if="!fileSelected" class="row">
                    <div class="col-12 d-flex justify-content-center pt-5">
                            <b-button variant="primary" @click="chooseFile">Choose File</b-button>
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
                                <b-button variant="dark" @click="chooseFile">Change File</b-button>
                                <b-button variant="outline-dark" @click="cancelFile">Cancel</b-button>
                            </b-btn-group>
                        </div>
                    </div>
                    <div class="jumbotron mt-5">
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
    </div>
</template>

<script>
  export default {
    name: 'Generator',
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
        var opsys = process.platform
        var commandBase = ''
        if (opsys === 'darwin') {
          // MacOS
          const fixPath = require('fix-path')
          fixPath()
          commandBase = 'rscript '
        } else if (opsys === 'win32' || opsys === 'win64') {
          // Windows
          commandBase = '/"Program Files"/R/R-3.6.3/bin/Rscript.exe ' // this is hardcoded for now
        } else {
          // Linux
        }
        var locationOfHeatmapScript
        if (process.env.NODE_ENV === 'development') locationOfHeatmapScript = path.resolve(__dirname, '../../extraResources', 'h1_simple.R')
        else locationOfHeatmapScript = path.resolve(process.resourcesPath, 'extraResources', 'h1_simple.R')
        console.log(locationOfHeatmapScript.toString())
        // UPDATE: depending on arguments to pass, this query must be updated
        var processedMainTitle = this.mainTitle.replace(/  */g, '%20') // Replace spaces with %20, will take them out on the R end
        if (!processedMainTitle) processedMainTitle = 'nil'
        var processedXLab = this.xLab.replace(/  */g, '%20')
        if (!processedXLab) processedXLab = 'nil'
        var processedYLab = this.yLab.replace(/  */g, '%20')
        if (!processedYLab) processedYLab = 'nil'
        var commandString = commandBase + locationOfHeatmapScript + ' ' + this.filename + ' ' + this.outputFilename + '.png' + ' ' + processedMainTitle + ' ' + processedXLab + ' ' + processedYLab
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
        const electron = require('electron')
        const homePath = (electron.app || electron.remote.app).getPath(
          'home'
        )
        var outputLocation = '' // Path to the newly generated heatmap image (HMG folder created on the R backend)
        const os = require('os')
        var opsys = process.platform
        if (opsys === 'darwin') {
          outputLocation = os.homedir() + '/HMG/' + this.outputFilename + '.png'
        } else if (opsys === 'win32' || opsys === 'win64') {
          outputLocation = homePath + '/HMG/' + this.outputFilename + '.png'
        } else {
          // Linux -- figure out where you will save/create on the R end, then find an appropriate dynamic variable to get you there
        }
        electron.shell.openItem(outputLocation)
      },
      cancelFile () {
        Object.assign(this.$data, this.$options.data()) // Clears all generator state data
      },
      dataVerification () {
        // eslint-disable-next-line eqeqeq
        if (!/[^a-z0-9_.@()-]/i.test(this.outputFilename) && !this.outputFilename == '') this.dataVerified = true // Regex for Filename, add some sort of alert that the file name isn't approp.
        else this.dataVerified = false
      }
    }
  }
</script>

