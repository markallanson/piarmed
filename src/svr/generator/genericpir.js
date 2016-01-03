"use strict";

let EventEmitter = require('events');
var Gpio = require("onoff").Gpio;

module.exports = function(config) {
    const me = this;
    this.config = config;
    this.start = start;
    this.stop = stop;

    function start() {
        console.log("Starting Generic PIR generator for zone '" + config.zone + "'");
        if (!me.emitter) {
            me.emitter = new EventEmitter();
            startGpio();
        }
        return  {
            zone: me.config.zone,
            state: 'started',
            emitter: me.emitter,
        };
    }

    function stop() {
        console.log("Stopping Generic PIR generator for zone '" + config.zone + "'");
        if (me.emitter) {
            me.emitter = null;
        }
    }

    function startGpio() {
        let tamper = new Gpio(me.config.gpio, 'in', 'both');
        tamper.watch(function(err, val) {
            // fire the tamper start/end events when a tamper event occurs.
            if (err) {
                console.log("Could not watch for zone '" + config.zone + "'. " + err);
            } else if (val && me.config.tamper.mode === 'nc') {
                me.emitter.emit("tamper", { event: "tamper-start", zone: me.config.zone });
            } else {
                me.emitter.emit("tamper", { event: "tamper-end", zone: me.config.zone });
            }
        });
    }
};
