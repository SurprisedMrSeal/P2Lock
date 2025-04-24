const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

const P2 = "716390085896962058";
const Pname = "874910942490677270";
const P2a = "854233015475109888";
const Seal = "590572827485405194";
const embedColor = "#008080";

const startTime = Date.now();

function getRuntime() {
    const currentTime = Date.now();
    const uptime = currentTime - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
    P2,
    Pname,
    P2a,
    Seal,
    embedColor,
    version,
    getRuntime
}; 