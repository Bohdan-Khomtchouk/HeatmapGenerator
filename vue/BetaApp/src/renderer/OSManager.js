// OSManager.js
// Module for handling OS-specific behaviors

export default class OSManager {
  constructor () {
    // ID the OS
    var platform = process.platform
    var operatingSystem = ''
    if (platform === 'darwin') {
      operatingSystem = 'Mac'
      const fixPath = require('fix-path')
      fixPath()
    } else if (platform === 'win32' || platform === 'win64') operatingSystem = 'Windows'
    else if (platform === 'Linux') operatingSystem = 'Linux'
    else operatingSystem = 'Unsupported'
    this.OS = operatingSystem
  }
  // Public Methods
  verifyRInstallation (callback) {
    var exec = require('child_process').exec
    let self = this
    if (this.OS === 'Mac') {
      this.$rCheckExecution('R --version', (error, output) => {
        if (error == null) {
          this.isRInstalled = output
          callback(null, output)
        } else {
          callback(error)
        }
      })
    } else if (this.OS === 'Windows') {
      exec('cd \\ && cd /"Program Files"/R && dir', (err, stdout, stderr) => {
        if (err) {
          throw Error('Error determining R location.')
        } else {
          if (stdout === 'The system cannot find the path specified.') throw Error('R is not installed.')
          else {
            var regexp = /R-([0-9])\.([0-9])\.([0-9])/g
            var version = stdout.match(regexp)
            if (version.length > 0) {
              self.rVersion = version[0].toString()
              var commandString = 'cd \\ && /"Program Files"/R/' + version[0].toString() + '/bin/R.exe --version'
              this.$rCheckExecution(commandString, (error, output) => {
                if (error == null) {
                  this.isRInstalled = output
                  callback(null, output)
                } else {
                  callback(error)
                }
              })
            } else {
              callback(Error('No compatible versions of R found'))
            }
          }
        }
      })
    } else if (this.OS === 'Linux') {
      callback(Error('Not configured.'))
    } else callback(Error('Operating System unsupported'))
  }
  getRScriptPath () {
    let exec = require('child_process').exec
    if (this.OS === 'Mac') {
      return 'rscript'
    } else if (this.OS === 'Windows') {
      if (this.rVersion === undefined) {
        exec('cd \\ && cd /"Program Files"/R && dir', (err, stdout, stderr) => {
          if (err) {
            throw Error('Error determining R location.')
          } else {
            if (stdout === 'The system cannot find the path specified.') throw Error('R is not installed.')
            else {
              var regexp = /R-([0-9])\.([0-9])\.([0-9])/g
              var version = stdout.match(regexp)
              if (version.length > 0) {
                this.rVersion = version[0].toString()
                var commandBase = '/"Program Files"/R/' + this.rVersion.toString() + 'R-3.6.3/bin/Rscript.exe '
                return commandBase
              } else {
                throw Error('No compatible versions of R found')
              }
            }
          }
        })
      } else {
        var commandBase = '/"Program Files"/R/' + this.rVersion.toString() + 'R-3.6.3/bin/Rscript.exe '
        return commandBase
      }
    } else if (this.OS === 'Linux') {
      throw Error('OS not configured yet.')
    } else {
      throw Error('Unsupported OS.')
    }
  }
  getOutputFilePath (outputFilename) {
    const electron = require('electron')
    const os = require('os')
    const homePath = (electron.app || electron.remote.app).getPath(
      'home'
    )
    var outputLocation = ''
    if (this.OS === 'Mac') {
      outputLocation = os.homedir() + '/HMG/' + outputFilename
      return outputLocation
    } else if (this.OS === 'Windows') {
      outputLocation = homePath + '/HMG/' + outputFilename
      return outputLocation
    } else if (this.OS === 'Linux') {
      // Linux -- figure out where you will save/create on the R end, then find an appropriate dynamic variable to get you there
    } else throw Error('Unsupported system.')
    return outputLocation
  }
  // Private methods ($ prefix)
  $rCheckExecution (commandString, callback) {
    let exec = require('child_process').exec
    exec(commandString, (error, stdout, stderr) => {
      if (error == null) {
        let conditions = ['command not found', 'is not recognized', 'cannot find the path']
        callback(null, !conditions.some(el => stdout.includes(el)))
      } else {
        console.log('Error checking for R dependency: ' + error.toString())
        callback(null, false)
      }
    })
  }
}
