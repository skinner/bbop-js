#!/usr/bin/rhino
/* 
 * Package: get_parents.js
 * 
 * This is a Rhino script.
 * 
 * Get the ids and labels of the parents of the specified term.
 * 
 * Usage like:
 *  : get_parents.js GO:0022008
 * 
 * This is also a bit of a unit test for the Rhino update function.
 * 
 * Currently broken-ish, but works with:
 *  : rhino -modules ../staging/bbop.js get_parents.js GO:0022008
 */

// Loading the necessary files.
// TODO/BUG: These should be pointing at the remote files, not the
// local ones.
//load('../staging/bbop.js');
load('../_data/golr.js');

var bbop = require('bbop').bbop;

// First, get the last arg
var term_acc = arguments[arguments.length -1];

// Define what we do when our (async) information comes back.
function report(resp){

    // Gather out info graph info from the first doc.
    var doc = resp.documents()[0];
    var graph_json = doc['topology_graph_json'];
    var graph = new bbop.model.graph();
    graph.load_json(JSON.parse(graph_json));
    var kids = graph.get_parent_nodes(term_acc);

    // Dump to STDOUT.
    var loop = bbop.core.each;
    loop(kids,
	 function(kid){
	     print(kid.id() + "\t" + kid.label());
	 });
}

// Define the server, define the query, bind the callback, and
// trigger.
var gconf = new bbop.golr.conf(amigo.data.golr);
var go = new bbop.golr.manager.rhino('http://golr.berkeleybop.org/', gconf);
go.set_id(term_acc);
go.register('search', 'do', report);
go.update('search');
