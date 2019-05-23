## Synopsis

Node scripts for running Pulse FE code separate from BE services. It can run web_core repository on one server (including Windows) and redirect all endpoint queries to another server.

## Configuration Example
Configuration file is located at config.json. It requires repository pulse_fe cloned under path from 'pulse_fe' key.
Under 'remote' key we specify VM with has BE up and running.
Under 'grunt' & 'pulse_fe' keys we specify relative path to pulse_fe & pulse_fe/src/nmsweb directories respectively.

config.json file:
{
    "remote": "https://10.1.242.195",
    "remote2": "http://tviewnoc.ga1.web.dyncloud.idirect.net",
    "grunt": "repo/pulse_fe",
    "pulse_fe": "repo/pulse_fe/src/nmsweb",
    "web_core": "repo/web_core/src/nmsweb",
    "watch": ["js", "json", "tpl", "less"],
    "callbacks": [{
        "file": "compile-less",
        "ext": "less"
    }]
}

## Execution Example
Add configuration to file config.json.

npm install
npm start
