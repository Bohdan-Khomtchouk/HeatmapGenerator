![hmg_logo](https://cloud.githubusercontent.com/assets/9893806/16899058/9f5dc67c-4bc3-11e6-81cd-66de7a180660.png)

# HeatmapGenerator

[![Download HeatmapGenerator](https://img.shields.io/sourceforge/dt/heatmapgenerator.svg)](https://sourceforge.net/projects/heatmapgenerator/files/latest/download)
[![Download HeatmapGenerator](https://img.shields.io/sourceforge/dm/heatmapgenerator.svg)](https://sourceforge.net/projects/heatmapgenerator/files/latest/download)

## Breaking News

HeatmapGenerator is celebrating its 5th anniversary this year (2019).  To commemorate, we are writing a new manuscript entitled _HeatmapGenerator turns 5: celebrating the fifth anniversary of the original heatmap GUI (with a total rewrite!)_ to be submitted for publication to _F1000 Research_.  This rewrite will turn HeatmapGenerator into an awesomely beautiful [Electron app](https://electronjs.org), borrowing some of the incredible user features and lessons we've learned from our past experience designing the world's fastest heatmap software, [shinyheatmap](https://doi.org/10.1371/journal.pone.0176334).  Our goal is to create the world’s most sophisticated heatmap computing infrastructure, brought to you (dear user) from the comfort and security of your own dock/desktop.  Stay tuned for the newly re-engineered HeatmapGenerator ... redesigned for amazing pro features, blazing performance, and a modern native look across all operating systems to elevate and enhance your user experience.  

## About

HeatmapGenerator is a graphical user interface software program written in C++, R, and OpenGL to create customized gene expression heatmaps from RNA-seq and microarray data in medical research. HeatmapGenerator can also be used to make heatmaps in a variety of other non-medical fields.

HeatmapGenerator is peer-reviewed published software (http://www.scfbm.org/content/9/1/30). When using this software, please cite: [Khomtchouk et al.: “HeatmapGenerator: High performance RNAseq and microarray visualization software suite to examine differential gene expression levels using an R and C++ hybrid computational pipeline.” Source Code for Biology and Medicine, 2014 9:30].

Bohdan Khomtchouk wishes to acknowledge the support of the Department of Defense (DoD) through the National Defense Science & Engineering Graduate Fellowship (NDSEG) Program.

This research was conducted with Government support under and awarded by DoD, Army Research Office (ARO), National Defense Science and Engineering Graduate (NDSEG) Fellowship, 32 CFR 168a.

For more information about HeatmapGenerator, please visit: http://psychiatry.med.miami.edu/research/resources/heatmapgenerator

## Installation

### Requirements

* Mac OS X >= 10.8 (Mountain Lion, Mavericks, Yosemite, El Capitan)
* Windows 64-bit OS >= Windows 7/8 or XP
* Linux (currently under development)
* R programming language
  * R `gplots` package (as well as internal package dependencies: `gtools`, `gdata`, and `caTools`) are automatically installed by HeatmapGenerator3.1+

## How to run

##### To compile this source code, enter the following in a command line prompt:
* `fltk-config --use-images --use-gl --compile HeatmapGenerator_Macintosh_OSX.cxx`

##### To download the ready-to-use binary executable files:
* Go to: http://sourceforge.net/projects/heatmapgenerator/

## Screenshots

![](http://a.fsdn.com/con/app/proj/heatmapgenerator/screenshots/HeatmapGeneratorv2_screenshot_MAC.png)

![](http://a.fsdn.com/con/app/proj/heatmapgenerator/screenshots/large_input_simple_heatmap_new.png)

## YouTube

[![IMAGE ALT TEXT HERE](http://a.fsdn.com/con/app/proj/heatmapgenerator/screenshots/youtube_tutorial_screenshot.png)](https://www.youtube.com/watch?v=DYgr6Zm6BaA)
