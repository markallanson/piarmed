"use strict"

const EventEmitter = require("events");

/**
 * The Presence Manager combo is responsible for tracking the presence of entities
 * and emitting events when entities meet specific criteria.
 */
module.exports = function(config) {
    const me = this;

    this.emitter = new EventEmitter();
    this.interestedIn = interestedIn;
    this.notify = notify;
    this.start = start;
    this.stop = stop;

    function start() {
        return  {
            state: "started",
            emitter: me.emitter,
        };
    }

    function stop() {

    }

    function interestedIn() {
        return [];
    }

    function notify(event) {
    }
}