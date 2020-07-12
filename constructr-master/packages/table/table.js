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


var path = require( "path" );

const PubSub = require( "pubsub-js" );

const electron = require('electron');
const remote = electron.remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

var menu_target = null;
var menu_index = null;

var instances = [];

var R = null;

var updateData = function( inst ){

	var set = inst ? [inst] : instances;
	set.forEach( function( instance ){
		if( !instance.node || !instance.field || !instance.visible ) return;
        let cmd;

        if( instance.menutype === "watch" ){
            let idx = instance.index + 1; // r indexing
            cmd = `eval( .js.client.data.env$watches[[${ idx }]]$expr, envir=.js.client.data.env$watches[[${ idx }]]$envir )`;
        }
        else {
            cmd = `get0("${instance.field}")`;
        }

		R.internal( cmd ).then( function( rsp ){
			if( rsp.response && rsp.response.$data ){
                if( rsp.response.$type === "matrix" ) updateFromMatrix( rsp.response, instance );
				else updateFromFrame( rsp.response, instance );
            }
            else {

                // it's gone; stop showing this table? ...

            }
		});

	});
};

/**
 * format an R date.  From docs:
 * 
 * Dates are represented as the number of days since 1970-01-01, with negative values for earlier dates. 
 * 
 */
const format_date = function(days){

    let date = new Date();
    date.setTime( days * 86400000 ); 

    // why is month 0-based and date 1-based?
    let m = date.getUTCMonth() + 1;
    let d = date.getUTCDate();

    return `${date.getUTCFullYear()}-${(m<10?"0":"")+m}-${(d<10?"0":"")+d}`;

}

const updateFromMatrix = function(mat, instance){

//    console.info( mat );

    let rows = mat.$nrows;
    let cols = mat.$ncols;

//    console.info( rows, cols );

    let colclasses = [];
    if( mat.$data.length ){
        if( typeof mat.$data[0] === "string" )
            for( let i = 0; i< cols; i++ ) colclasses[i] = "string";
    }

    // construct a data array: column-based

    let data = new Array( cols );
    for( let i = 0; i< cols; i++ ){
        data[i] = mat.$data.splice( 0, rows );
    }

    // dimnames: 0=rows, 1=cols (always? Y)

    // console.info( data );

    let rownames = true;
    let colnames = true;
    
    if( mat.$dimnames && mat.$dimnames.$data ){
        if( mat.$dimnames.$data[0] ) rownames = mat.$dimnames.$data[0];
        if( mat.$dimnames.$data[1] ) colnames = mat.$dimnames.$data[1];
    }

    instance.node.update({ 
        data: data, 
        column_headers: colnames, 
        row_headers: rownames,
        column_classes: colclasses
    });

    //instance.header.title = `Table view: ${instance.field} ${data[0] ? data[0].length : 0}x${data.length}`;


}

const updateFromFrame = function(df, instance){
	
    let table = [], 
        column_headers = [], 
        column_classes = [],
        row_headers;
	
	var data = df.$data;
	var cols = Object.keys( data );
	if( cols.length !== 0 ) {
	
        // convert factors -> strings. 
        // update: +Date. other classes? 

        let tstart = process.hrtime();

        let len = 0;
        let names = df.$names;
        table = names.map( function( name, idx ){
            let arr;
            column_headers.push( name );

            if( Array.isArray( df.$data[name] )){
                arr = df.$data[name];
                if( arr.length ){
                    if( typeof arr[0] === "string" ) column_classes[idx] = "string";
                }
            }
            else if( typeof df.$data[name] === "object" ){
                let obj = df.$data[name];
                if( obj.$type === "factor" ){
                    for( let i = 0; i< obj.$data.length; i++ ){
                        obj.$data[i] = obj.$levels[obj.$data[i]-1];
                    }
                    column_classes[idx] = "factor";
                }
                else if( obj.$class === "Date" ){
                    for( let i = 0; i< obj.$data.length; i++ ){
                        obj.$data[i] = format_date(obj.$data[i]);
                    }
                    column_classes[idx] = "date";
                }
                arr = obj.$data;
            }
            len = Math.max( len, arr.length );
            return arr;
        });

        row_headers = df.$rownames || true;        

        let tend = process.hrtime(tstart);

	}
    
    instance.node.update({ 
        data: table, 
        column_headers: column_headers, 
        row_headers: row_headers,
        column_classes: column_classes
    });

    //instance.header.title = `Table view: ${instance.field} ${table[0] ? table[0].length : 0}x${table.length}`;

};

var createInstance = function( core, field, id, menutype, menuindex ){

    let node = document.createElement( "display-grid" );
    let instance = { 
        node: node, 
        field: field, 
        menutype: menutype,
        index: menuindex,
        visible: true,
        id: id || 0 
    };

    // drop any instances with the same id (!==0)
    instances = instances.filter( function( inst ){
        return ( inst.id === 0 || inst.id !== id );
    });

    instances.push( instance );

    let func = function(){
        if( instance.visible ){
			setImmediate( function(){
				updateData.call( this, instance );
			}, this );
        }
    };

    let token = 0;

    // return rslt;

    let pos = core.Settings["table.panel.position"];
    if( !pos ) pos = core.Settings["details.panel.position"];
    if( !pos ) pos = { row: 3, column: 0 };

    let panel = document.createElement( "div" );
    panel.className = "panel";

    let header = document.createElement( "panel-header" );
    header.title = "Table view: " + field;

    var closelistener = function(){
    header.removeEventListener( "close", closelistener );
        PubSub.publish( core.Constants.SIDE_PANEL_REMOVE, panel );
    };

    header.addEventListener( "close", closelistener );
    panel.appendChild( header );
    panel.appendChild( node );

    panel.onShow = function(){
        token = PubSub.subscribe( 'resize', func );
        instance.visible = true;
        setImmediate( function(){
            updateData.call( this, instance );
        }, this );
    };
    
    panel.onHide = function(){
        if( token ) PubSub.unsubscribe( token );
        token = 0;
        instance.visible = false;
    };

    panel.onUnload = function(){
        if( token ) PubSub.unsubscribe( token );
        token = 0;
        instance.visible = false;
        instance.node = null;
    };

    //instance.panel = panel;
    //instance.header = header;

    PubSub.publish( core.Constants.SIDE_PANEL_ATTACH, { node: panel, position: pos });

};


module.exports = {

	init: function(core){
		
		R = core.R;
        
		// install hooks
		
		core.Hooks.install( "update", function(){ // update: data changes (maybe)
			updateData();
		});

        /*
        core.Hooks.install( "preferences_panel", function(){
            console.info( "hook; tpp " + Settings["table.panel.position"]);
            return new PreferencesSelect({
               label: "Table panel position",
               value: Settings["table.panel.position"] || 2 ,
               setting: "table.panel.position",
               options: [ 2, 3, 4 ]
            });
        });
        */
        
		let menuitem = new MenuItem({
			label: "View table",
			click: function( menuitem ){
				createInstance( core, menu_target, 100, menuitem.menutype, menu_index );
			}
		});


		// CM: add a menu item if it's a frame (or descends from frame)
		core.Hooks.install( "locals_context_menu", function( hook, menu ){
			menu.insert( 3, menuitem );
            menuitem.menutype = "locals";
			menu_target = menu.target.name;
			menuitem.visible = core.Utils.array_cross_match( menu.target.rclass, [ 'data.frame', 'matrix' ]);
		});

        // (optionally) override default click on locals
		core.Hooks.install( "locals_click", function( hook, opts ){

            if( !core.Utils.array_cross_match( core.Settings["locals.default.view"], "table" ) 
                || !core.Utils.array_cross_match( opts.rclass, [ 'data.frame', 'matrix' ])) return false;
            
            // we have to be well-behaved
            if( opts.handled ) return false;
            opts.handled = true;

            createInstance( core, opts.name, 100, "locals", 0 );

            return true;
        });

        core.Hooks.install( "watches_context_menu", function( hook, menu ){
            menu.insert( 3, menuitem );
            menuitem.menutype = "watch";
			menu_target = menu.target.name;
            menu_index = menu.target.index;
			menuitem.visible = core.Utils.array_cross_match( menu.target.rclass, [ 'data.frame', 'matrix' ]);
        });

        core.Hooks.install( "watches_click", function( hook, opts ){

            if( !core.Utils.array_cross_match( core.Settings["watches.default.view"], "table" ) 
                || !core.Utils.array_cross_match( opts.rclass, [ 'data.frame', 'matrix' ])) return false;

            // we have to be well-behaved
            if( opts.handled ) return false;
            opts.handled = true;

            createInstance( core, opts.name, 100, "watch", opts.index );
            return true;

        });
        
	}
	
};

