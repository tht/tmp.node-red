/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

// If you use this as a template, replace IBM Corp. with your own name.

// Sample Node-RED node file

// Require main module
module.exports = function(RED) {
    "use strict";

    // The main node definition - most things happen in here
    function AVRParser(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);

        // Parse configuration
        var arr = JSON.parse(n.definition);
        //console.log("AVRParser started with configuration: ");
        //console.log(arr);
        
        this.on('input', function(msg) {

            if (! msg.payload.match(/^[01]*$/)) {
                var res = "";
                // Message not yet in binary format - convert it now
                msg.payload.split(' ').forEach(function(item) {
                    // convert to binary
                    var bin = parseInt(item).toString(2);
  
                    // fill up with 0
                    while(bin.length<8) {
                        bin = "0" + bin;
                    }
  
                    // add to result, reverse as MSB first!
                    res = res + bin.split('').reverse().join('');
                });

                msg.payload = res;
            }

            console.log("Binary: " + msg.payload);
                
            var start = 0;
            arr.forEach( function(field) {
                // get first part and reverse bits
                var part = msg.payload.substr(start, field.len).split('').reverse().join('');
                               
                console.log("Mode: " + field.mode + ", len: " + field.len);
                console.log("Part: " + part);
                
                // parse value according to mode
                if (field.mode == 'u') {
                    msg[field.label] = parseInt(part, 2);
                } else if (field.mode == 's') {
                    var unsig = parseInt(part, 2);
                    var mask = 1 << (field.len - 1);
                    msg[field.label] = (unsig & ~mask) - (unsig & mask);
                } else if (field.mode == 'b') {
                    msg[field.label] = ( part == '1' );
                } else if (field.mode == 'v') {
                    msg[field.label] = Math.round(3.3/1024*(parseInt(part, 2)*4+100)*100) / 100;
                } else {
                    console.log("Unknown mode: " + field.mode);
                }
                
                // Apply multiplicator if given
                if (field.multi) {
                    msg[field.label] *= parseFloat(field.multi);
                }

                if (field.round) {
                    var multi = Math.pow(10, parseInt(field.round));
                    msg[field.label] = Math.round(msg[field.label]*multi)/multi;
                }
                
                start += field.len;
            });
            this.send(msg);
        });
        
        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: this.client.disconnect();
        });
    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("avrparser",AVRParser);
}
