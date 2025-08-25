// script.js

// Initialize the map with an ocean-focused view over Indian coasts
const map = L.map('map').setView([15.0, 80.0], 5);

// Add OpenStreetMap tiles with a blue tint for water emphasis
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Define coastal areas (ocean-only, avoiding Sri Lanka land)
const coastlines = [
    // West Coast of India
    [[23.0, 68.0], [22.0, 69.0], [21.0, 72.0], [19.0, 72.8], [15.0, 74.0], [12.0, 75.0], [10.0, 76.0], [8.0, 77.0]],
    // South Coast (staying far offshore from Sri Lanka)
    [[8.0, 77.0], [6.5, 76.0], [6.0, 75.0]], // Farther west to avoid Sri Lanka
    // East Coast of India
    [[10.0, 79.8], [12.0, 80.0], [13.0, 80.2], [15.0, 80.0], [17.0, 82.0], [20.0, 85.0], [21.0, 87.0], [22.5, 88.3]]
];

coastlines.forEach(coast => {
    L.polyline(coast, {
        color: '#3388ff',
        weight: 6,
        opacity: 0.7
    }).addTo(map).bindPopup('<b>Ocean Coastline</b>');
});

// Add markers for start and end points (default: Mumbai to Kolkata)
let startMarker = L.marker([19.0760, 72.8777]).addTo(map)
    .bindPopup('Start Point: Mumbai')
    .openPopup();

let endMarker = L.marker([22.5726, 88.3639]).addTo(map)
    .bindPopup('Destination: Kolkata');

// Route line
let routeLine = null;

// Hazards
let hazards = [];

// Ship marker for animation
let shipMarker = null;
let animationInterval = null;

// Simulated environmental factors (for dynamic hazards)
function getEnvironmentalFactors(lat, lng) {
    // Simulate temperature (20-35°C), pressure (990-1020 hPa), wind speed (0-50 km/h), wave height (0-5 m)
    const temperature = 20 + Math.random() * 15;
    const pressure = 990 + Math.random() * 30;
    const windSpeed = Math.random() * 50;
    const waveHeight = Math.random() * 5;
    return { temperature, pressure, windSpeed, waveHeight };
}

// Detect hazards based on factors
function detectHazards(factors) {
    const detected = [];
    if (factors.temperature > 30) detected.push('High Temperature');
    if (factors.pressure < 1000) detected.push('Low Pressure');
    if (factors.windSpeed > 30) detected.push('Strong Winds');
    if (factors.waveHeight > 3) detected.push('High Waves');
    return detected;
}

// Update hazard alerts
function updateHazardAlerts(detectedHazards) {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = '';
    if (detectedHazards.length === 0) {
        alertsContainer.innerHTML = `
            <div class="alert-item">
                <span class="alert-icon">⚠️</span>
                <span>No hazards detected. All clear!</span>
            </div>
        `;
    } else {
        detectedHazards.forEach(hazard => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <span class="alert-icon">⚠️</span>
                <span>${hazard} detected at current position.</span>
            `;
            alertsContainer.appendChild(alertItem);
        });
    }
    document.getElementById('hazards-count').textContent = detectedHazards.length;
}

// Calculate route function - fetches from backend for ocean-only routing
document.getElementById('calculate-route').addEventListener('click', async function() {
    const startCoords = document.getElementById('start-point').value.split(',').map(Number);
    const endCoords = document.getElementById('end-point').value.split(',').map(Number);
    const boatType = document.getElementById('boat-type').value;
    const hazardSensitivity = document.getElementById('hazard-sensitivity').value;

    // Fetch route from backend
    const response = await fetch('http://localhost:5000/calculate_route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            start: startCoords,
            end: endCoords,
            ship_type: boatType,
            hazard_sensitivity: hazardSensitivity
        })
    });

    const data = await response.json();
    const routePoints = data.route_points;

    // Update markers
    map.removeLayer(startMarker);
    map.removeLayer(endMarker);

    startMarker = L.marker(startCoords).addTo(map).bindPopup('Start Point');
    endMarker = L.marker(endCoords).addTo(map).bindPopup('Destination');

    // Remove existing route if any
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    // Draw the route
    routeLine = L.polyline(routePoints, {
        color: '#4ecdc4',
        weight: 4,
        opacity: 0.7,
        dashArray: '5, 10'
    }).addTo(map);

    // Fit map to show the entire route
    map.fitBounds(routeLine.getBounds());

    // Update status
    document.getElementById('route-status').textContent = 'Active (Ocean Route)';
    document.getElementById('current-pos').textContent = startCoords.join(', ');
    document.getElementById('destination-pos').textContent = endCoords.join(', ');

    // Calculate distance and ETA
    const distance = calculateDistance(routePoints);
    document.getElementById('distance').textContent = distance.toFixed(1) + ' km';
    document.getElementById('eta').textContent = calculateETA(distance);
    document.getElementById('speed').textContent = '10 knots';
});

// Simulate hazards function (calls backend for recalculated route)
document.getElementById('simulate-hazards').addEventListener('click', async function() {
    // Clear previous hazards
    hazards.forEach(hazard => map.removeLayer(hazard));
    hazards = [];

    // Create simulated hazards
    const hazardTypes = ['Storm', 'Rough Seas', 'Floating Debris', 'Strong Current'];
    const hazardIcons = ['⛈️', '🌊', '🪵', '🌪️'];

    for (let i = 0; i < 3; i++) {
        const lat = 10.0 + Math.random() * 10;
        const lng = 75.0 + Math.random() * 10;

        const hazardTypeIndex = Math.floor(Math.random() * hazardTypes.length);

        const hazardCircle = L.circle([lat, lng], {
            color: '#ff7e5f',
            fillColor: '#ff7e5f',
            fillOpacity: 0.3,
            radius: 50000 // Larger for sea
        }).addTo(map);

        hazardCircle.bindPopup(`<b>${hazardTypes[hazardTypeIndex]}</b><br>Avoid this area`);

        hazards.push(hazardCircle);
    }

    // Update alerts
    document.getElementById('alerts-container').innerHTML = '';

    hazards.forEach((hazard, index) => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <span class="alert-icon">${hazardIcons[index % hazardIcons.length]}</span>
            <span>${hazardTypes[index % hazardTypes.length]} detected nearby. Route adjusted.</span>
        `;
        document.getElementById('alerts-container').appendChild(alertItem);
    });

    // Update status
    document.getElementById('hazards-count').textContent = hazards.length;
    document.getElementById('route-status').textContent = 'Hazard Avoidance Active';

    // If we have a route, recalculate via backend to avoid hazards
    if (routeLine) {
        const startCoords = document.getElementById('start-point').value.split(',').map(Number);
        const endCoords = document.getElementById('end-point').value.split(',').map(Number);
        const boatType = document.getElementById('boat-type').value;
        const hazardSensitivity = document.getElementById('hazard-sensitivity').value;

        const response = await fetch('http://localhost:5000/calculate_route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: startCoords,
                end: endCoords,
                ship_type: boatType,
                hazard_sensitivity: hazardSensitivity,
                avoid_hazards: true
            })
        });

        const data = await response.json();
        const routePoints = data.route_points;

        map.removeLayer(routeLine);

        routeLine = L.polyline(routePoints, {
            color: '#4ecdc4',
            weight: 4,
            opacity: 0.7,
            dashArray: '5, 10'
        }).addTo(map);
    }
});

// Start ship simulation (slower speed with dynamic hazard updates)
document.getElementById('start-simulation').addEventListener('click', function() {
    if (!routeLine) {
        alert('Calculate a route first!');
        return;
    }

    if (animationInterval) {
        clearInterval(animationInterval);
    }

    const routePoints = routeLine.getLatLngs();
    let index = 0;

    // Clear existing hazards and alerts
    hazards.forEach(hazard => map.removeLayer(hazard));
    hazards = [];
    updateHazardAlerts([]);

    // Create ship marker if not exists
    if (shipMarker) {
        map.removeLayer(shipMarker);
    }
    shipMarker = L.marker(routePoints[0], {
        icon: L.divIcon({
            className: 'ship-icon',
            html: '🚢',
            iconSize: [30, 30]
        })
    }).addTo(map);

    // Animate (slower: 1000ms interval)
    animationInterval = setInterval(() => {
        index++;
        if (index >= routePoints.length) {
            clearInterval(animationInterval);
            document.getElementById('speed').textContent = '0 knots';
            document.getElementById('route-status').textContent = 'Arrived';
            updateHazardAlerts([]); // Clear hazards on arrival
            return;
        }

        const currentPos = routePoints[index];
        shipMarker.setLatLng(currentPos);
        document.getElementById('current-pos').textContent = `${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)}`;
        document.getElementById('speed').textContent = '10 knots';

        // Simulate environmental factors at current position
        const factors = getEnvironmentalFactors(currentPos.lat, currentPos.lng);

        // Detect hazards based on factors
        const detectedHazards = detectHazards(factors);

        // Update hazard alerts and count
        updateHazardAlerts(detectedHazards);

        // Optionally, add visual hazard if detected
        if (detectedHazards.length > 0) {
            const hazardCircle = L.circle([currentPos.lat, currentPos.lng], {
                color: '#ff7e5f',
                fillColor: '#ff7e5f',
                fillOpacity: 0.3,
                radius: 20000
            }).addTo(map);
            hazardCircle.bindPopup(`<b>Dynamic Hazard</b><br>${detectedHazards.join(', ')}`);
            hazards.push(hazardCircle);
        }
    }, 1000); // Slower animation: 1 second per step
});

// Reset map function
document.getElementById('reset-map').addEventListener('click', function() {
    // Clear hazards
    hazards.forEach(hazard => map.removeLayer(hazard));
    hazards = [];

    // Clear route
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    // Clear ship
    if (shipMarker) {
        map.removeLayer(shipMarker);
        shipMarker = null;
    }
    if (animationInterval) {
        clearInterval(animationInterval);
    }

    // Reset inputs
    document.getElementById('start-point').value = '19.0760, 72.8777';
    document.getElementById('end-point').value = '22.5726, 88.3639';
    document.getElementById('boat-type').value = 'cargo';
    document.getElementById('hazard-sensitivity').value = 'high';

    // Reset status
    document.getElementById('current-pos').textContent = '19.0760, 72.8777';
    document.getElementById('destination-pos').textContent = '22.5726, 88.3639';
    document.getElementById('distance').textContent = '-';
    document.getElementById('eta').textContent = '-';
    document.getElementById('speed').textContent = '0 knots';
    document.getElementById('hazards-count').textContent = '0';
    document.getElementById('route-status').textContent = 'Not Calculated';

    // Reset alerts
    document.getElementById('alerts-container').innerHTML = `
        <div class="alert-item">
            <span class="alert-icon">⚠️</span>
            <span>No hazards detected. All clear!</span>
        </div>
    `;

    // Reset markers
    map.removeLayer(startMarker);
    map.removeLayer(endMarker);

    startMarker = L.marker([19.0760, 72.8777]).addTo(map)
        .bindPopup('Start Point: Mumbai')
        .openPopup();

    endMarker = L.marker([22.5726, 88.3639]).addTo(map)
        .bindPopup('Destination: Kolkata');

    // Reset map view
    map.setView([15.0, 80.0], 5);
});

// Calculate distance of a route
function calculateDistance(points) {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const lat1 = points[i][0];
        const lon1 = points[i][1];
        const lat2 = points[i+1][0];
        const lon2 = points[i+1][1];

        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        totalDistance += distance;
    }
    return totalDistance;
}

// Calculate estimated time of arrival
function calculateETA(distance) {
    const speed = 10; // knots (slower speed)
    const hours = distance / (speed * 1.852); // Convert knots to km/h
    const now = new Date();
    const arrival = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return arrival.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}
