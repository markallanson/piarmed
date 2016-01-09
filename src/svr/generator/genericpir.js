"use strict";

let EventEmitter = require("events");

/**
 * Implementation of a generic PIR that can report tamper and movement events.
 *
 * Configuration:
 * {
 *   zone: "Office", // A text string representing the zone the PIR monitors.
 *   tamper: {
 *     dataAdaptor: ..., // The data adaptor that reports tamper data events.
 *     mode: "nc|no" // whether tamper switch operates an normally closed, or normally open mode.
 *   }
 * }
 */
module.exports = function(config) {
    const me = this;

    this.start = start;
    this.stop = stop;
    this.inputFilter = []

    let tamperState = 0;
    let movementState = 0;

    function start() {
        console.log("Starting Generic PIR generator for zone '" + config.zone + "'");
        if (!me.emitter) {
            me.emitter = new EventEmitter();
            config.tamper.dataAdaptor.emitter.on('data', processTamper);
            config.tamper.dataAdaptor.emitter.on('error', processTamperError);

            config.movement.dataAdaptor.emitter.on('data', processMovement);
            config.movement.dataAdaptor.emitter.on('error', processMovement);
        }
        return  {
            zone: config.zone,
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
        if ((val && config.tamper.mode == 'nc') ||
            (!val && config.tamper.mode == 'no')) {
            endTamper();
        } else {
            startTamper();
        }
    }

    function endTamper() {
        if (tamperState) {
            tamperState = 0;
            me.emitter.emit("tamper", { event: "tamper-end", zone: config.zone });
        }
    }

    function startTamper() {
        if (!tamperState) {
            tamperState = 1;
            me.emitter.emit("tamper", { event: "tamper-start", zone: config.zone });
        }
    }

    function processTamperError(err) {
        console.log("Error while checking Tamper signal.", err);
    }

    function processMovement(val) {
        if ((val && config.movement.mode == 'nc') ||
            (!val && config.movement.mode == 'no')) {
            endMovement();
        } else {
            startMovement();
        }
    }

    function startMovement() {
       if (!movementState) {
           movementState = 1;
           me.emitter.emit("movement", { event: "movement-start", zone: config.zone });
       }
    }

    function endMovement() {
       if (movementState) {
           movementState = 0;
           me.emitter.emit("movement", { event: "movement-end", zone: config.zone });
       }
    }

    function processMovementError(err) {
        console.log("Error while checking Movement signal.", err);
    }
};
