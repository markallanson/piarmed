"use strict"

const EventEmitter = require("events");

/**
 * The alarm state manager combo is responsible for reacting to events in the system and raising
 * alarm events.
 *
 * This combo is ultimately responsible for triggering an alarm state if the alarm is the
 * armed and there is a movement event.c
 */
module.exports = function(config) {
    const me = this;

    this.emitter = new EventEmitter();
    this.interestedIn = interestedIn;
    this.notify = notify;
    this.start = start;
    this.stop = stop;

    const zoneTracker = {}

    /** Determines how alarm detects it's on or off state. */
    const ARM_MODE_AUTO = 'auto';
    const ARM_MODE_MANUAL = 'manual';
    const armMode = ARM_MODE_AUTO;

    /** Track the current state of the alarm: quiet, active */
    const ALARM_STATE_INACTIVE = 'inactive';
    const ALARM_STATE_ACTIVE = 'active'
    const state = ALARM_STATE_INACTIVE;

    /** Tracks whether the alarm is currently armed or not. */
    const armed = false;

    /** Tracks the zones that are causing any alarm state. */
    const alarmZones = {}


    function start() {
        return  {
            state: "started",
            emitter: me.emitter,
        };
    }

    function stop() {

    }

    function interestedIn() {
        return [ 'movement' ];
    }

    function notify(event) {
        if (event.event === 'movement-start') {
            movementStart(event.zone);
        } else if (event.event === 'movement-end') {
            movementEnd(event.zone);
        } else if (event.event === 'manual-arm') {
            manualArm(event.source);
        } else if (event.event === 'manual-disarm') {
            manualDisarm(event.source);
        } else if (event.event === 'auto-arm') {
            autoArm(event.source);
        }
    }

    function movementStart(zone) {

    }

    function movementEnd(zone) {

    }

    /** Switches the alarm system to auto arm or disarm based in presence state updates. */
    function autoArm(source) {
        armMode = ARM_MODE_AUTO;
    }

    /** Manually arms the alarm.  */
    function manualArm(source) {
        armed = true;
        armMode = ARM_MODE_MANAUL;
    }

    /** Manually disarms the alarm. This switches the mode to manual, and deactivates any current alarm condition. */
    function manualDisarm(source) {
        armed = false;
        armMode = ALARM_MODE_MANUAL;
        deactivateAlarm();
    }

    /** Activates the alarm. This is the all bells and whistles someone is breaking in state. */
    function activateAlarm() {
        state = ALARM_STATE_ACTIVE;
        this.emitter.emit('alarm-state', { state: state });
    }

    /** Deactivates the alarm. This lets the everyone know the alarm condition has passed. */
    function deactivateAlarm() {
        state = ALARM_STATE_INACTIVE;
        this.emitter.emit('alarm-state', { state: state });
    }
}