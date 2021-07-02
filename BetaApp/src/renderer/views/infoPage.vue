<template>
  <div class="container p-4">
    <div class="row ml-2 mr-4">
      <div class="col-6">
        <b-card header="Summary">
          <p class="acknowledgementsText">
            HeatmapGenerator is a cross-platform GUI written in JS using Electron, Vue, and D3.js
            to streamline the creation of customized gene expression heatmaps from RNA-seq and microarray data in medical research.
            HeatmapGenerator can also be used to make heatmaps in a variety of other non-medical fields.
            HeatmapGenerator is peer-reviewed published software.
          </p>
        </b-card>
      </div>
      <div class="col-6">
        <b-card header="Acknowledgements">
          <p class="acknowledgementsText">
            Dr. Bohdan Khomtchouk wishes to acknowledge the previous support of the Department of Defense (DoD) through the National Defense Science & Engineering Graduate Fellowship (NDSEG) Program from 2014-2017 [this research was conducted with Government support under and awarded by DoD, Army Research Office (ARO), National Defense Science and Engineering Graduate (NDSEG) Fellowship, 32 CFR 168a].
          </p>
        </b-card>
      </div>
    </div>
  </div>
</template>

<style>
  .acknowledgementsText {
    font-size: 90%;
    font-weight: 300;
  }
</style>

<script>
export default {
  name: 'infoPage',
  data: () => {
    return {
    }
  }
}
</script>
