# Heatmap Generator
![](https://img.shields.io/github/stars/Bohdan-Khomtchouk/HeatmapGenerator.svg) ![](https://img.shields.io/github/forks/Bohdan-Khomtchouk/HeatmapGenerator.svg) ![](https://img.shields.io/github/issues/Bohdan-Khomtchouk/HeatmapGenerator.svg)

## Features

- Native support for MacOS, Windows, and Linux
- Built on R's most ubiquitous package: gplot
- Easy to use interface for efficient data analysis workflow
- Full-featured, with hierarchical clustering, dendrogram support, and labelling customization
---------------
##Developer Setup
1. Navigate to BetaApp directory.
2. Run `npm install` to download/update all necessary modules.
3. If on MacOS, make sure you have R in your global $PATH. If on Windows, it should be in `C:\"Program Files"\R\R-*.*.*\bin\`.
3. Use `npm run dev` to run in development mode (app restarts on saved change).
4. Use `npm run buildmac` to build a production app for MacOS (Disk Image).
5. Use `npm run buildwin` to build a production app for Windows (Executable File).
6. Use `npm run build` to build a production app for both MacOS & Windows.

##User Setup
1. If on MacOS, open the Disk Image (.dmg). If on Windows, open the Executable File (.exe).
2. See which dependencies are not installed (Heatmap Generator will automatically check for you). Before proceeding, resolve all dependency-related issues (the software will guide you in resolving these issues).
3. Click on the Home tab to start making heatmaps. Data must be provided in .csv or .txt format. Formatting requirements will be included later.
4. If on MacOS, heatmaps will be stored at `~/HMG`. If on Windows, heatmaps will be stored at `C:\Users\{USER_PROFILE}\HMG`. Always in png format.
