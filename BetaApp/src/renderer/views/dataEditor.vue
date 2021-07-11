<template>
  <div class="container-fluid w-100 h-100 m-0 p-0">
    <div class="row pt-4 mx-auto px-auto">
      <div class="col-12 px-0 overflow-hidden">
        <div id="hot-table">
        </div>
      </div>
    </div>
    <div class="row pt-4 mx-auto px-auto" v-if="loading">
      <div class="col-12 px-0 overflow-hidden">
        <b-skeleton-wrapper :loading="loading">
          <template #loading>
            <b-card class="h-100 vw-100 col-9">
              <b-skeleton width="85%"></b-skeleton>
              <b-skeleton width="55%"></b-skeleton>
              <b-skeleton width="70%"></b-skeleton>
              <b-skeleton width="85%"></b-skeleton>
              <b-skeleton width="55%"></b-skeleton>
              <b-skeleton width="70%"></b-skeleton>
              <b-skeleton width="85%"></b-skeleton>
              <b-skeleton width="55%"></b-skeleton>
              <b-skeleton width="70%"></b-skeleton>
            </b-card>
          </template>
        </b-skeleton-wrapper>
      </div>
    </div>
    <div class="row ml-2 mt-2 instruction-row">
      <div class="col-12 px-0 mt-0">
        <p class="instruction-text pt-2">Use the spreadsheet viewer to confirm that your data imports correctly. If
        any row/column labels or cell values are incorrect, double click on a cell to manually edit it. If the imported
        data is incomplete, navigate back to the 'Getting Started' page (by clicking on the app logo),
        where you can reference the formatting guide.</p>
      </div>
    </div>
    <div class="navigationFooter m-0 p-0">
      <div class="viewContainer row pt-2">
        <div class="col-6">
          <b-button variant="danger" class="float-left" style="width: 70px" size="sm" @click="back">Back</b-button>
        </div>
        <div class="col-6">
          <b-button variant="success" class="float-right" style="width: 70px" size="sm" @click="next">Next</b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
 #hot-table {
 }
 .toolbar {
   border-bottom: 1pt solid darkgray;
 }
 .nav-bar-item {
   color:black!important;
 }
 .navigationFooter {
   height: 50px;
   width: 100vw;
   position: fixed;
   bottom: 0;
 }
 .viewContainer {
   border-top: 1px solid #e2e2e2;
   position: relative;
   width: calc(0.94 * 100vw);
   height: 50px;
 }
 .instruction-row {
   position: relative;
   bottom: 0px;
 }

</style>

<script>
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.css'
import Editor from '../controllers/editor'

export default {
  name: 'dataEditor',
  data: () => {
    return {
      dataArray: null,
      dataTable: null,
      activeTab: 0,
      dataInformation: null,
      loading: false
    }
  },
  props: {
    filePath: {
      type: String
    }
  },
  mounted: function () {
    let self = this
    this.editor = new Editor() // Data Editor Controller
    let labelRenderer = function (instance, td, row, col, prop, value, cellProperties) {
      Handsontable.renderers.TextRenderer.apply(this, arguments)
      // td.style.fontWeight = 'bold'
      td.style.font = '10pt sans-serif'
      td.style.color = '#7e7e7e'
      td.style.background = '#f9f9f9'
    }
    let dataRenderer = function (instance, td, row, col, prop, value, cellProperties) {
      Handsontable.renderers.TextRenderer.apply(this, arguments)
      // td.style.fontWeight = 'bold'
      td.style.color = '#000000'
      td.style.background = '#ffffff'
      td.style.font = '10pt sans-serif'
      // cellProperties.readOnly = true
    }
    // Change back to '/Users/ali1/Downloads/demoFile.csv' later -- \/vvv\/
    this.editor.getMatrixData(self.filePath, (data) => {
      self.dataArray = data
      self.dataInformation = {
        rowCount: data.length,
        columnCount: data[0].length
      }
      let container = document.getElementById('hot-table')
      self.dataTable = new Handsontable(container, {
        data: self.dataArray,
        licenseKey: 'non-commercial-and-evaluation',
        stretchH: 'all',
        className: 'htCenter htMiddle',
        persistentState: true,
        rowHeights: 30,
        fixedColumnsLeft: 1,
        fixedRowsTop: 1,
        height: 480,
        cells: function (row, col, prop) {
          var cellProperties = {}
          if (row === 0 || col === 0) {
            cellProperties.renderer = labelRenderer
          } else {
            cellProperties.renderer = dataRenderer
          }
          return cellProperties
        }
      })
    })
  },
  methods: {
    normalize () {
      let self = this
      let newArray = this.editor.normalizeData(JSON.parse(JSON.stringify(self.dataArray)))
      this.dataTable.loadData(newArray)
      this.dataArray = newArray
    },
    recenter () {
      let self = this
      let newArray = this.editor.recenterData(JSON.parse(JSON.stringify(self.dataArray)), 0.518232262)
      this.dataTable.loadData(newArray)
      this.dataArray = newArray
    },
    back () {
      this.$emit('segue', 'dataEditor', 'newHeatmap')
    },
    next () {
      this.$emit('segue', 'dataEditor', 'compute', {matrix: this.dataArray, matrixInformation: this.dataInformation})
    },
    tableRendered () {
      this.loading = false
    }
  }
}
</script>
