// Development Import (local cclust.node)
// eslint-disable-next-line import/no-webpack-loader-syntax
import clusteringModule from 'node-loader!./cclust'

// Production Import (cclust.node packaged)
// eslint-disable-next-line import/no-webpack-loader-syntax
// import clusteringModule from 'native-ext-loader?{"basePath":["app.asar","renderer"]}!./cclust' // Production Build

var registerPromiseWorker = require('promise-worker/register')

registerPromiseWorker((message) => {
  if (message.type === 'cluster') {
    return new Promise(function (resolve, reject) {
      try {
        var obj = clusteringModule.ccluster(message.filePath, message.distFn, message.linkFn, message.axes)
        resolve(obj)
      } catch (e) {
        reject(e)
      }
    })
  }
})
