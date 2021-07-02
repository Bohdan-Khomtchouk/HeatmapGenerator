<template>
  <div class="container pt-0 pr-4">
    <div class="col-12 mt-2 ml-4 mr-4">
      <p id="landingPageHeading" class="ml-3 pb-0 mb-0">Getting Started</p>
      <p class="ml-3 pt-0 mt-2 mr-4 pr-4">Heatmap Generator is an easy to use, cross-platform solution for the generation of
        versatile heatmaps.<br/><br/>To get started, ensure that your file follows this general formatting guide:</p>
      <b-card header="Matrix Format" header-bg-variant="dark" header-text-variant="light"
              footer-html="<p style='font-size: 80%; margin-top: -0.5rem; margin-bottom: auto; height: 0.75rem; margin-left: 0rem'>File should be exported/converted to a .csv, .tsv, or .txt file.</p>"
              class="ml-3 mt-2" style="width: 500px">
        <div class="pr-4 pl-4 mr-4">
          <div class="row">
            <div class="formattingCell col-2" style="border-top: 1px dashed black; border-left: 1px dashed black"><p style="font-size: 80%; margin: auto; opacity: 0.6">*Blank*</p></div>
            <div class="formattingCell col-3" style="border-top: 1px solid black"><p class='formattingCellText'>Column 1</p></div>
            <div class="formattingCell col-3" style="border-top: 1px solid black;"><p class='formattingCellText'>Column 2</p></div>
            <div class="formattingCell col-3" style="border-top: 1px solid black;"><p class='formattingCellText'>Column 3</p></div>
          </div>
          <div class="row" v-for="row in sampleData">
            <div class="formattingCell col-2 pl-2" style="border-left: 1px solid black"><p class="formattingCellText">{{row[0]}}</p></div>
            <div class="formattingCell col-3 text-monospace"><p class='formattingCellText formattingCellNumber'>{{row[1]}}</p></div>
            <div class="formattingCell col-3 text-monospace"><p class='formattingCellText formattingCellNumber'>{{row[2]}}</p></div>
            <div class="formattingCell col-3 text-monospace"><p class='formattingCellText formattingCellNumber'>{{row[3]}}</p></div>
          </div>
        </div>
      </b-card>
      <p class="ml-3 mt-4 mr-4 pr-4 mb-4">Once your file is properly formatted, go ahead and <strong>create a new figure.</strong></p>
      <p class="ml-3 mr-3 d-inline"><i>Don't have a file?</i> No problem.</p> <b-button variant="primary" @click="downloadSampleFile">Download Sample File (.csv)</b-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'landingPage',
  data: () => {
    return {
      sampleData: [['Row 1', '32', '20', '-10'], ['Row 2', '-17', '24', '-2'], ['Row 3', '8', '-9', '14']]
    }
  },
  methods: {
    downloadSampleFile () {
      const { dialog } = require('electron').remote
      dialog.showSaveDialog({
        buttonLabel: 'Save',
        properties: ['createDirectory'],
        showsTagField: false,
        filters: [ {name: 'Heatmap Source Data', extensions: ['csv']} ]
      }).then((obj) => {
        if (!obj.canceled) {
          let savePath = obj.filePath
          let fs = require('fs')
          let path = require('path')
          let shell = require('electron').shell
          var dataPath
          if (process.env.NODE_ENV === 'production') dataPath = path.resolve(path.dirname(__dirname), '../../extraResources', 'HMG2_SampleFile.csv')
          else dataPath = path.resolve('src/extraResources', 'HMG2_SampleFile.csv')
          fs.copyFile(dataPath, savePath, (err) => {
            if (err) throw err
            else {
              shell.openPath(savePath)
            }
          })
        }
      })
    }
  }
}
</script>

<style>
  .navigationLabelText {
    margin-bottom: 24px;
    padding-top: 8px;
    padding-bottom: 10px;
    padding-left: 1rem;
    border-top: 2px solid #000000;
    border-right: 2px solid #000000;
    border-bottom: 2px solid #000000;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    background-color: #ffffff;
    opacity: 80%;
  }

  #landingPageHeading {
    font-size: 250%;
    font-weight: 270;
  }

  .formattingCell {
    font-size: 90%;
    height: 30px;
    display: flex;
    white-space: nowrap;
    border-right: 1px solid black;
    border-bottom: 1px solid black;
  }

  .formattingCellText {
    margin: auto;
  }

  .formattingCellNumber {
    font-size: 85%
  }
</style>
