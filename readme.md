Piarmed
=======

Alarm System powered by Raspberry Pi and Node.js.

Install
-------
    cd src
    npm install

Configure
---------
### Enable I2C
### Grant executing user correct privs
The user running piarmed needs the right priviliges to do so.

    sudo adduser <user> i2c
    sudo adduser <user> gpio

### Wire everything up

Run
---
    cd svr
    npm piarmed.js | bunyan