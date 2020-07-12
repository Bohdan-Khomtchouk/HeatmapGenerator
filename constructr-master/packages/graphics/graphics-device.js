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

"use strict";

/**
 * graphics device renders to canvas from json commands.  on a "new page" 
 * command, the device will create a canvas node and call a callback
 * function.  containers can then insert this node as appropriate.  
 * subsequent graphics commands operate on that node until it is closed
 * (which happens implicitly on a new page).
 */ 

const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const nativeImage = require('electron').nativeImage;
const clipboard = require('electron').clipboard;

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const xml = require( 'xml' );
const path = require( 'path' );
const PubSub = require( 'pubsub-js' );

const default_inline_graphics_size = { width: 600, height: 400 };
const graphics_devices = {};

let copy_inline_to_panel;

/**
 * render as svg (for export).  FIXME: this is not finished; line caps
 * and joins are not implemented, graphics are not implemented, and there
 * are some missing elements.
 * 
 * FIXME: in some cases I think we are incorrectly sending "none", when
 * what R means is "use the most recent value".
 * 
 */
function renderSVG(target){

	let mapStyle = function(s){
		let rslt = {};
		if( s.fill ) rslt.fill = s.fill;
		if( s.stroke ){
			if( s.stroke.color ) rslt.stroke = s.stroke.color;
			if( s.stroke.linewidth ) rslt['stroke-width'] = s.stroke.linewidth;
		}
		return rslt;
	};
	
	let attrs = null;
	let g = [];
	
	target.commands.forEach( function( elt ){
		// console.info(elt);
		let obj = null;
		switch( elt.cmd ){
		case 'new-page':
			attrs = { 
				xmlns: "http://www.w3.org/2000/svg",
				style: `background: ${elt.data.background};`, 
				width: `${elt.data.width}px`, 
				height: `${elt.data.height}px` };
			break;

		case 'poly':
			let points = elt.data.points.map( function( a ){
					return( a.join( "," ));
				}).join( " " );
			obj = { polyline: { _attr: { points: points, fill: 'none', stroke: 'none' }}};
			break;

		case 'line':
			obj = { line: { _attr: { x1: elt.data.x1, y1: elt.data.y1, x2: elt.data.x2, y2: elt.data.y2, fill: 'none', stroke: 'none' }}};
			break;

		case 'rect':
			let x = [ elt.data.x1, elt.data.x2 ].sort( function(a,b){ return a-b; } );
			let y = [ elt.data.y1, elt.data.y2 ].sort( function(a,b){ return a-b; } );
			obj = { rect: { _attr: {  x: x[0], y: y[0], width: x[1] - x[0], height: y[1] - y[0], fill: 'none', stroke: 'none' }}};
			break;

		case 'circle':
			obj = { circle: { _attr: { cx: elt.data.x, cy: elt.data.y, r: elt.data.r, fill: 'none', stroke: 'none' }}};
			break;

		case 'text':
			obj = { text: { _attr: { style: "font: " + elt.data.font + ";", x: elt.data.x, y: elt.data.y }, _cdata: elt.data.text }}
			if( elt.data.rot ){
				obj.text._attr.transform = `rotate(${-elt.data.rot} ${elt.data.x} ${elt.data.y})`;
			}
			break;

		case 'img':

			// add xlink ns
			attrs['xmlns:xlink'] = "http://www.w3.org/1999/xlink";

			obj = { image: { _attr: { preserveAspectRatio: 'none', 
				x: elt.data.x, y: elt.data.y - elt.data.height, 
				width: elt.data.width, height: elt.data.height, 
				'xlink:href': elt.data.dataURL }}};
			break;

		default:
			console.info("svg:unhandled packet", elt);

		}
		if( obj ){
			let style = elt.data.style ? mapStyle( elt.data.style ) : {};
			let key = Object.keys(obj)[0];
			for( let a in style) obj[key]._attr[a] = style[a];
			g.push( obj );		
		}
	});
		
	return xml({ svg: [{ _attr: attrs}, { g: g }]}, { declaration: true, indent: '  ' });

};

function context_menu(target, copyable){

	let menu = new Menu();
	menu.append(new MenuItem({ label: 'Copy', click: function() { 
		let dataURL = target.toDataURL('image/png');
		let native = nativeImage.createFromDataURL(dataURL);
		clipboard.writeImage(native);
	}}));
	
	menu.append(new MenuItem({ type: 'separator' }));
	menu.append(new MenuItem({ label: 'Save as PNG', click: function() { 
		let dataURL = target.toDataURL('image/png');
		let a = document.createElement( "a" );
		a.href = dataURL;
		a.download = target.id;
		a.click();
	}}));

	menu.append(new MenuItem({ label: 'Save as SVG', 
		enabled: (typeof target.commands !== "undefined"),
		click: function(){
			let svg = renderSVG( target );
			let blob = new Blob([svg], {type:'text/svg+xml'});
			let a = document.createElement("a");
			a.download = target.id + ".svg";
			a.href = window.URL.createObjectURL(blob);
			a.click();
		}}));

    menu.append( new MenuItem({ label: 'Copy to Panel',
        enabled: copyable,
        click: function(){
            copy_inline_to_panel();
        }    
    }));		 

	menu.append(new MenuItem({ type: 'separator' }));
	menu.append(new MenuItem({ label: 'Cancel' }));
	menu.popup(remote.getCurrentWindow());

}

const translate_font = function(core, font){
    if( core.Settings['font.map.sans'] )
        font = font.replace(/ sans-serif$/, ' ' + core.Settings['font.map.sans']);
    if( core.Settings['font.map.serif'] )
        font = font.replace(/ serif$/, ' ' + core.Settings['font.map.serif']);
    if( core.Settings['font.map.mono'] )
        font = font.replace(/ monospace$ /, ' ' + core.Settings['font.map.mono']);
    return font;
}

/**
 * constructor({
 *   node_callback,
 *   source,
 *   save
 * });
 * 
 * node_callback: called when a new graphics object (new page) is created.  
 * source: source for graphics events.  we will call source.on('graphics', ...).
 * save: optionally save the data used to create the image.  R's display
 * list gets wiped on new page so this might come in handy.
 * 
 * UPDATE: save moved to setting
 * FIXME: have graphics set its own size?
 */
function GraphicsDevice( core, opts ){

	let active_node = null;
	let context = null;
    
	let node_index = 0;
	let instance = this;
	 
    opts = opts || {};
	
	if( opts.source ){
		opts.source.on( 'graphics', process_graphics_command );
	}
    else if( opts.ipcsource ){
		opts.ipcsource.on( 'graphics', process_ipc_command );
    }
    
	this.save = core.Settings[ "save.graphics.data" ];
	PubSub.subscribe( core.Constants.SETTINGS_CHANGE, function( channel, data ){
		if( data.key === "save.graphics.data" ){
			instance.save = data.val;	
		} 
	});

	this.get_target = function(){
		return opts.target;
	};

	this.update_target = function(target){
		opts.target = target;
	};

	this.device_number = opts.device_number;

	/** set (or reset, or unset) event source */
	this.set_source = function( source ){
		if( opts.source ){
			opts.source.removeListener( 'graphics', process_graphics_command );
			opts.source = null;
		}
		else if( opts.ipcsource ){
			opts.ipcsource.removeListener( 'graphics', process_ipc_command );
			opts.ipcsource = null;
		}
		opts.source = source;
		if( source ) opts.source.on( 'graphics', process_graphics_command );
	};

	/** same as set, but for ipc sources */
	this.set_ipc_source = function( ipcsource ){
		this.set_source( null );
		opts.ipcsource = ipcsource;
		opts.ipcsource.on( 'graphics', process_ipc_command );
	}

	/**
	 * special wrapper method for ipcMessages, which are encapsulated.
	 * this is named so we can remove it later (if necessary)
	 */
	function process_ipc_command(event, message){
		process_graphics_command(message);
	}

	/**
	 * draw something based on a graphics packet.   
	 */
	function process_graphics_command(obj){
		
		// it's unfortunate that we do this on every call.  however,
		// the alternatives aren't much better -- if we disable the 
		// source, then rescaling won't work unless the device is 
		// active.  filtering on special channels might work, would 
		// save one filter pass.
		
		// + also ignoring events before we have been configured 
		//   (before there's a device number).  FIXME: use sync calls
		//   so that state is not possible.

		if( obj.device !== instance.device_number || !instance.device_number ) return;
	        
        if( opts.target === "Window" ){
            ipcRenderer.send( "graphics", obj );
            return;
        }
        
		switch( obj.cmd ){
		case 'new-page':
			// console.info( obj );
			
			active_node = document.createElement( "canvas" );
			active_node.classList.add( "graphics-device" );
			active_node.setAttribute( "style", "width: " + obj.data.width + "px; height: " + obj.data.height + "px; " );
			active_node.setAttribute( "width", obj.data.width );
			active_node.setAttribute( "height", obj.data.height );
			active_node.id = "R-Plot-" + (node_index++);

			if( instance.save ) active_node.commands = [obj]; 
						
			context = active_node.getContext("2d");
			context.resetTransform();
			if( obj.data.background ){
				context.fillStyle = obj.data.background ;
				context.fillRect( 0, 0, obj.data.width, obj.data.height );
			}
			if(( opts.target === "inline" || opts.target === "panel" ) && opts.inline_callback ){
				opts.inline_callback.call( this, active_node );
            } 			
            // window.active_node = active_node;

			active_node.addEventListener('contextmenu', function (e) {
				e.preventDefault();
				e.stopPropagation();

                let copyable = ( opts.target === "inline" && active_node === e.target );
				context_menu( e.target, copyable );

			}, false);
			
			break;
			
		case 'circle':
			// console.info(obj);
			context.beginPath();
			context.arc( obj.data.x, obj.data.y, obj.data.r, 0, Math.PI * 2 );
			if( obj.data.style.fill ){
				context.fillStyle = obj.data.style.fill;
				context.fill();
			}
			if( obj.data.style.stroke ){
				context.strokeStyle = obj.data.style.stroke.color;
				context.lineWidth = obj.data.style.stroke.linewidth;
				context.stroke();
			}
			break;
		
		case 'poly':
			// console.info(obj);
			context.beginPath();
			context.moveTo( obj.data.points[0][0], obj.data.points[0][1] );
			for( let i = 1; i< obj.data.points.length; i++ ){
				context.lineTo( obj.data.points[i][0], obj.data.points[i][1] );
			}
			if( obj.data.style.fill ){
				context.fillStyle = obj.data.style.fill;
				context.fill();
			}
			if( obj.data.style.stroke ){
				context.strokeStyle = obj.data.style.stroke.color;
				context.lineWidth = obj.data.style.stroke.linewidth;
				context.stroke();
			}
			break;
		
		case 'text':
			context.fillStyle = obj.data.fill;
			context.font = obj.data.font = translate_font(core, obj.data.font);
			if( obj.data.rot ){
				context.translate( obj.data.x, obj.data.y );
				context.rotate( -obj.data.rot / 180 * Math.PI );
				context.fillText( obj.data.text, 0, 0 );
				context.resetTransform();
			}
			else context.fillText( obj.data.text, obj.data.x, obj.data.y );
			break;
		
		case 'line':
			// console.info(obj);
			context.beginPath();
			context.moveTo( obj.data.x1, obj.data.y1 );
			context.lineTo( obj.data.x2, obj.data.y2 );
			if( obj.data.style.stroke ){
				context.strokeStyle = obj.data.style.stroke.color;
				context.lineWidth = obj.data.style.stroke.linewidth;
				context.stroke();
			}
			break;
			
		case 'rect':
			// console.info( obj);
			if( obj.data.style.fill ){
				context.fillStyle = obj.data.style.fill;
				context.fillRect( obj.data.x1, obj.data.y1, obj.data.x2 - obj.data.x1, obj.data.y2 - obj.data.y1 );
			}
			if( obj.data.style.stroke ){
				context.lineWidth = obj.data.style.stroke.linewidth;
				context.strokeStyle = obj.data.style.stroke.color;
				context.strokeRect( obj.data.x1, obj.data.y1, obj.data.x2 - obj.data.x1, obj.data.y2 - obj.data.y1 );
			}
			break;
			
		case 'img':
		
			// I think that R provides the bottom-left corner of the image
			// location -- correct? so offset y by the height.  
			
			// FIXME: confirm

			let img = new Image();
			img.src = obj.data.dataURL;
			context.drawImage( img, obj.data.x, obj.data.y - obj.data.height, obj.data.width, obj.data.height );
			break;
			
		default:
			console.info( "(Graphics) unhandled packet:", obj );
		}
		
        // yes, R saves the graphics command stack, and yes, this can
		// be a waste of space; but, if we want to allow conversion to
		// svg, and in particular if we want to do that once the graphic
		// is "finished", we need to save our own stack.
		
        // moved to end to capture (and persist) font mapping

		if( instance.save && active_node && obj.cmd !== "new-page" ){
			active_node.commands.push( obj );
		}

	}
  
};

// utility function to measure text strings.  I think the line height 
// property is affecting vertical size.  

GraphicsDevice.prototype.measure_text_canvas = function( text, font ){

	if( !GraphicsDevice.prototype.mt_canvas ){
		GraphicsDevice.prototype.mt_canvas = document.createElement( "canvas" );
		GraphicsDevice.prototype.mt_canvas.id = "gd_text_measurement_canvas";
		GraphicsDevice.prototype.mt_canvas.width = 200;
		GraphicsDevice.prototype.mt_canvas.height = 200;
		document.body.appendChild( GraphicsDevice.prototype.mt_canvas );
		GraphicsDevice.prototype.mt_ctx = GraphicsDevice.prototype.mt_canvas.getContext( "2d" );
		GraphicsDevice.prototype.mt_canvas.setAttribute( "style", "position: absolute; left: -1000px;" );
		GraphicsDevice.prototype.mt_ctx.textBaseline = "hanging";
	}

	// console.info( "baseline? ", GraphicsDevice.prototype.mt_ctx.textBaseline )

	GraphicsDevice.prototype.mt_ctx.font = font;
	let tm = GraphicsDevice.prototype.mt_ctx.measureText(text); 
	let rslt =  {
		height: tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent
	};
	for( let key in tm ){ rslt[key] = tm[key] }; // Object.keys returns []
	return rslt;

};

GraphicsDevice.prototype.measure_text_node = function( text, style ){
	
	if( !GraphicsDevice.prototype.mt_node ){
		GraphicsDevice.prototype.mt_node = document.createElement( "div" );
		GraphicsDevice.prototype.mt_node.id = "gd_text_measurement_node";
		document.body.appendChild( GraphicsDevice.prototype.mt_node );
	}
	
	// chrome renders even if opacity is 0, although it should be off-screen anyway
	
	if( style ) style = "font: " + style;

	GraphicsDevice.prototype.mt_node.setAttribute( "style", 
		`z-index: 2500; background: white; color: blue; position: absolute; top: 200px; left: 0px; border: 2px solid green; padding: 0; margin: 0; ` + ( style || "" ));

	let size = { "width": 0, "height": 0 };
	text.split( "\n" ).forEach( function( line ){
		GraphicsDevice.prototype.mt_node.textContent = line;
		size.height += GraphicsDevice.prototype.mt_node.clientHeight;
		size.width = Math.max( size.width, GraphicsDevice.prototype.mt_node.clientWidth );
	});

	// FIXME: clean up the node? probably unecessary

	return size;
	
};

function show_graphics_panel( core ){

	return new Promise( function( resolve, reject ){
		
		let panel = document.querySelector( "graphics-panel" );
		let timeoutID;
		let timeoutCount = 0;

		let resize_to_panel = function(){

			window.P = panel;

			if( panel.graphics_events ){
				let width = panel.$.target.clientWidth;
				let height = panel.$.target.clientHeight;

				if( !width || !height ){

					if( timeoutID ) clearTimeout( timeoutID );
					if( timeoutCount > 10 ) throw( "resize graphics panel failed" );
					timeoutCount++;
					timeoutID = setTimeout(function() {
						resize_to_panel();
					}, 100 );
					return;
				}
				
				timeoutCount = 0;

				if( !panel.cachedSize || panel.cachedSize.width !== width || panel.cachedSize.height !== height ){
					panel.cachedSize = { width: width, height: height };
					requestAnimationFrame( function(){
						if( graphics_devices.panel && graphics_devices.panel.device_number ){
							let cmd = `jsClientLib:::device.resize( ${graphics_devices.panel.device_number}, ${width}, ${height}, T );`;
							core.R.internal( cmd, "graphics.panel.resize" );
						}
					});
				}

			}
		};

		if( !panel ){

			panel = document.createElement( "graphics-panel" );
			panel.setAttribute( "data-preserve", true );
			panel.classList.add( "panel" );
			
			panel.addEventListener( "close", function(e){
				PubSub.publish( core.Constants.SIDE_PANEL_REMOVE, panel );
			});
			
			let container = document.createElement( "div" );
			container.className = "panel-graphics-container";
			panel.appendChild( container );
			window.addEventListener('resize', resize_to_panel );
			
			panel.onShow = function(){
				panel.graphics_events = true;
				requestAnimationFrame( function(){
					resize_to_panel();
				});
			}

			panel.onHide = function(){
				panel.graphics_events = false;
			};

			panel.onUnload = function(){
				panel.graphics_events = false;
			};
			
		}
		
        let pos = core.Settings['graphics.panel.position'];
        if( !pos || ( typeof pos !== "object" )) pos = { column: 0, row: 1 };

		PubSub.publish( core.Constants.SIDE_PANEL_ATTACH, { position: pos, node: panel });
		resolve( panel );
		
	});
	
}

/**
 * factory method wraps up js and R calls
 */
const create_graphics_device = function(core, opts){
	return new Promise( function( resolve, reject ){
		opts.size = opts.size || { width: 600, height: 400 };
		core.R.internal( `jsClientLib:::device( name="json-${opts.name}", width=${opts.size.width}`
			+ `, height=${opts.size.height}, pointsize=14 )` ).then( function(rsp){	
			if( !rsp.response ) throw( rsp );
			graphics_devices[opts.name] = new GraphicsDevice(core, {
				device_number: rsp.response,
				source: core.R,
				target: opts.target || opts.name,
				inline_callback: opts.inline_callback,
				notify_callback: opts.notify_callback 
			});
			resolve();
		});
	});
};

module.exports = {
	
	init: function( core ){

        copy_inline_to_panel = function(){
            if(graphics_devices.panel.device_number){
                let i = graphics_devices.inline.device_number;
                let p = graphics_devices.panel.device_number;
                core.R.internal( `(function(){ x <- dev.cur(); dev.set(${i}); dev.copy(which=${p}); dev.set(x); })()` );
            }
        };

		// this may get called if we're setting defaults, say on the first run,
		// before a graphics device is initialized.  watch out for that and 
		// don't call it if the device isn't available.

		PubSub.subscribe( core.Constants.SETTINGS_CHANGE, function(channel, obj){
			switch( obj.key ){
			case "graphics.target":
				if( graphics_devices[obj.val] && graphics_devices[obj.val].device_number ){
					core.R.internal( `dev.set(${ graphics_devices[obj.val].device_number })`)
				}
				break;			

			case "inline.graphics.size":
				if( graphics_devices.inline && graphics_devices.inline.device_number ){
					let cmd = `jsClientLib:::device.resize( ${graphics_devices.inline.device_number}, ${obj.val.width}, ${obj.val.height}, F)`;
					core.R.internal( cmd );
				}
				break;
			};
		});

		PubSub.subscribe( "menu-click", function(){
			var data = arguments[1];
			switch( data.message ){
			case "graphics-panel":
				show_graphics_panel(core);
				break;
			}
		});

		// these hooks call static functions

		core.Hooks.install( "sync-request-p", function(hook, req){
			let cmd = req.command ? req.command : req.$data ? req.$data.command : null;
			if( cmd === "measure-text" ){
				let size = GraphicsDevice.prototype.measure_text_canvas( req.text, req.font );
				return Promise.resolve( size.width );
			}
			if( cmd === "font-metrics" ){
				let size = GraphicsDevice.prototype.measure_text_canvas( req.text, req.font );
				let ascent = Math.abs( size.actualBoundingBoxAscent ) + .5 ;
				let descent = 0;
				return Promise.resolve( `${ascent},${descent},${size.width}` );
			}
			return null;
		});

		return new Promise( function( resolve, reject ){

			create_graphics_device(core, {
				name: "inline",
				size: core.Settings[ "inline.graphics.size" ] || default_inline_graphics_size,
				inline_callback: function(node){
					PubSub.publish(core.Constants.SHELL_INSERT_NODE, [node, true]);
				},
				notify_callback: function(msg){
					PubSub.publish(core.Constants.SHELL_MESSAGE, [msg, "shell-system-information" ]);
				}
			}).then( function(){

				return create_graphics_device(core, {
					name: "panel",
					size: default_inline_graphics_size,
					inline_callback: function(node){
						show_graphics_panel(core).then( function(panel){
							let container = panel.querySelector( ".panel-graphics-container" );
							let previous = container.querySelector( "canvas" );
							if( previous ) container.removeChild( previous );
							container.appendChild(node);
						});
					},
					notify_callback: function(msg){
						PubSub.publish( core.Constants.SHELL_MESSAGE, [msg, "shell-system-information" ]);
					}
				});
				
			}).then( function(){

				let current = core.Settings['graphics.target'] || "inline";
				if( graphics_devices[current] ){
					let currentDevice = graphics_devices[current].device_number;
					return core.R.internal( `dev.set(${currentDevice})` );
				}
				else return Promise.resolve();

				}).then( function(){
				resolve();
			});
			      
		});

	},

	get_graphics_targets: function(){
		return Object.keys( graphics_devices );
	}

};

