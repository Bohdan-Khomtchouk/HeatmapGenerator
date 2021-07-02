<template>
  <div class="container-fluid w-100 h-100 mx-0 mb-0 pt-2">
    <b-alert class="mb-0 mt-0" v-bind:show="dataSizeWarning" variant="danger" dismissible style="font-size: 11pt">
      The size of your matrix may cause the app to stall. Are you sure you want to cluster this data?
    </b-alert>
    <div class="row align-items-center justify-content-start mt-2 mb-2 mx-2">
     <b-card bg-variant="light" class="col-12">
       <b-form-group label-cols-lg="12" label="Figure Information" label-size="md" label-class="font-weight-bold pt-0" class="mb-0">
         <b-form-group label="Main Title:" label-size="sm" label-for="input-title" label-cols-sm="3" label-align-sm="right">
           <b-form-input id="input-title" v-model="mainTitle" size="sm"></b-form-input>
         </b-form-group>
         <b-form-group label="Vertical Axis Title:" label-size="sm" label-for="input-vertical" label-cols-sm="3" label-align-sm="right">
           <b-form-input id="input-vertical" v-model="rowAxis" size="sm"></b-form-input>
         </b-form-group>
         <b-form-group label="Horizontal Axis Title:" label-size="sm" label-for="input-horizontal" label-cols-sm="3" label-align-sm="right">
           <b-form-input id="input-horizontal" v-model="colAxis" size="sm"></b-form-input>
         </b-form-group>
       </b-form-group>
     </b-card>
    </div>
    <transition name="fade">
      <div class="row align-items-center justify-content-start mt-4 mb-2 mx-2">
          <b-card bg-variant="light" class="col-12">
            <b-form-group label-cols-lg="12" label="Data Analysis" label-size="md" label-class="font-weight-bold pt-0" class="mb-0">
              <b-form-group label="Hierarchical Clustering:" label-size="sm" label-for="input-title" label-cols-sm="3" label-align-sm="right">
                <b-form-select v-model="clusteringType" :options="clusteringOptions" size="sm"></b-form-select>
              </b-form-group>
              <b-form-group label="Linkage Metric:" label-size="sm" label-for="input-vertical" label-cols-sm="3" label-align-sm="right" v-if="clusteringType !== 'n'">
                <b-form-select v-model="linkageType" :options="linkageOptions" size="sm"></b-form-select>
              </b-form-group>
              <b-form-group label="Distance Metric:" label-size="sm" label-for="input-horizontal" label-cols-sm="3" label-align-sm="right" v-if="clusteringType !== 'n'">
                <b-form-select v-model="distanceType" :options="distanceOptions" size="sm"></b-form-select>
              </b-form-group>
            </b-form-group>
          </b-card>
      </div>
    </transition>
    <div class="row ml-3 mr-2 mt-2 instruction-row">
      <div class="col-12 px-0 mt-0">
        <p class="instruction-text pt-2">Enter your graph and/or axis-specific titles (optional). Then, choose whether to
        hierarchically cluster the data (and generate dendrograms). NOTE: Hierarchical clustering is resource-intensive;
        if your matrix is large in size along one (or both) axes, this operation may cause the app to stall.</p>
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
.fade-enter-active, .fade-leave-active {
  transition-property: opacity;
  transition-duration: .2s;
}

.fade-enter-active {
  transition-delay: .1s;
}

.fade-enter, .fade-leave-active {
  opacity: 0
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
export default {
  name: 'compute',
  data: () => {
    return {
      heatmapSettings: true,
      heatmapGenerated: false,
      saveFileName: '',
      fileObj: null,
      isLoading: false,
      mainTitle: '',
      rowAxis: '',
      colAxis: '',
      clusteringType: 'n',
      clusteringOptions: [
        { value: 'n', text: 'None' },
        { value: 'b', text: 'Both' },
        { value: 'r', text: 'Row' },
        { value: 'c', text: 'Column' }
      ],
      linkageType: 'a',
      linkageOptions: [
        { value: 'a', text: 'Average' },
        { value: 's', text: 'Single' },
        { value: 'm', text: 'Maximum/Complete' },
        { value: 'c', text: 'Centroid' }
      ],
      distanceType: 'e',
      distanceOptions: [
        { value: 'e', text: 'Euclidean Distance' },
        { value: 'c', text: 'Pearson Correlation Coefficient' },
        { value: 'a', text: 'Absolute Value of Pearson' },
        { value: 'u', text: 'Uncentered Pearson' },
        { value: 'x', text: 'Absolute Uncentered Pearson' },
        { value: 's', text: 'Spearman\'s Rank Correlation' },
        { value: 'k', text: 'Kendall\'s Rank Correlation' },
        { value: 'b', text: 'City-block Distance' }
      ],
      colorSchemeType: 'RdBu',
      colorSchemeOptions: [
        { value: 'RdBu', text: 'Red to Blue' },
        { value: 'BrBG', text: 'Brown to Green' },
        { value: 'PiYG', text: 'Pink to Green' },
        { value: 'RdGy', text: 'Red to Gray' },
        { value: 'RdBu', text: 'Red to Blue' },
        { value: 'c', text: 'Custom' }
      ],
      htmp: null,
      appearanceData: null,
      clusteringProgress: null,
      clusteringProgressMax: 100,
      dataSizeWarning: false
    }
  },
  props: {
    filePath: {
      type: String
    },
    settings: {
      type: Object
    }
  },
  watch: {
    clusteringType: function () {
      if (this.clusteringType !== 'n') {
        //  User is trying to cluster their data
        if (this.settings.matrixInformation.rowCount > 5000 || this.settings.matrixInformation.columnCount > 5000) {
          this.dataSizeWarning = true
        }
      } else this.dataSizeWarning = false
    }
  },
  mounted: function () {
    console.log('mounted')
  },
  methods: {
    back () {
      this.$emit('segue', 'compute', 'dataEditor')
    },
    next () {
      let matrixInfo = this.settings.matrixInformation
      this.settings = {
        title: this.mainTitle,
        fileType: 'new',
        fileName: this.filePath,
        rowAxis: this.rowAxis,
        colAxis: this.colAxis,
        clustering: {
          type: this.clusteringType,
          distType: this.distanceType,
          linkType: this.linkageType
        },
        colorScheme: {
          type: 'RdBu'
        },
        matrixInformation: matrixInfo
      }
      this.$emit('segue', 'compute', 'visualizer', {computationalSettings: this.settings})
    }
  }
}
</script>
