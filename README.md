## Synopsis

Node scripts for running FE code separate from BE services. It can run backend repo on one server (including Windows) and redirect all endpoint queries to another server.

## Configuration Example
Configuration file is located at config.json. It requires  FE repository cloned under path from 'fe' key.
Under 'remote' key we specify server with has BE up and running.


config.json file:
{
    "remote": "https://<host>",
    "grunt": "repo/fe",
    "fe": "repo/fe",
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
