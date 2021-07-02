<template>
  <!-- Entry point for Electron (base Vue component) -->
  <div id="app" class="container-fluid h-100 m-0 px-0 overflow-hidden">
    <!-- Navigation Bar (Row 1) -->
    <b-navbar class="titleBar row">
      <b-navbar-brand class="ml-2"><img style="cursor: pointer" src="../renderer/assets/IconSmall.png" height="30px" alt="Logo" @click="switchView('/home')"></b-navbar-brand>
      <b-navbar-nav>
        <b-nav-text class="ml-2"><p class="titleBarText">{{ titleBarText }}</p></b-nav-text>
      </b-navbar-nav>
    </b-navbar>
    <!-- App tray (Row 2) -->
    <div class="row appTray h-100 fixed-bottom" style="padding-top: 40px; z-index: -100">
      <!-- Left Menu (Column 1 - 1 unit) -->
      <div class="col-1 text-center mr-0">
        <div class="navColumn pt-4 h-100">
          <!-- Buttons -->
          <div class="row">
            <div class="col-12">
              <b-button variant="dark" class="custom-nav-button" @click="switchView('/new')" id="newHeatmapButton"><b-icon class="pt-0 pb-0" icon="plus-square" aria-hidden="true" size="large" scale="1"></b-icon></b-button>
              <b-tooltip target="newHeatmapButton" triggers="hover" placement="right">Create</b-tooltip>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <b-button variant="dark" class="custom-nav-button" @click="switchView('/existing')" id="loadExistingButton"><b-icon class="pt-0 pb-0" icon="file-arrow-up" aria-hidden="true" size="large" scale="1"></b-icon></b-button>
              <b-tooltip target="loadExistingButton" triggers="hover" placement="right">Load</b-tooltip>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <b-button variant="dark" class="custom-nav-button" @click="switchView('/info')"  id="infoButton"><b-icon class="pt-0 pb-0" icon="info-square" aria-hidden="true" size="large" scale="1"></b-icon></b-button>
              <b-tooltip target="infoButton" triggers="hover" placement="right">Information</b-tooltip>
            </div>
          </div>
        </div>
      </div>
      <!-- Content Pane (Column 2 - 10 units) -->
      <div class="contentColumn col-10 pl-0 mb-0">
        <transition name="fade" mode="out-in">
          <router-view class="contentPane mx-0 p-0 " :filePath="filePath" :settings="settings" @segue="navigate" :key="this.$route.fullPath" ></router-view>
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'HeatmapGenerator',
    data: function () {
      return {
        filePath: '', // File path for active data source
        settings: {}, // Carries configuration settings used by Heatmapper.js during visualization; null until after compute.vue
        titleBarText: 'Home' // Title label for top navigation bar
      }
    },
    methods: {
      // Updates title bar text and routes to destination
      switchView (path) {
        switch (path) {
          case '/new':
            this.titleBarText = 'Create New Heatmap'
            this.$router.push(path)
            break
          case '/existing':
            this.titleBarText = 'Load Existing Heatmap'
            this.$router.push(path)
            break
          case '/data':
            this.titleBarText = 'Data Verification'
            this.$router.push(path)
            break
          case '/compute':
            this.titleBarText = 'Computational Settings'
            this.$router.push(path)
            break
          case '/info':
            this.titleBarText = 'Information / About Us'
            this.$router.push(path)
            break
          case '/visualizer':
            this.titleBarText = 'Visualization'
            this.$router.push(path)
            break
          case '/home':
            this.titleBarText = 'Home'
            this.$router.push('/')
            break
          default:
            path = '/'
            this.$router.push(path)
            break
        }
      },
      navigate (from, to, options) {
        let self = this
        switch (to) {
          case 'dataEditor':
            if (from === 'newHeatmap') {
              // New Heatmap to Data Editor
              this.filePath = options.filePath
              this.switchView('/data')
            } else if (from === 'compute') {
              this.switchView('/data')
            }
            break
          case 'compute':
            if (from === 'dataEditor') {
              // Data Editor to Clustering Settings
              let fs = require('fs')
              let Papa = require('papaparse')
              let path = require('path')
              let electron = require('electron')
              let ext = '.csv'
              let csvData = Papa.unparse(options.matrix) // creates CSV string from modified table
              const userDataPath = (electron.app || electron.remote.app).getPath('userData')
              let savePath = path.join(userDataPath, 'HMG2_TempSave' + ext)
              fs.writeFile(savePath, csvData, 'utf8', (err) => {
                if (err) throw err
                else {
                  self.filePath = savePath
                  self.settings = { matrixInformation: options.matrixInformation } // Pass
                  this.switchView('/compute')
                }
              })
            }
            break
          case 'visualizer':
            if (from === 'compute') {
              this.settings = options.computationalSettings
              this.switchView('/visualizer')
            } else if (from === 'existingHeatmap') {
              this.filePath = options.filePath
              this.settings = { fileType: 'existing' }
              this.switchView('/visualizer')
            }
            break
          case 'newHeatmap':
            if (from === 'dataEditor') {
              this.switchView('/new')
            }
            break
          default:
            this.switchView('/')
            break
        }
      }
    }
  }
</script>

<style>
  .fade-enter-active, .fade-leave-active {
    transition-property: opacity;
    transition-duration: .25s;
  }

  .fade-enter-active {
    transition-delay: 0s;
  }

  .fade-enter, .fade-leave-active {
    opacity: 0
  }
  .custom-nav-button {
    margin-bottom: 20px;
  }
  .navColumn {
    background: #f5f5f5;
    border-right: 1px solid #E0E0E0;
  }
  .titleBar {
    height: 40px;
    background: #212121;
    display: flex;
    border-bottom: 1px solid black;
  }
  .titleBarText {
    margin-right: auto;
    margin-top: auto;
    margin-bottom: auto;
    margin-left: 2px;
    font-size: 18px;
    font-weight: 350;
    color: #EEEEEE;
  }
  .contentPane {
    height: calc(100vh - 60px);
  }

</style>
