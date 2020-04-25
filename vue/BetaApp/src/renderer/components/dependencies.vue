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
      methods: {
        checkForR: function (commandString) {
          let self = this
          var exec = require('child_process').exec
          exec(commandString, (error, stdout, stderr) => {
            if (error !== null) {
              console.log('func: checkForR -- ERROR: ' + error)
            }
            console.log(stdout)
            self.dependencyList[0][1] = !(stdout.includes('command not found') || stdout.includes('is not recognized') || stdout.includes('cannot find the path'))
            self.$forceUpdate()
          })
        }
      },
      created: function () {
        var exec = require('child_process').exec
        var opsys = process.platform
        if (opsys === 'darwin') {
          const fixPath = require('fix-path')
          fixPath()
          var commandString = 'R --version'
          this.checkForR(commandString)
        } else if (opsys === 'win32' || opsys === 'win64') {
          exec('cd \\ && cd /"Program Files"/R && dir', (err, stdout, stderr) => {
            if (err) {
              console.log('func: created -- ERROR: ' + err.toString())
            } else {
              if (stdout === 'The system cannot find the path specified.') console.log('R NOT INSTALLED')
              else {
                var regexp = /R-([0-9])\.([0-9])\.([0-9])/g
                var version = stdout.match(regexp)
                var commandString = 'cd \\ && /"Program Files"/R/' + version[0].toString() + '/bin/R.exe --version'
                this.checkForR(commandString)
              }
            }
          })
        } else {
          // Linux -- I have no plan for this yet
        }
      }
    }
</script>
