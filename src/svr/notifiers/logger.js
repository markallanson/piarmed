"use strict";
const Bunyan = require("bunyan");

module.exports = function(config) {
    this.interestedIn = interestedIn;
    this.notify = notify;

    const log = Bunyan.createLogger({ name: "EventLogger" });

    function interestedIn() {
        return config.interestedIn;
    }

    function notify(event) {
        log.info(event);
    }
}
