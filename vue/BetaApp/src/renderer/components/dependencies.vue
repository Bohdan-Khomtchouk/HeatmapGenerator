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
          dependencyList: [['R', false, 'Handles clustering and graphic generation.']]
        }
      },
      name: 'dependency',
      methods: {},
      created: function () {
        /* NOTE: eventually, I think I want the results of this check to be stored at least for the current session.
        There should be no need to call BASH every time they flip to this screen, right? */
        let self = this
        var commandString = ''
        var exec = require('child_process').exec
        var opsys = process.platform
        if (opsys === 'darwin') {
          // MacOS
          const fixPath = require('fix-path') // Fixes $PATH on MacOS, necessary for proper R access
          fixPath()
          commandString = 'R --version' // If fixPath module works, we should have global access to R
          // LATER NOTE: Consider using 'which R' (works on Linux or Mac), if R is installed it can give you the path
        } else if (opsys === 'win32' || opsys === 'win64') {
          // Windows
          commandString = '/"Program Files"/R/R-3.6.3/bin/R.exe --version'
          /* What we will need to do:
          * 1) cd /"Program Files"/R
          * 2) dir
          * 3) Parse, then Regex find all R-*.*.*
          * 4) Sort from newest to oldest
          * 5) Execute /"Program Files"/R/R-_._._/bin/R.exe --version
          * NOTE: Should this command stem be stored globally? We don't want to redo this process on the generator page too...
          * */
        } else {
          // Linux -- I have no plan for this yet
        }
        exec(commandString,
          function (error, stdout, stderr) {
            if (error !== null) {
              console.log('RCheck Error: ' + error)
            }
            self.dependencyList[0][1] = !(stdout.includes('command not found') || stdout.includes('is not recognized')) // Need Linux check too!
            self.$forceUpdate() // For some reason this doesn't auto-update, we can just force it though
          })
      }
    }
</script>
