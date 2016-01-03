"use strict";
module.exports = class {
    constructor(config) {
        this.http = require('http');
        this.config = config;
    }

    start() {
        this.http.createServer(function(request, response) {
            response.writeHead(200, {"Content-Type": "text/plain"});
            response.write("Hello World");
            response.end();
        }).listen(this.config.port);
    }
}
