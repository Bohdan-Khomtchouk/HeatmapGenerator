{
  "targets": [
    {
      "target_name": "cclust",
      "sources": [ "./src/heatmap_clustering_js_module.cpp" ],
      'dependencies': ['bonsaiclust']
    },
    {
      'target_name': 'bonsaiclust',
      'type': 'static_library',
      'sources': [ 'src/cluster.c' ],
      'cflags': ['-fPIC', '-I', '-pedantic', '-Wall']
    }

  ]
}
