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

const PubSub = require( "pubsub-js");

/**
 * rewrite of side panel to combine ideas in side panel, stacked panel, and 
 * fix the interplay between them.
 * 
 * basically there should be a panel on the left and a panel on the right 
 * (TODO: extend to center as well).  each one can have an arbitrary set of
 * rows and columns (columns are dominant), and you can randomly assign a
 * node to an (R,C) address in the panel -- or take over the panel entirely.
 * 
 * if you take over the panel entirely, content is stacked -- so removing the 
 * new item will bring back the old item.  
 */

const PARENT_ID = "shell-layout";
const CACHE_ID = "orphans";

let cache = null;

const Column = function( parent ){

    let count = 0;
    let rows = [];

    this.container = parent.insertPane(50, -1);
    let splitter = document.createElement( "split-panel" );
    splitter.direction = "vertical";
    this.container.appendChild(splitter);

    this.find = function( node ){
        for( let r = 0; r< rows.length; r++ ){
            if( rows[r] && rows[r].getContent() === node ) return r;
        }
        return -1;
    }

    this.get_count = function(){ return count; }

    this.remove = function( r ){
        
        if( !rows[r] ){
            console.warn( "Invalid row in column.remove", r );
            return;
        }
        
        let test = rows[r].getContent();
        if( test ){
            if( test.onHide ) test.onHide.call(this);
            rows[r].removeChild(test);
            if( test.hasAttribute( "data-preserve" )) cache.appendChild(test);
            else if( test.onUnload ) test.onUnload.call(this);
        }

        splitter.removePane( rows[r] );
        delete rows[r];

        count--;

    };

    this.attach = function( r, node ){

        //console.info( "Attach @", r, node );

        if( !rows[r] ){
            //console.info( "Creating row", r );

            // we use row indexes, but the array is sparse. to figure
            // out the insert index, you can walk children and look at 
            // IDs; or we can guess based on populated row cells.

            let insert_index = 0;
            for( let i = 0; i< r; i++ ) if( rows[i] ) insert_index++;

            count++;
            rows[r] = splitter.insertPane(undefined, insert_index);
        }

        // r,c has only one child.  if it's already
        // attached, do nothing (FIXME: callback?)

        let test = rows[r].getContent();
        if( test !== node )
        {
            if( test ){
                if( test.onHide ) test.onHide.call(this);
                rows[r].removeChild(test);
                if( test.hasAttribute( "data-preserve" )) cache.appendChild(test);
                else if( test.onUnload ) test.onUnload.call(this);
            }

            if( node ){
                if( node.parentNode ) node.parentNode.removeChild(node);
                rows[r].appendChild(node);
                if( node.onShow ) node.onShow.call(this);
            }

        }
        return rows[r];

    };

}

const SidePanel = function( parent, insert_position, id ){

    let columns = [];

    let splitter = null;
    let container = null;
    let count = 0; 

    let history = [];

    this.id = id;

    this.pop = function( node ){
        if( !container ) return;
        let ctx = container.getContent();

        // FIXME: history

        if( ctx !== node ){
            return;
        }        

        container.removeChild(ctx);
        if( ctx.onHide ) ctx.onHide.call(this);

        if( ctx.hasAttribute( "data-preserve" )) cache.appendChild(ctx);
        else if( ctx.onUnload ) ctx.onUnload.call(this);

        if( splitter ){
            container.appendChild( splitter );
        }
        else {
            parent.removePane( container );
            container = splitter = null;
        }

    };

    this.push = function( node ){

        if( !container ){
            //console.info( "Creating container" );
            if( typeof insert_position === "undefined" ) insert_position = -1;
            container = parent.insertPane( 33, insert_position, "center-pane" );
        }

        let ctx = container.getContent();
        if( ctx === node ){

        }
        else {
            if(ctx) container.removeChild(ctx);

            // FIXME: notify children

            container.appendChild( node );
            if( node.onShow ) node.onShow.call(this);
        }
        node.__position = { panel: id };

    };

    /**
     * attach node at (r,c).  returns the containing panel so
     * you can (if desired) not pass a node argument, and attach
     * later.
     */
    this.attach = function( r, c, node ){

        if( !columns[c] ){

            if( !container ){
                //console.info( "Creating container" );
                if( typeof insert_position === "undefined" ) insert_position = -1;
                container = parent.insertPane( 33, insert_position, "center-pane" );
            }

            if( !splitter ){
                //console.info( "Creating splitter" );
                splitter = document.createElement( "split-panel" );
                splitter.direction = "horizontal";
            }

            //console.info( "Creating column", c );
            columns[c] = new Column(splitter);
            count++;

        }

        let ctx = container.getContent();
        if( ctx !== splitter ){
            if( ctx )  container.removeChild( ctx );
            container.appendChild( splitter );
        }

        columns[c].attach( r, node );

        if( node ){
            node.__position = { row: r, column: c, panel: id };
        }

    };

    this.remove = function(node){

        let position = {};

        if( node.__position ) Object.assign( position, node.__position );
        else {
            for( let c = 0; c< columns.length; c++ ){
                if( columns[c] ){
                    let r = columns[c].find( node );
                    if( r >= 0 ){
                        position = { row: r, column: c };
                        break;
                    }
                }
            }            
        }

        if((typeof position.row === "undefined") || (typeof position.column === "undefined")){
            console.warn( "Node not found", node );
        }
        if( !columns[position.column] ) throw( "Invalid column in remove: " + position.column );

        //console.info( "Remove", position );
        columns[position.column].remove( position.row );

        if( columns[position.column].get_count() === 0 ){
            //console.info( "Dropping column...");
            splitter.removePane( columns[position.column].container );
            delete columns[position.column];
            count--;

            if( count === 0 ){
                //console.info( "removing container" );
                parent.removePane( container );
                container = splitter = null;
            }

        }

        node.__position = null;

    };

}

module.exports.init = function(core){

    let parent = document.getElementById(PARENT_ID);
    cache = document.getElementById(CACHE_ID);

    // nodes aren't created until populated, so it's ok to 
    // create these ahead of time

    let sides = {
        left: new SidePanel(parent, 0, "left"),
        right: new SidePanel(parent, -1, "right")
    };

    let default_side = sides.right;

    Object.assign( core.Constants, {

        // this is for row/column layout
        SIDE_PANEL_ATTACH: "side-panel-attach",
        SIDE_PANEL_REMOVE: "side-panel-remove",

        // this is for whole-panel operations
        SIDE_PANEL_PUSH: "side-panel-push",
        SIDE_PANEL_POP: "side-panel-pop"

    });

    PubSub.subscribe( core.Constants.SIDE_PANEL_POP, function( channel, node ){
        if( !node ) throw( "node required in pop()");
        let side = node.position ? sides[node.position.side] || default_side : default_side;
        side.pop( node );
    });

    PubSub.subscribe( core.Constants.SIDE_PANEL_PUSH, function( channel, opts ){
        opts = opts || {};
        let side = opts.position ? sides[opts.position.side] || default_side : default_side;
        side.push( opts.node );
    });

    PubSub.subscribe( core.Constants.SIDE_PANEL_ATTACH, function(channel, opts){
        opts = opts || {};
        let side = opts.position ? sides[opts.position.side] || default_side : default_side;
        side.attach( opts.position.row || 0, opts.position.column || 0, opts.node );
    });

    PubSub.subscribe( core.Constants.SIDE_PANEL_REMOVE, function(channel, node){
        let side = default_side;
        if( node.__position ) side = sides[node.__position.panel] || default_side;
        side.remove( node );
    });

};

