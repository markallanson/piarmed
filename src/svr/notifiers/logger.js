"use strict";
module.exports = class {
    constructor(config) {
        this.config = config;
    }

    interestedIn() {
        return this.config.interestedIn;
    }

    notify(event) {
        console.info(new Date(), "Event Occurred - ", event);
    }
}
