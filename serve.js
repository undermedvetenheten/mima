const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8080;
const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png',
    '.ico': 'image/x-icon', '.json': 'application/json',
};

const AUDIO_EXT = new Set(['.wav', '.mp3']);

// Loudness levelling: bring every voice file to the same peak so nothing jumps
// out (the blips sit at 0 dBFS, the chirps swing ~23 dB). Applied as a gain at
// playback (see sound.js), not by rewriting files — lossless and reversible.
const TARGET_PEAK = 0.5;   // ~-6 dBFS target peak for every file
const MAX_BOOST = 4.0;     // cap quiet-file boost (+12 dB) so noise floors stay down

// Read the peak sample amplitude (0..1) from a WAV. Returns 1 (=no change) for
// mp3 or anything we can't parse, so those just play at unity gain.
function wavPeak(fileAbs) {
    try {
        if (path.extname(fileAbs).toLowerCase() !== '.wav') return 1;
        const b = fs.readFileSync(fileAbs);
        if (b.toString('ascii', 0, 4) !== 'RIFF') return 1;
        let bits = 0, audioFormat = 1, dataOff = -1, dataLen = 0, off = 12;
        while (off + 8 <= b.length) {
            const id = b.toString('ascii', off, off + 4);
            const sz = b.readUInt32LE(off + 4);
            if (id === 'fmt ') { audioFormat = b.readUInt16LE(off + 8); bits = b.readUInt16LE(off + 22); }
            else if (id === 'data') { dataOff = off + 8; dataLen = sz; }
            off += 8 + sz + (sz & 1);
        }
        if (dataOff < 0 || !bits) return 1;
        const end = Math.min(dataOff + dataLen, b.length);
        let peak = 0;
        if (audioFormat === 3 && bits === 32) {
            for (let i = dataOff; i + 4 <= end; i += 4) { const v = Math.abs(b.readFloatLE(i)); if (v > peak) peak = v; }
        } else if (bits === 16) {
            for (let i = dataOff; i + 2 <= end; i += 2) { const v = Math.abs(b.readInt16LE(i)) / 32768; if (v > peak) peak = v; }
        } else if (bits === 24) {
            for (let i = dataOff; i + 3 <= end; i += 3) { let s = b[i] | (b[i+1] << 8) | (b[i+2] << 16); if (s & 0x800000) s -= 0x1000000; const v = Math.abs(s) / 8388608; if (v > peak) peak = v; }
        } else if (bits === 32) {
            for (let i = dataOff; i + 4 <= end; i += 4) { const v = Math.abs(b.readInt32LE(i)) / 2147483648; if (v > peak) peak = v; }
        } else return 1;
        return peak;
    } catch (e) { return 1; }
}

// Per-file levelling gain: target/peak, capped so we never over-boost quiet files.
function levelGain(fileAbs) {
    const peak = wavPeak(fileAbs);
    if (!(peak > 0)) return 1;
    return Math.round(Math.min(MAX_BOOST, TARGET_PEAK / peak) * 1000) / 1000;
}

// Generate <dir>/manifest.json: [{ file, gain }, ...] for every audio file in the
// folder. Lets the page load all files (no hardcoded names) AND level them. Also
// written to disk so a committed copy ships to static hosting (GitHub Pages).
function writeManifest(relDir) {
    const dirAbs = path.join(__dirname, relDir);
    try {
        const list = fs.readdirSync(dirAbs)
            .filter(f => AUDIO_EXT.has(path.extname(f).toLowerCase()))
            .sort()
            .map(f => ({ file: f, gain: levelGain(path.join(dirAbs, f)) }));
        fs.writeFileSync(path.join(dirAbs, 'manifest.json'), JSON.stringify(list, null, 2));
        console.log(`manifest: ${relDir}/manifest.json (${list.length} files)`);
        return list;
    } catch (e) {
        console.warn(`manifest: could not scan ${relDir}:`, e.message);
        return null;
    }
}

// Regenerate sound manifests on startup so new drops are picked up each run.
writeManifest('mima/sounds/chirps');
writeManifest('mima/sounds/blips');
writeManifest('mima/sounds/fades');

function handler(req, res) {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];

    // Live manifest: any request for a manifest.json under mima/sounds/ is
    // generated fresh from disk (so a page refresh picks up newly added files
    // with the dev server running — no restart, no code edit).
    const m = urlPath.match(/^\/mima\/sounds\/(.+)\/manifest\.json$/);
    if (m) {
        const list = writeManifest(path.join('mima/sounds', m[1])) || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(list));
        return;
    }

    const file = path.join(__dirname, decodeURIComponent(urlPath));
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
    });
}

// Kill whatever process is holding the port, so relaunching just takes it over
// instead of crashing with EADDRINUSE (a stale background instance is usually
// the culprit). Best-effort + cross-platform.
function killPort(port) {
    try {
        if (process.platform === 'win32') {
            const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
            const pids = new Set();
            for (const line of out.split(/\r?\n/)) {
                const p = line.trim().split(/\s+/); // TCP  local  foreign  STATE  PID
                if (p.length >= 5 && p[3] === 'LISTENING' && p[1].endsWith(':' + port)) pids.add(p[4]);
            }
            pids.forEach(pid => {
                try { execSync('taskkill /PID ' + pid + ' /F', { stdio: 'ignore' }); console.log(`freed port ${port}: killed PID ${pid}`); } catch (e) {}
            });
        } else {
            execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore' });
        }
    } catch (e) { /* nothing listening — fine */ }
}

function start(triedFree) {
    const server = http.createServer(handler);
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE' && !triedFree) {
            console.warn(`port ${PORT} in use — taking it over...`);
            killPort(PORT);
            setTimeout(() => start(true), 500);
        } else {
            console.error(e.code === 'EADDRINUSE'
                ? `port ${PORT} still in use after trying to free it — close the other server manually.`
                : e);
            process.exit(1);
        }
    });
    server.listen(PORT, () => console.log(`Mima → http://localhost:${PORT}`));
}

start();
