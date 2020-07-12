/**
 * Copyright (c) 2016 Structured Data, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

'use strict';

if (require('electron-squirrel-startup')) return; // installer

const path = require( "path" );
const electron = require('electron');
const electronwindowstate = require('electron-window-state');

const {ipcMain} = electron;
const {app} = electron;
const {BrowserWindow} = electron;

let win;

app.on('ready', function(){

	let windowstate = electronwindowstate({
		defaultWidth: 1000,
		defaultHeight: 800
	});
	
	win = new BrowserWindow({
		'x': windowstate.x,
		'y': windowstate.y,
		'width': windowstate.width,
		'height': windowstate.height,
		'webPreferences': {
			'experimentalCanvasFeatures': true
		}
	});
	
	win.main_process_args = process.argv.slice(0);
	
    windowstate.manage(win);
    win.loadURL('file://' + __dirname + '/index.html');
    win.on('closed', function() { win = null; });

});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (win === null) {
		createWindow();
	}
});

ipcMain.on('system', function(event, arg){
	if( arg === "quit" ){
		app.quit();
	}
});

ipcMain.on('download', function(event, opts = {}){

	let url = opts.url;
	let dest = opts.destfile;
	let listener = function(event, item, webContents){
		
		let totalBytes = item.getTotalBytes();
		let filePath = dest || path.join(app.getPath('downloads'), item.getFilename());

		// NOTE: this fails with unix-y paths.  R is building these paths incorrectly

		if( process.platform === "win32" ){
			filePath = filePath.replace( /\//g, "\\" );
		}
		item.setSavePath(filePath);

		item.on('updated', () => {
			win.setProgressBar(item.getReceivedBytes() / totalBytes);
			webContents.send( 'download-progress', { received: item.getReceivedBytes(), total: totalBytes });
		});

		item.on('done', (e, state) => {

			if (!win.isDestroyed()) {
				win.setProgressBar(-1);
			}

			if (state === 'interrupted') {
				// electron.dialog.showErrorBox('Download error', `The download of ${item.getFilename()} was interrupted`);
			}

			webContents.send( 'download-complete', { path: filePath, name: item.getFilename(), size: totalBytes, state: state });
			webContents.session.removeListener('will-download', listener);
			
		});

	};
	
	win.webContents.session.on( 'will-download', listener );
	win.webContents.downloadURL(url);
	
});
