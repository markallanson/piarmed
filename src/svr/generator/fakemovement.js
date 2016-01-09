"use strict";

let EventEmitter = require('events');

module.exports = function(config) {
    const me = this;
    this.start = start;
    this.stop = stop;

    function start() {
        console.log("Starting Fake Movement generator for zone '" + config.zone + "'");
        if (!me.emitter) {
            me.emitter = new EventEmitter();
            fake();
        }
        return  {
            zone: config.zone,
            emitter: me.emitter,
        };
    }

    function stop() {
        console.log("Stopping Fake Movement generator for zone '" + config.zone + "'");
        if (me.emitter) {
            me.emitter = null;
        }
    }

    function fake() {
        setTimeout(function() {
            if (me.emitter) {
                me.emitter.emit('movement', { event: 'movement', zone: "Living Room" });
            }
            fake();
        }, 2000);
    }
};