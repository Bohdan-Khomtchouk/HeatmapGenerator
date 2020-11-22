var registerPromiseWorker = require('promise-worker/register')

registerPromiseWorker((message) => {
  if (message.type === 'cluster') {
    // console.log('clustering')
    return new Promise(function (resolve, reject) {
      const clusteringModule = require('cclust')
      var obj = clusteringModule.ccluster(message.filePath, message.distFn, message.linkFn, message.axes)
      resolve(obj)
    })
  }
})
