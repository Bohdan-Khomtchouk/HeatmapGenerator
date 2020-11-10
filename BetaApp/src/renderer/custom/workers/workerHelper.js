// workerHelper.js
// Off-loading Heatmapper.js onto worker thread for the sake of protecting render thread from blocking.
import PromiseWorker from 'promise-worker'
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!./worker'

const worker = new Worker()
const promiseWorker = new PromiseWorker(worker)
const parse = (filePath) => promiseWorker.postMessage({
  type: 'parse', filePath: filePath
})
const process = (matrix) => promiseWorker.postMessage({
  type: 'process', matrix: matrix
})
const cluster = (filePath, options) => promiseWorker.postMessage({
  type: 'cluster', filePath: filePath, distFn: options.clustering.distType, linkFn: options.clustering.linkType, axes: options.clustering.type
})
const clusterTime = (matrix) => promiseWorker.postMessage({
  type: 'clusterTime', matrix: matrix
})

export default { parse, process, cluster, clusterTime }
