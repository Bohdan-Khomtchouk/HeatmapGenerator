// eslint-disable-next-line import/no-webpack-loader-syntax
import clusteringModule from 'native-ext-loader?{"basePath":["app.asar","renderer"]}!./cclust'
var registerPromiseWorker = require('promise-worker/register')

registerPromiseWorker((message) => {
  if (message.type === 'cluster') {
    // console.log('clustering')
    return new Promise(function (resolve, reject) {
      try {
        // const clusteringModule = require('./cclust')
        var obj = clusteringModule.ccluster(message.filePath, message.distFn, message.linkFn, message.axes)
        resolve(obj)
      } catch (e) {
        reject(e)
      }
    })
  }
})
