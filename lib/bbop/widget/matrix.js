if ( typeof bbop == "undefined" ){ var bbop = {}; }
if ( typeof bbop.widget == "undefined" ){ bbop.widget = {}; }
if ( typeof bbop.widget.matrix == "undefined" ){ bbop.widget.matrix = {}; }

(function() {

bbop.widget.matrix.renderer = renderer;

// if there are multiple instances of this widget on the page, this will
// make sure that their CSS rules don't step on each other
var this_id = 0;

function renderer(parent, row_descriptors, col_descriptors,
                  cell_renderer, config) {
    var default_config = {
        // cell_width: null means to set the width based on cell contents;
        // otherwise cell_width is a fixed width per cell in pixels
        cell_width: null,
        cell_height: 24,
	cell_border: 1,
        cell_padding: 4,
        cell_font: "Helvetica, Arial, sans-serif",

        header_height: 50,
        header_font: "Helvetica, Arial, sans-serif",
        show_headers: true,
        transition_time: "0.8s"
    };

    if( "object" == typeof config ){
        this.config = bbop.core.merge(default_config, config);
    }else{
        this.config = default_config;
    }

    this.parent = ( ( "string" == typeof parent )
		    ? document.getElementById(parent)
		    : parent );
    if (this.parent === undefined) {
        throw "can't find parent element " + parent;
    }

    // css width/height don't include padding or border, but
    // offsetWidth/offsetHeight do
    this.offset_size_delta = ( ( this.config.cell_padding * 2 )
                               + ( this.config.cell_border ) );
    // setting font size from cell height.  We'd like to set font cap height
    // directly, but we can only set em box size.  Cap height on average is
    // 70% of em box size, so we'll set the font size to the intended
    // height divided by 0.7
    var cell_font_size = ( ( this.config.cell_height
                             - this.offset_size_delta )
                           / 0.7 );
    var header_font_size;
    if (null == this.config.cell_width) {
        header_font_size = ( ( this.config.header_height
                               - this.offset_size_delta )
                             / 0.7 );
    } else {
        header_font_size = ( ( this.config.cell_width
                               - this.offset_size_delta )
                             / 0.7 );
    }

    var css_prefix = "matrix_" + this_id++;
    this.header_class = css_prefix + "_header";
    this.inner_header_class = css_prefix + "_inner";
    this.cell_class = css_prefix + "_cell";
    this.fixed_width = (null != this.config.cell_width);

    this.row_descriptors = row_descriptors;
    this.col_descriptors = col_descriptors;

    this.headers = [];
    this.matrix = [];
    this.num_cols = col_descriptors.length;
    this.num_rows = row_descriptors.length;
    //rowdesc_map: row descriptor -> matrix row index
    this.rowdesc_map = {};
    //coldesc_map: col descriptor -> matrix col index
    this.coldesc_map = {};
    //rowindex_map: displayed row index -> matrix row index
    this.rowindex_map = Array(row_descriptors.length);
    //colindex_map: displayed col index -> matrix col index
    this.colindex_map = Array(col_descriptors.length);
    this.grid_vert = [];
    this.grid_horiz = [];

    this.vert_class = css_prefix + "_vert";
    //create vertical grid lines
    for (var i = 0; i < col_descriptors.length; i++) {
        var gridline = document.createElement("div");
        gridline.className = this.vert_class;
        gridline.style.top = "0px";
        this.parent.appendChild(gridline);
        this.grid_vert.push(gridline);
    }
    this.last_vert_gridline = document.createElement("div");
    this.last_vert_gridline.className = this.vert_class;
    this.last_vert_gridline.style.cssText = [
        "top: 0px;", "width: 0px;", "right: 0px;",
        "margin-left: 0px;", "margin-right: 0px;",
        "padding-left: 0px;", "padding-right: 0px;"
    ].join("\n");
    this.parent.appendChild(this.last_vert_gridline);

    this.horiz_class = css_prefix + "_horiz";
    //create horizontal grid lines
    for (var i = 0; i < row_descriptors.length; i++) {
        var gridline = document.createElement("div");
        gridline.className = this.horiz_class;
        gridline.style.left = "0px";
        gridline.style.top = ( (this.config.show_headers ?
                                this.config.header_height : 0)
                               + (i * this.config.cell_height) ) + "px";
        this.parent.appendChild(gridline);
        this.grid_horiz.push(gridline);
    }
    this.last_horiz_gridline = document.createElement("div");
    this.last_horiz_gridline.className = this.horiz_class;
    this.last_horiz_gridline.style.cssText = [
        "bottom: 0px;", "height: 0px;", "left: 0px;",
        "margin-top: 0px;", "margin-bottom: 0px;",
        "padding-top: 0px;", "padding-bottom: 0px;"
    ].join("\n");
    this.parent.appendChild(this.last_horiz_gridline);
    if (this.config.show_headers) {
        this.header_gridline = document.createElement("div");
        this.header_gridline.className = this.horiz_class;
        this.header_gridline.style.cssText = [
            "top: 0px;",
            "height: 0px;", "left: 0px;",
            //"margin-bottom: 0px;",
            "padding-top: 0px;", "padding-bottom: 0px;"
        ].join("\n");
        this.parent.appendChild(this.header_gridline);
    }

    for (var i = 0; i < col_descriptors.length; i++) {
        if (this.config.show_headers) {
            //create the header cells
            var cell = document.createElement("div");
            cell.className = this.header_class;
            cell.style.top = "0px";
            if (null == this.config.cell_width) {
                cell.title = col_descriptors[i].name;
                cell.appendChild(document.createTextNode(col_descriptors[i].name));
            } else {
                // create inner rotated element
                var inner = document.createElement("div");
                inner.className = this.inner_header_class;
                inner.title = col_descriptors[i].name;
                inner.appendChild(document.createTextNode(col_descriptors[i].name));
                cell.appendChild(inner);
            }
            this.parent.appendChild(cell);
            this.headers.push(cell);
        }
        this.colindex_map[i] = i;
        this.coldesc_map[col_descriptors[i].id] = i;
    }

    for( var ri = 0; ri < row_descriptors.length; ri++ ){
        var row = [];

        for (var ci = 0; ci < col_descriptors.length; ci++) {
            var cell = cell_renderer(cell, row_descriptors[ri],
                                     col_descriptors[ci].id);
            if (null != cell) {
                cell.className += " " + this.cell_class;
                cell.style.top = ( (this.config.show_headers ?
                                    this.config.header_height : 0)
                                   + (ri * this.config.cell_height) ) + "px";
                this.parent.appendChild(cell);
            }
            row.push(cell);
        }

        this.matrix.push(row);
        this.rowindex_map[ri] = ri;
        this.rowdesc_map[row_descriptors[ri]] = ri;
    }

    this.vert_style = [
        "  position: absolute;",
        "  border-left: " + this.config.cell_border + "px solid black;",
        "  width: 0px;",
        "  margin: 0px;",
        "  padding: 0px;",
        "  overflow: hidden;",
        "  z-index: 1;",
        "  box-sizing: content-box;",
        "  -moz-box-sizing: content-box;"
    ].join("\n");

    this.horiz_style = [
        "  position: absolute;",
        "  border-top: " + this.config.cell_border + "px solid black;",
        "  height: 0px;",
        "  margin: 0px;",
        "  padding: 0px;",
        "  z-index: 1;",
        "  overflow: hidden;",
        "  box-sizing: content-box;",
        "  -moz-box-sizing: content-box;"
    ].join("\n");

    this.cell_style = [
        "  position: absolute;",
        "  white-space: nowrap;",
        "  height: " + ( this.config.cell_height
                         - (this.config.cell_padding * 2)
                         - this.config.cell_border
                         // adding 1.5 to make cells overlap their
                         // borders, so that the cell contents always
                         // visually extend to the cell borders, even
                         // at non-integral zoom levels where cells and
                         // gridlines end up getting rounded to
                         // different pixels
                         + 1.5 ) + "px;",
        // subtracting 1 here so that matrix cells overlap their
        // borders
        "  margin: " + (this.config.cell_border - 1) + "px;",
        "  padding: " + this.config.cell_padding + "px;",
        "  z-index: 0;",
        "  font: " + cell_font_size + "px" + " " + this.config.cell_font + ";",
        "  line-height: 0.7em;",
        "  overflow: hidden;",
        "  box-sizing: content-box;",
        "  -moz-box-sizing: content-box;"
    ].join("\n");

    this.header_style = [
        "  position: absolute;",
        "  white-space: nowrap;",
        "  height: " + (this.config.header_height
                        - this.offset_size_delta) + "px;",
        "  margin: " + this.config.cell_border + "px;",
        "  font: " + header_font_size + "px" + " "
            + this.config.header_font + ";",
        "  padding: " + this.config.cell_padding + "px;",
        "  line-height: 0.7em;",
        "  box-sizing: content-box;",
        "  -moz-box-sizing: content-box;",

        // vertical text
        "  display: inline-block;",
        "  overflow: hidden;",
    ].join("\n");

    this.inner_header_style = [
        "overflow: visible;",

        // vertical text, from https://gist.github.com/aiboy/7406727
        "  display: inline-block;",
        "  white-space: nowrap;",
        "  /* for non-IE browsers that don't support writing-mode */",
        "  -webkit-transform: translate("
            + (this.config.cell_width - this.offset_size_delta)
            + "px,0) rotate(90deg);",
        "  -moz-transform: translate(" 
            + (this.config.cell_width - this.offset_size_delta)
            + "px,0) rotate(90deg);",
        "  -o-transform: translate("
            + (this.config.cell_width - this.offset_size_delta)
            + "px,0) rotate(90deg);",
        "  transform: translate("
            + (this.config.cell_width - this.offset_size_delta)
            + "px,0) rotate(90deg);",
        "  -webkit-transform-origin: 0 0;",
        "  -moz-transform-origin: 0 0;",
        "  -o-transform-origin: 0 0;",
        "  transform-origin: 0 0;",
        "  /* IE9+ */",
        "  -ms-transform: none;",
        "  -ms-transform-origin: none;",
        "  /* IE8+ */",
        "  -ms-writing-mode: tb-rl;",
        "  /* IE7 and below */",
        "  *writing-mode: tb-rl;"
    ].join("\n");

    this.inner_header_before = [
        "  content: \"\";",
        "  float: left;",
        "  margin-top: 100%;"
    ].join("\n");

    this.transition_style = [
        "  transition-property: top, left;",
        "  transition-duration:" +  this.config.transition_time + ";",
        "  transition-timing-function: ease-in-out, ease-in-out;"
    ].join("\n");

    // we don't want the position transitions to happen when the
    // matrix is first created, so we leave the transitions
    // disabled initially
    this.disable_transitions();

    this.update_height();
    this.update_widths();

    var self = this;
    setTimeout(function() { self.enable_transitions(); }, 0);
}

renderer.prototype.update_height = function() {
    this.height = ( (this.config.show_headers ? this.config.header_height : 0)
                    + (this.config.cell_height * this.rowindex_map.length) );
    var grid_height = ( this.height + this.config.cell_border ) + "px";
    for (var ci = 0; ci < this.colindex_map.length; ci++) {
        this.grid_vert[this.colindex_map[ci]].style.height = grid_height;
    }
    this.last_vert_gridline.style.height = grid_height;
    this.parent.style.height = (this.height + this.config.cell_border) + "px";
};

renderer.prototype.set_styles = function(css_string) {
    if( ! this._style_node ){
        head = document.getElementsByTagName('head')[0],
        this._style_node = document.createElement('style');
        this._style_node.type = 'text/css';
        head.appendChild(this._style_node);
    }

    if (this._style_node.styleSheet){
        this._style_node.styleSheet.cssText = css_string; // IE
    } else {
        while (this._style_node.firstChild) {
            this._style_node.removeChild(this._style_node.firstChild);
        }
        this._style_node.appendChild(document.createTextNode(css_string));
    }
};

renderer.prototype.disable_transitions = function() {
    this.set_styles([
        "div." + this.header_class + " { ",
        this.header_style,
        "}",
        "div." + this.inner_header_class + " { ",
        this.inner_header_style,
        "}",
        "div." + this.inner_header_class + ":before { ",
        this.inner_header_before,
        "}",
        "div." + this.cell_class + " { ",
        this.cell_style,
        "}",
        "div." + this.vert_class + " { ",
        this.vert_style,
        "}",
        "div." + this.horiz_class + " { ",
        this.horiz_style,
        "}"
    ].join("\n"));
};

renderer.prototype.enable_transitions = function() {
    this.set_styles([
        "div." + this.header_class + " { ",
        this.header_style,
        this.transition_style,
        "}",
        "div." + this.inner_header_class + " { ",
        this.inner_header_style,
        this.transition_style,
        "}",
        "div." + this.cell_class + " { ",
        this.cell_style,
        this.transition_style,
        "}",
        "div." + this.vert_class + " { ",
        this.vert_style,
        this.transition_style,
        "}",
        "div." + this.horiz_class + " { ",
        this.horiz_style,
        this.transition_style,
        "}"
    ].join("\n"));
};

renderer.prototype.update_widths = function() {
    var widths = Array(this.num_cols);
    var totalWidth = 0;
    if (this.fixed_width) {
        for (var col = 0; col < this.num_cols; col++) {
            widths[col] = this.config.cell_width;
            totalWidth += widths[col];
        }
    } else {
        var header_widths = max_widths([this.headers]);
        var matrix_widths = max_widths(this.matrix);
        for (var col = 0; col < this.num_cols; col++) {
            // || 0 here in case the matrix and headers don't have the
            // same number of columns
            widths[col] = ( Math.max(header_widths[col] || 0,
                                     matrix_widths[col] || 0)
                            + this.config.cell_border );
            totalWidth += widths[col];
        }
    }

    this.widths = widths;

    this.set_totalwidth(totalWidth);
    this.set_colwidths(widths);
    this.set_colpos(widths);
    return totalWidth;
};

renderer.prototype.set_colwidths = function(displayed_widths) {
    if (this.config.show_headers) {
        set_widths( this.headers, this.colindex_map, displayed_widths,
                    this.offset_size_delta );
    }
    for (var ri = 0; ri < this.matrix.length; ri++) {
        set_widths( this.matrix[ri], this.colindex_map, displayed_widths,
                    this.offset_size_delta );
    }
};

renderer.prototype.set_colpos = function(displayed_widths) {
    if (this.config.show_headers) {
        set_lefts(this.headers, this.colindex_map, displayed_widths);
    }
    for (var ri = 0; ri < this.matrix.length; ri++) {
        set_lefts(this.matrix[ri], this.colindex_map, displayed_widths);
    }
    set_lefts(this.grid_vert, this.colindex_map, displayed_widths);
};

renderer.prototype.set_totalwidth = function(totalWidth) { 
    var grid_width = ( totalWidth + (this.config.cell_border / 2) ) + "px";
    for (var ri = 0; ri < this.grid_horiz.length; ri++) {
        this.grid_horiz[ri].style.width = grid_width;
    }
    this.last_horiz_gridline.style.width = grid_width;
    if (this.config.show_headers) {
        this.header_gridline.style.width = grid_width;
    }

    this.width = totalWidth + this.config.cell_border;
    this.parent.style.width = this.width + "px";
};

renderer.prototype._hover = function(x, y) {
    if (y < this.config.header_height) return;

    var colidx = (x / this.config.cell_width) | 0;
    var coldesc = this.displayed_colindex_descriptor(colidx);
};

renderer.prototype.displayed_rowindex_descriptor = function(displayed_row) {
    return this.row_descriptors[this.rowindex_map[displayed_row]];
};

renderer.prototype.displayed_colindex_descriptor = function(displayed_col) {
    return this.col_descriptors[this.colindex_map[displayed_col]];
};

renderer.prototype.show_rows = function(row_list) {
    var new_rowindex_map = Array(row_list.length);
    var new_row_map = {};

    var displayed_colindices = Array(this.num_cols);
    for (var dci = 0; dci < this.colindex_map.length; dci++) {
        displayed_colindices[this.colindex_map[dci]] = dci;
    }

    // set new row y-positions
    for( var ri = 0; ri < row_list.length; ri++ ){
        if (row_list[ri] in this.rowdesc_map) {
            var matrix_row_index = this.rowdesc_map[row_list[ri]];
            var row = this.matrix[matrix_row_index];
            var row_top = ( (this.config.show_headers ?
                             this.config.header_height : 0)
                            + (ri * this.config.cell_height) ) + "px";

            var horiz_gridline = this.grid_horiz[matrix_row_index];
            horiz_gridline.style.top = row_top;
            horiz_gridline.style.display = "";

            for (var ci = 0; ci < this.num_cols; ci++) {
                var cell = row[ci];
                if (cell) {
                    cell.style.top = row_top;
                    var displayed_colindex = displayed_colindices[ci];
                    if (displayed_colindex == undefined) {
                        cell.style.display = "none";
                    } else {
                        cell.style.display = "";
                    }
                }
            }

            new_rowindex_map[ri] = matrix_row_index;
            new_row_map[row_list[ri]] = 1;
        }
    }

    this.rowindex_map = new_rowindex_map;

    // hide non-shown rows
    for(var i = 0; i < this.row_descriptors.length; i++) {
        var rowdesc = this.row_descriptors[i];
        if (! (rowdesc in new_row_map)) {
            var row_index = this.rowdesc_map[rowdesc];

            this.grid_horiz[row_index].style.display = "none";

            var row = this.matrix[row_index];
            for (var j = 0; j < row.length; j++) {
                var cell = row[j];
                if (cell) cell.style.display = "none";
            }
        }
    }
    this.update_height();
};

renderer.prototype.show_cols = function(col_list) {
    var new_colindex_map = Array(col_list.length);
    var new_col_map = {};

    var displayed_rowindices = Array(this.num_rows);
    for (var dri = 0; dri < this.rowindex_map.length; dri++) {
        displayed_rowindices[this.rowindex_map[dri]] = dri;
    }

    // set new col x-positions
    var left = 0;
    for( var ci = 0; ci < col_list.length; ci++ ){
        matrix_col_index = this.coldesc_map[col_list[ci]];

        var vert_gridline = this.grid_vert[matrix_col_index];
        vert_gridline.style.left = left + "px";
        vert_gridline.style.display = "";
        for (var ri = 0; ri < this.num_rows; ri++) {
            var row = this.matrix[ri];
            var cell = row[matrix_col_index];
            if (cell) {
                cell.style.left = left + "px";

                var displayed_rowindex = displayed_rowindices[ri];
                if (displayed_rowindex == undefined) {
                    cell.style.display = "none";
                } else {
                    cell.style.display = "";
                }
            }
        }
        if (this.config.show_headers) {
            this.headers[matrix_col_index].style.left = left + "px";
            this.headers[matrix_col_index].style.display = "";
        }

        new_colindex_map[ci] = matrix_col_index;
        new_col_map[col_list[ci]] = 1;
        left += this.widths[matrix_col_index];
    }

    this.colindex_map = new_colindex_map;

    // hide non-shown cols
    for(var i = 0; i < this.col_descriptors.length; i++) {
        var coldesc = this.col_descriptors[i];
        if (! (coldesc.id in new_col_map)) {
            matrix_col_index = this.coldesc_map[coldesc.id];
            for (var j = 0; j < this.matrix.length; j++) {
                var cell = this.matrix[j][matrix_col_index];
                if (cell) cell.style.display = "none";
            }
            this.grid_vert[matrix_col_index].style.display = "none";
            if (this.config.show_headers) {
                this.headers[matrix_col_index].style.display = "none";
            }
        }
    }

    this.set_totalwidth(left);

    // need to make sure that newly-shown vertical gridlines have the correct
    // current height
    this.update_height();
};

function max_widths(matrix) {
    // matrix is row-major
    var widths = [];
    for (var row = 0; row < matrix.length; row++) {
        for (var col = 0; col < matrix[row].length; col++) {
            var cell = matrix[row][col];
            if (cell) {
                cell.style.width = "";
                if (! (col in widths)) widths[col] = 0;
                widths[col] = Math.max(widths[col], cell.offsetWidth);
            }
        }
    }
    return widths;
}

function set_widths(row, colindex_map, widths, offset_delta) {
    for (var col = 0; col < colindex_map.length; col++) {
        var cell = row[colindex_map[col]];
        if (cell) {
            // adding 1.5 here because cells overlap their borders on
            // each side, so that non-integral zoom levels look right
            cell.style.width =
                (widths[colindex_map[col]] - offset_delta + 1.5) + "px";
        }
    }
}

function set_lefts(row, colindex_map, widths) {
    var left = 0;
    for (var col = 0; col < colindex_map.length; col++) {
        var cell = row[colindex_map[col]];
        if (cell) {
            cell.style.left = left + "px";
        }
        left += widths[col];
    }
}

})();
