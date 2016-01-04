"use strict";

let EventEmitter = require("events");

module.exports = function(config) {
    const me = this;
    this.config = config;
    this.start = start;
    this.stop = stop;

    function start() {
        console.log("Starting Generic PIR generator for zone '" + config.zone + "'");
        if (!me.emitter) {
            me.emitter = new EventEmitter();
            this.config.tamperDataAdaptor.emitter.on('data', processTamper);
            this.config.tamperDataAdaptor.emitter.on('error', processTamperError);
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

    function processTamper(val) {
        if (val && config.tamper.mode == 'nc') {
            me.emitter.emit("tamper", { event: "tamper-end", zone: me.config.zone });
        } else {
            me.emitter.emit("tamper", { event: "tamper-start", zone: me.config.zone });
        }
    }

    function processTamperError(err) {
        console.log("Error while checking Tamper signal.", err);
    }
};
