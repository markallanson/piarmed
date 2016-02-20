"use strict";

let EventEmitter = require("events");
const Bunyan = require("bunyan");

/**
 * Implementation of a generic PIR that can report tamper and movement events.
 *
 * Configuration:
 * {
 *   zone: "Office", // A text string representing the zone the PIR monitors.
 *   tamper: {
 *     dataAdaptor: ..., // The data adaptor that reports tamper data events.
 *     mode: "normally closed|normally open" // whether tamper switch operates an normally closed, or normally open mode.
 *   }
 * }
 */
module.exports = function(config) {
    const me = this;
    const log = Bunyan.createLogger({ name: "GenericPir-" + config.zone });

    this.start = start;
    this.stop = stop;
    this.emitter = new EventEmitter();

    const tamperInput = config.inputs.find(function(input) { return input.name === "tamper" });
    const movementInput = config.inputs.find(function(input) { return input.name === "movement" });

    const normallyOpen = "normally open";
    const normallyClosed = "normally closed"

    let tamperState = 0;
    let movementState = 0;

    function start() {
        log.info("Starting Generic PIR generator for zone '" + config.zone + "'");
        log.info("Tamper Circuit Mode: " + tamperInput.mode);
        log.info("Movement Circuit Mode: " + movementInput.mode);

        tamperInput.dataAdaptor.emitter.on("data", processTamper);
        tamperInput.dataAdaptor.emitter.on("error", processTamperError);

        movementInput.dataAdaptor.emitter.on("data", processMovement);
        movementInput.dataAdaptor.emitter.on("error", processMovementError);

        me.emitter.emit("zone", { event: "zone-online", zone: config.zone });
    }

    function stop() {
        log.info("Stopping Generic PIR generator for zone '" + config.zone + "'");
        me.emitter.emit("zone", { event: "zone-offline", zone: config.zone });
        if (me.emitter) {
            me.emitter = null;
        }
    }

    function processTamper(val) {
        if ((val && tamperInput.mode === normallyClosed) ||
            (!val && tamperInput.mode === normallyOpen)) {
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
        log.info("Error while checking Tamper signal.", err);
    }

    function processMovement(val) {
        if ((val && movementInput.mode == normallyClosed) ||
            (!val && movementInput.mode == normallyOpen)) {
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
        log.info("Error while checking Movement signal.", err);
    }
};
