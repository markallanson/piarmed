"use strict"

const EventEmitter = require("events");
const moment = require("moment");
const Bunyan = require("bunyan");

/**
 * The alarm state manager combo is responsible for reacting to events in the system and raising
 * alarm events.
 *
 * This combo is ultimately responsible for triggering an alarm state if the alarm is the
 * armed and there is a movement event.c
 */
module.exports = function(config) {
    const me = this;
    const log = new Bunyan({ name: "AlarmStateManager" });

    this.emitter = new EventEmitter();
    this.interestedIn = interestedIn;
    this.notify = notify;
    this.start = start;
    this.stop = stop;

    const trackedZones = [];

    /** Tracks whether the alarm is currently armed or not. */
    let armed = false;

    /** Tracks whether the alarm is in an alerting state. */
    let alerting = false;

    /** Tracks the zones that are causing any alarm state. */
    const alarmZones = {};

    const eventHandlers = [
        { event: "zone-online", handler: registerZone },
        { event: "zone-offline", handler: unregisterZone },
        { event: "zone-report-request", handler: generateZoneReport },
        { event: "movement-start", handler: movementStart },
        { event: "presence-present", handler: presencePresent },
        { event: "presence-absent", handler: presenceAbsent },
        { event: "alarm-arm-manual", handler: alarmArmManual },
        { event: "alarm-disarm-manual", handler: alarmDisarmManual },
        { event: "shutdown", handler: stop }
    ];

    const zoneState = {
        online: "Online",
        offline: "Offline"
    };

    function start() {
        return  {
            state: "started",
            emitter: me.emitter,
        };
    }

    function stop() {
        if (alerting) {
            log.info("Ending the current alert state before shutdown");
            endAlertState("Alarm is shutting down");
        }
    }

    function interestedIn() {
        return [ "movement", "tamper", "zone", "presence", "alarm", "shutdown" ];
    }

    function notify(event) {
        log.info("Received Event", event);
        const command = eventHandlers.find(function(ec) { return ec.event === event.event; });
        if (command) {
            log.info("Passing off to handler", event);
            command.handler(event);
        } else {
            log.info("No handler available for " + event.event);
        }
    }

    /**
     * Registers a Zone as online
     *
     * When a zone is online then the alarm state manager will listen to and account
     * for events in that zone in order to trigger alarm conditions.
    */
    function registerZone(event) {
        setZoneState(event.zone, zoneState.online);
    }

    /**
     * Registers a Zone as offline
     *
     * When a zone is offline the alarm state manager will ignore that zone for the
     * purposes of triggering alarm conditions.
    */
    function unregisterZone(event) {
        setZoneState(event.zone, zoneState.offline);
    }

    /**
     * Sets the tracking state of a zone.
     */
    function setZoneState(zone, state) {
        log.info("Zone " + zone + " changed to state " + state);
        // create or update the tracked zone's state.
        const trackedZone = trackedZones.find(function(trackedZone) { trackedZone.zone === zone });
        if (!trackedZone) {
            trackedZones.push({ zone: zone, state: state });
        } else {
            trackedZone.state = state;
        }
    }

    /**
     * Generates a zone report for the requestor.
     */
    function generateZoneReport(event) {
        let zoneReport = [ "Zone Report @ " + moment().format("dddd, MMMM Do YYYY, h:mm:ss a") ];
        for (const zone of trackedZones) {
            zoneReport.push("Zone " + zone.zone + " " + zone.state);
        }
        log.info("Zone Report", zoneReport);
        log.info("Sending Zone Report to " + event.source);
        me.emitter.emit("zone", { event: "zone-report", report: zoneReport, target: event.source });
    }

    function movementStart(event) {
        if (armed) {
            alerting = true;
            me.emitter.emit("alarm", { event: "alarm-alert-start", triggerZone: event.zone })
        }
    }

    function presencePresent(event) {
        armed = false;
        if (alerting) {
            endAlertState("Someone arrived at the premesis.");
        }
        notifyDisarmed("Someone arrived at the premesis.");
    }

    function presenceAbsent(event) {
        armed = true;
        notifyArmed("Everyone left the premesis.");
    }

    function alarmArmManual(event) {
        armed = true;
        notifyArmed("Alarm was armed manually.");
    }

    function alarmDisarmManual(event) {
        armed = false;
        if (alerting) {
            endAlertState("Alarm was manually disarmed.");
        }
        notifyDisarmed("Alarm was manually disarmed.");
    }

    function endAlertState(reason) {
        alerting = false;
        log.info("Alarm State Ended: " + reason);
        me.emitter.emit("alarm", { event: "alarm-alert-end", reason: reason });
    }

    function notifyArmed(reason) {
        log.info("Alarm Armed: " + reason);
        me.emitter.emit("alarm", { event: "alarm-armed", reason: reason });
    }

    function notifyDisarmed(reason) {
        log.info("Alarm Disarmed: " + reason);
        me.emitter.emit("alarm", { event: "alarm-disarmed", reason: reason });
    }
}
