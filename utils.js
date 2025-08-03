module.exports = {ver: '2.8.5'};

const fs = require('fs');
const path = require('path');
// const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// const version = packageJson.version;

const versionRegex = /ver\s*:\s*['"](\d+\.\d+\.\d+)['"]/;
let highestVersion = '0.0.0';

function parseVersion(verStr) {
    return verStr.split('.').map(Number);
}

function compareVersions(a, b) {
    const [a1, b1, c1] = parseVersion(a);
    const [a2, b2, c2] = parseVersion(b);
    if (a1 !== a2) return a1 - a2;
    if (b1 !== b2) return b1 - b2;
    return c1 - c2;
}

function checkFileForVersion(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(versionRegex);
        if (match) {
            const ver = match[1];
            if (compareVersions(ver, highestVersion) > 0) {
                highestVersion = ver;
            }
        }
    } catch (err) {
        console.error(`Failed to read file ${filePath}:`, err.message);
    }
}

function scanFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const fullPath = path.join(folderPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && file.endsWith('.js')) {
            checkFileForVersion(fullPath);
        }
    }
}

['index.js', 'utils.js', 'mongoUtils.js'].forEach(filename => {
    const fullPath = path.join(__dirname, filename);
    if (fs.existsSync(fullPath)) checkFileForVersion(fullPath);
});

['commands', 'events'].forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (fs.existsSync(folderPath)) scanFolder(folderPath);
});

const P2 = "716390085896962058";
const Pname = "874910942490677270";
const P2a = "854233015475109888";
const P2a_P = "1254602968938844171";

const Seal = "590572827485405194";

const prefix = ";";
const embedColor = "008080";

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
    P2a_P,
    Seal,
    prefix,
    embedColor,
    version: highestVersion,
    getRuntime
}; 