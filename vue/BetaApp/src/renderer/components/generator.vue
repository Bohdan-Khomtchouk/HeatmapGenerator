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
                                <b-input placeholder="Graph Title" @input="dataVerification" v-model="mainTitle"></b-input>
                            </div>
                            <div class="col-sm">
                                <b-input placeholder="X-axis Title" @input="dataVerification" v-model="xLab"></b-input>
                            </div>
                            <div class="col-sm">
                                <b-input placeholder="Y-axis Title" @input="dataVerification" v-model="yLab"></b-input>
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
  import Heatmapper from '../Heatmapper.js'
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
        var manager = this.$parent.$data.systemManager
        var htmp = new Heatmapper(manager, this.filename, this.outputFilename, this.mainTitle, this.xLab, this.yLab)
        var self = this
        self.isLoading = true
        htmp.generateHeatmap((error) => {
          if (error == null) {
            self.isLoading = false
            htmp.presentHeatmap()
          } else {
            self.isLoading = false
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
      },
      dataVerification () {
        // eslint-disable-next-line eqeqeq
        var outputFilenameValid = !(/[^a-z0-9_.@()-]/i.test(this.outputFilename) || this.outputFilePath == '')
        var mainTitleValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.mainTitle)
        var xLabValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.xLab)
        var yLabValid = !/[^a-z0-9_.@()//-/\s]/i.test(this.yLab)
        if (outputFilenameValid && mainTitleValid && xLabValid && yLabValid) this.dataVerified = true // Regex for Filename, add some sort of alert that the file name isn't approp.
        else this.dataVerified = false
      }
    }
  }
</script>

