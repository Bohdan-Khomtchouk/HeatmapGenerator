<template>
  <div class="container">
    <div class="row h-50 mt-4 mx-4 px-4 pt-4 mb-0">
      <div class="col-12">
        <b-card class="d-inline-flex flex-column w-100 text-center h-100" bg-variant="light" v-if="fileSelected == ''">
          <div id="dropArea" class="m-0 p-0 h-100">
            <div id="inputArea" class="pb-4 pt-0">
              <b-button variant="primary" @click="chooseSourceFile">Select a file</b-button>
              <p class="mt-1">or<br/>Drag and drop</p>
            </div>
          </div>
        </b-card>
        <transition name="fade">
          <b-card header="File Selected" class="container m-auto p-0" v-if="fileSelected !== ''">
            <div class="row">
              <div class="col-12">
                <p>Path: {{fileSelected}}</p>
              </div>
            </div>
          </b-card>
        </transition>
      </div>
    </div>
    <div class="row mx-4 px-4 mt-2" v-if="fileSelected === ''">
      <div class="col-12 px-4 mt-0">
        <p class="instruction-text pt-2">To load an existing project, navigate to your .htmp file. If you want to create
        a heatmap from a new data file (.csv, .tsv, .txt), use the "Create" button at the top of the left menu.</p>
      </div>
    </div>
    <div class="navigationFooter m-0 p-0" v-if="fileSelected !== ''">
      <div class="viewContainer row pt-2">
        <div class="col-6">
          <b-button variant="danger" class="float-left" style="width: 70px" size="sm" @click="fileSelected = ''">Cancel</b-button>
        </div>
        <div class="col-6">
          <b-button variant="success" class="float-right" style="width: 70px" size="sm" @click="advance">Next</b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#inputArea {
  position: relative;
  top: 50%;
  transform: translate(0, -50%);
}

#dropArea {
  border-radius: 5px;
}
.highlight {
  background-color: #e2e2e2!important;
}

.instruction-text {
  font-size: 10pt;
  color: gray;
}
</style>

<script>
export default {
  name: 'existingHeatmap',
  data: () => {
    return {
      fileSelected: '',
      isHighlighted: false
    }
  },
  methods: {
    chooseSourceFile () {
      const { dialog } = require('electron').remote
      let self = this
      dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          {name: 'Heatmap File', extensions: ['htmp']}
        ]
      }).then((data) => {
        if (data.filePaths.length > 0) self.fileSelected = data.filePaths[0]
      })
    },
    advance () {
      // Confirm file is a .csv/.txt/.tsv
      this.$emit('segue', 'existingHeatmap', 'visualizer', {filePath: this.fileSelected})
    }
  },
  mounted: function () {
    let dropArea = document.getElementById('dropArea')
    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, function (e) {
        e.preventDefault()
        e.stopPropagation()
      }, false)
    })
    let highlight = function (e) {
      if (!self.isHighlighted) {
        dropArea.classList.add('highlight')
        self.isHighlighted = true
        console.log('highlighting')
      }
    }

    let unhighlight = function (e) {
      if (self.isHighlighted) {
        console.log('unhighlighting')
        dropArea.classList.remove('highlight')
        self.isHighlighted = false
      }
    }
    ;['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false)
    })

    ;['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false)
    })
    let self = this
    let handleFiles = function (files) {
      ([...files]).forEach(file => {
        if (file.path.includes('.htmp')) self.fileSelected = file.path
        else if (file.path.includes('.csv') || file.path.includes('.tsv') || file.path.includes('.txt')) alert('To use this data source, create a new heatmap.')
        else alert('File must be in .htmp format')
      })
    }
    let handleDrop = function (e) {
      let dt = e.dataTransfer
      let files = dt.files
      handleFiles(files)
    }
    dropArea.addEventListener('drop', handleDrop, false)
  }
}
</script>
