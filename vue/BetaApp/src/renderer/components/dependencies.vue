<template>
    <div class="container">
        <div class="container">
            <p>Welcome to Heatmap Generator, a cross-platform computational biology tool out of the <a href="">Khomtchouk Lab</a>!
            Before you can start making heatmaps, make sure you have the following dependencies installed.</p>
            <div class="container jumbotron">
                <div class="row pb-2">
                    <div class="col-2">
                        <b><u>Dependency</u></b>
                    </div>
                    <div class="col-2" align="center">
                        <b><u>Installed?</u></b>
                    </div>
                    <div class="col-6 offset-1">
                        <b><u>Details</u></b>
                    </div>
                </div>
                <div class="row" v-for="library in dependencyList">
                    <div class="col-2">
                        <p>{{library[0]}}</p>
                    </div>
                    <div class="h5 col-2" align="center" >
                        <b-icon-check-box v-if="library[1]" variant="success"></b-icon-check-box>
                        <b-icon-x-octagon-fill v-else variant="danger"></b-icon-x-octagon-fill>
                    </div>
                    <div class="col-6 offset-1">
                        <p>{{library[2]}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import { BIcon, BIconCheckBox, BIconXOctagonFill } from 'bootstrap-vue'
    export default {
      components: {
        BIcon,
        BIconCheckBox,
        BIconXOctagonFill
      },
      data: function () {
        return {
          dependencyList: [['R', false, 'Handles general clustering and graphic generation.'], ['gplots', false, 'Handles heatmap construction with graphical customization.']]
        }
      },
      name: 'dependency',
      methods: {},
      created: function () {
        let self = this
        var manager = this.$parent.$data.systemManager
        // Only check for R if you have not checked this session.
        if (manager.isRInstalled === undefined) {
          manager.verifyRInstallation((error, isRInstalled) => {
            if (error == null) {
              self.dependencyList[0][1] = isRInstalled
              manager.verifyGPlotsInstallation((err, isGPlotsInstalled) => {
                if (err == null) {
                  self.dependencyList[1][1] = isGPlotsInstalled
                  self.$forceUpdate()
                } else {
                  alert(err.toString())
                }
              })
              self.$forceUpdate()
            } else {
              alert(error.toString())
            }
          })
        } else {
          self.dependencyList[0][1] = manager.isRInstalled
          self.dependencyList[1][1] = manager.isGPlotsInstalled
          self.$forceUpdate()
        }
      }
    }
</script>
