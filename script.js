const eventTypes = {
    "Radar Indicated Tornado Warning": "tornado-warning",
    "Observed Tornado Warning": "observed-tornado-warning",
    "PDS Tornado Warning": "pds-tornado-warning",
    "Tornado Emergency": "tornado-emergency",
    "Severe Thunderstorm Warning": "severe-thunderstorm-warning",
    "Considerable Severe Thunderstorm Warning": "severe-thunderstorm-considerable",
    "Destructive Severe Thunderstorm Warning": "pds-severe-thunderstorm-warning",
    "Flash Flood Warning": "flash-flood-warning",
    "Tornado Watch": "tornado-watch",
    "Severe Thunderstorm Watch": "severe-thunderstorm-watch",
    "Winter Weather Advisory": "winter-weather-advisory",
    "Winter Storm Watch": "winter-storm-watch",
    "Winter Storm Warning": "winter-storm-warning",
    "Ice Storm Warning": "winter-storm-warning",
    "Heavy Freezing Spray Warning": "winter-storm-warning",
    "Lake Effect Snow Warning": "winter-storm-warning"
};

const priority = {
    "Tornado Emergency": 1,
    "PDS Tornado Warning": 2,
    "Observed Tornado Warning": 3,
    "Radar Indicated Tornado Warning": 4,
    "Destructive Severe Thunderstorm Warning": 5,
    "Considerable Severe Thunderstorm Warning": 6,
    "Severe Thunderstorm Warning": 7,
    "Tornado Watch": 8,
    "Severe Thunderstorm Watch": 9,
    "Flash Flood Warning": 10,
    "Winter Weather Advisory": 11,
    "Winter Storm Watch": 12,
    "Winter Storm Warning": 13
};

const labels = {
    tornado: "TORNADO WARNINGS",
    thunderstorm: "SEVERE THUNDERSTORM WARNINGS",
    flood: "FLASH FLOOD WARNINGS",
    winter: "WINTER WEATHER WARNINGS"
};

const elements = {
    warningList: document.getElementById('warningList'),
    expiration: document.getElementById('expiration'),
    eventType: document.getElementById('eventType'),
    counties: document.getElementById('counties'),
    tornadoCount: document.getElementById('tornadoCount'),
    thunderstormCount: document.getElementById('thunderstormCount'),
    floodCount: document.getElementById('floodCount'),
    winterWeatherCount: document.getElementById('winterWeatherCount')
};

let currentWarningIndex = 0;
let activeWarnings = [];
let previousWarnings = new Map();

document.body.addEventListener('click', enableSound);

function enableSound() {
    document.body.removeEventListener('click', enableSound);
    tornadoSound.play().catch(() => { });
}

createWarningListHeader();

async function checkForNewAlerts() {
    const response = await fetch('https://api.weather.gov/alerts/active');
    const data = await response.json();
    const newWarnings = data.features; // Assuming 'features' contains the list of alerts

    newWarnings.forEach(warning => {
        const warningId = warning.id;
        const eventName = warning.properties.event;
        if (!previousWarnings.has(warningId)) {
            playWarningSound(eventName, warning);
            previousWarnings.set(warningId, eventName);
        }
    });
}

function updateCounts(warnings) {
    const counts = { tornado: 0, thunderstorm: 0, flood: 0, winter: 0 };
    warnings.forEach(warning => {
        const type = getWarningType(warning.properties.event);
        counts[type]++;
    });
    Object.keys(counts).forEach(type => {
        elements[`${type}Count`].textContent = `${labels[type]}: ${counts[type]}`;
    });
}

function getWarningType(eventName) {
    if (eventName.includes("Tornado")) return 'tornado';
    if (eventName.includes("Thunderstorm")) return 'thunderstorm';
    if (eventName.includes("Flood")) return 'flood';
    if (eventName.includes("Winter")) return 'winter';
    return null;
}

function sortWarningsByTime(warnings) {
    warnings.sort((a, b) => new Date(b.properties.sent) - new Date(a.properties.sent));
}

function createWarningListHeader() {
    const headerElement = document.createElement('div');
    headerElement.textContent = "Latest Alerts:";
    headerElement.className = 'warning-list-header';
    elements.warningList.prepend(headerElement);
}

function updateDashboard() {
    if (activeWarnings.length === 0) {
        elements.expiration.textContent = '';
        elements.eventType.textContent = 'NO ACTIVE WARNINGS';
        elements.counties.textContent = '';
        return;
    }

    const hasTornadoWarningOrWatch = activeWarnings.some(warning =>
        warning.properties.event === "Tornado Warning" || warning.properties.event === "Tornado Watch"
    );

    const filteredWarnings = hasTornadoWarningOrWatch
        ? activeWarnings.filter(warning => warning.properties.event !== "Flash Flood Warning")
        : activeWarnings;

    if (filteredWarnings.length === 0) {
        elements.expiration.textContent = '';
        elements.eventType.textContent = 'NO ACTIVE WARNINGS';
        elements.counties.textContent = '';
        return;
    }

    const warning = filteredWarnings[currentWarningIndex];
    let eventName = getEventName(warning);

    const expirationDate = new Date(warning.properties.expires);
    const options = {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const formattedExpirationTime = expirationDate.toLocaleString('en-US', options);

    const counties = formatCountiesTopBar(warning.properties.areaDesc);
    elements.expiration.textContent = `Expires: ${formattedExpirationTime} EST`;

    elements.eventType.textContent = eventName;
    elements.counties.textContent = counties;
    elements.eventType.className = `event-type-bar ${eventTypes[eventName]}`;
    currentWarningIndex = (currentWarningIndex + 1) % filteredWarnings.length;
}

function formatCountiesTopBar(areaDesc) {
    const counties = areaDesc.split('; ');
    let formattedCounties = counties.slice(0, 6).map(county => {
        const parts = county.split(',');
        if (parts.length > 1) {
            return `${parts[0].trim()} County, ${parts[1].trim()}`;
        }
        return county;
    });
    if (counties.length > 6) {
        formattedCounties.push("...");
    }
    return formattedCounties.join('; ');
}

function updateWarningList(warnings) {
    const latestWarnings = warnings.slice(0, 10);
    const existingWarningElements = elements.warningList.getElementsByClassName('warning-box');
    const existingWarningsMap = new Map();

    for (let element of existingWarningElements) {
        const warningId = element.getAttribute('data-warning-id');
        existingWarningsMap.set(warningId, element);
    }

    latestWarnings.forEach(warning => {
        const warningId = warning.id;
        const eventName = getEventName(warning);
        const counties = formatCountiesTopBar(warning.properties.areaDesc);
        const displayText = `${eventName} - ${counties}`;

        if (previousWarnings.has(warningId)) {
            const previousEvent = previousWarnings.get(warningId);
            if (previousEvent !== eventName) {
                upgradeSound.play().catch(error => console.error('Error playing upgrade sound:', error));
            }
        }

        if (existingWarningsMap.has(warningId)) {
            const warningElement = existingWarningsMap.get(warningId);
            warningElement.textContent = displayText;
            warningElement.className = `warning-box ${eventTypes[eventName]}`;

            and setWinterWarningColors(warningElement, eventName);

        } else {
            const warningBox = document.createElement('div');
            warningBox.className = `warning-box ${eventTypes[eventName]}`;
            warningBox.setAttribute('data-warning-id', warningId);
            warningBox.textContent = displayText;

            setWinterWarningColors(warningBox, eventName);

            warningBox.style.animation = 'flash 0.5s alternate infinite';

            elements.warningList.appendChild(warningBox);

            setTimeout(() => {
                warningBox.style.animation = '';
            }, 5000);
        }

        previousWarnings.set(warningId, eventName);
    });

    for (let [warningId, element] of existingWarningsMap) {
        if (!latestWarnings.find(warning => warning.id === warningId)) {
            elements.warningList.removeChild(element);
            previousWarnings.delete(warningId);
        }
    }
}

function setWinterWarningColors(element, eventName) {
    switch (eventName) {
        case "Winter Storm Warning":
            element.style.backgroundColor = "rgb(255, 88, 233)";
            break;
        case "Winter Storm Watch":
            element.style.backgroundColor = "rgb(0, 0, 255)";
            break;
        case "Winter Weather Advisory":
            element.style.backgroundColor = "rgb(169, 81, 220)";
            break;
    }
}

function playWarningSound(eventName, warning) {
    const soundMap = {
        "warning": ["Tornado Warning", "Observed Tornado Warning", "PDS Tornado Warning", "Tornado Emergency", "Severe Thunderstorm Warning", "Considerable Severe Thunderstorm Warning", "Destructive Severe Thunderstorm Warning", "Flash Flood Warning"],
        "watch": ["Tornado Watch", "Severe Thunderstorm Watch"],
        "advisory": ["Winter Weather Advisory", "Winter Storm Watch", "Winter Storm Warning", "Ice Storm Warning", "Heavy Freezing Spray Warning", "Lake Effect Snow Warning"]
    };

    let soundFile = "";
    if (soundMap.warning.includes(eventName)) {
        soundFile = "warning.wav";
    } else if (soundMap.watch.includes(eventName)) {
        soundFile = "watch.wav";
    } else if (soundMap.advisory.includes(eventName)) {
        soundFile = "advisory.wav";
    }

    if (soundFile) {
        const audio = new Audio(soundFile);
        audio.play().catch(e => console.error("Failed to play sound:", e));
    } else {
        console.log("No sound file found for this event:", eventName);
    }
}



setInterval(fetchWarnings, 3000);
setInterval(updateDashboard, 10000);

fetchWarnings();
updateDashboard();
