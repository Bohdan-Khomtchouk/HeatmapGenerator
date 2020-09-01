CC?=gcc
CXX?=g++
AR?=ar

# Set the default optional flags if none are specified

# Release mode (If just dropping the lib into your project, check out -flto too.)
#
# Note1: OpenMP is (currently) not required by the lib, just for precise benchmarking.
# Note2: the -Wa,-ahl=... part only generates .s assembly so one can see generated code.
# Note3: If you want to add `-flto`, you should add the same -O to LDFLAGS as to FLAGS.
DEFAULT_FLAGS=-O3 -g -DNDEBUG -Wall -Wextra
DEFAULT_LDFLAGS=

# Debug mode
# DEFAULT_FLAGS=-fPIC -Wall -Wextra -D_GLIBCXX_DEBUG -D_GLIBCXX_DEBUG_PEDANTIC -I. -O0 -g -fopenmp -Wa,-ahl=$(@:.o=.s)
# DEFAULT_LDFLAGS=-fopenmp -g

# First set the flags to their defaults if not supplied externally.
CFLAGS?=$(DEFAULT_FLAGS)
CXXFLAGS?=$(DEFAULT_FLAGS)
LDFLAGS?=$(DEFAULT_LDFLAGS)

# Then add those flags we can't live without, unconditionally.
CFLAGS+=-fPIC -I. -pedantic
CXXFLAGS+=-fPIC -I. -std=c++0x
LDFLAGS+=-lm

all: heatmap_clustering_js_module
clean:
	rm -f heatmap_clustering_js_module heatmap_clustering_js_module.o cluster.o 


cluster.o: cluster.c cluster.h
	$(CC) -c $< $(CFLAGS) -o $@

heatmap_clustering_js_module: heatmap_clustering_js_module.o cluster.o
	$(CXX) $^ $(LDFLAGS) -o $@

heatmap_clustering_js_module.o: heatmap_clustering_js_module.cpp cluster.h
	$(CXX) -c $< $(CXXFLAGS) -DFIT_IMAGE -o $@