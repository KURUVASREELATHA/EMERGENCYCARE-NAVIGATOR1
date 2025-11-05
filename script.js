// Global Variables
let userLocation = null;
let map = null;
let currentMapType = 'hospital';
let recognition = null;
let userLocationMarker = null;

// Sample Data with multiple cities
const facilities = [
    // New York
    {
        id: 1,
        name: 'City General Hospital',
        type: 'hospital',
        lat: 40.7128,
        lng: -74.0060,
        city: 'new york',
        address: '123 Main St, NY',
        phone: '+1-212-555-0101',
        email: 'info@citygeneral.com',
        beds_available: 25,
        total_beds: 200,
        specialties: ['Emergency', 'Cardiology', 'Surgery'],
        status: 'available'
    },
    {
        id: 2,
        name: 'Metro Medical Center',
        type: 'hospital',
        lat: 40.7589,
        lng: -73.9851,
        city: 'new york',
        address: '456 Broadway, NY',
        phone: '+1-212-555-0102',
        email: 'contact@metro.com',
        beds_available: 0,
        total_beds: 150,
        specialties: ['General Medicine', 'Pediatrics'],
        status: 'full'
    },
    // Madanapalle
    {
        id: 3,
        name: 'Madanapalle Government Hospital',
        type: 'hospital',
        lat: 13.5503,
        lng: 78.5026,
        city: 'madanapalle',
        address: 'Hospital Road, Madanapalle',
        phone: '+91-8571-222333',
        email: 'info@madanapallehospital.com',
        beds_available: 15,
        total_beds: 100,
        specialties: ['Emergency', 'General Medicine', 'Pediatrics'],
        doctors: {
            emergency: { available: true, count: 3 },
            general: { available: true, count: 5 },
            pediatrics: { available: true, count: 2 }
        },
        status: 'available'
    },
    {
        id: 4,
        name: 'Sri Venkateswara Medical Center',
        type: 'medical_center',
        lat: 13.5520,
        lng: 78.5040,
        city: 'madanapalle',
        address: 'Main Road, Madanapalle',
        phone: '+91-8571-333444',
        email: 'contact@svmc.com',
        beds_available: 0,
        total_beds: 50,
        specialties: ['Cardiology', 'Orthopedics'],
        doctors: {
            cardiology: { available: false, count: 0 },
            orthopedics: { available: true, count: 2 }
        },
        status: 'full'
    },
    {
        id: 5,
        name: 'Madanapalle Primary Health Center',
        type: 'hospital',
        lat: 13.5480,
        lng: 78.5010,
        city: 'madanapalle',
        address: 'Gandhi Road, Madanapalle',
        phone: '+91-8571-444555',
        email: 'phc@madanapalle.gov.in',
        beds_available: 8,
        total_beds: 30,
        specialties: ['Emergency', 'Family Medicine'],
        doctors: {
            emergency: { available: true, count: 2 },
            general: { available: true, count: 3 }
        },
        status: 'available'
    }
];



// Navigation
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(section + '-section').classList.add('active');
    event.target.classList.add('active');
    
    if (section === 'map') {
        setTimeout(() => {
            if (!map) {
                initMap();
            }
            if (map) {
                map.invalidateSize();
                map.setView([13.5503, 78.5026], 13);
                updateMarkers();
                getLocation();
            }
        }, 200);
    }
}

// Profile
function saveProfile() {
    const profile = {
        name: document.getElementById('user-name').value,
        phone: document.getElementById('user-phone').value,
        emergency: document.getElementById('emergency-contact').value,
        blood: document.getElementById('blood-group').value
    };
    localStorage.setItem('profile_user', JSON.stringify(profile));
    alert('✅ Profile saved!');
}

function deleteAccount() {
    if (confirm('Delete account?')) {
        localStorage.removeItem('profile_user');
        logout();
    }
}

// Map
function initMap() {
    map = L.map('map').setView([13.5503, 78.5026], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    updateMarkers();
}

function getLocation() {
    // Set default location to Madanapalle
    userLocation = { lat: 13.5503, lng: 78.5026 };
    if (map) {
        // Remove existing user location marker
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
        }
        
        // Add user location marker in Madanapalle
        userLocationMarker = L.marker([userLocation.lat, userLocation.lng])
            .addTo(map)
            .bindPopup('📍 Your Location (Madanapalle)');
        
        map.setView([userLocation.lat, userLocation.lng], 13);
    }
}

function updateMarkers() {
    if (!map) return;
    
    // Clear existing markers except user location
    map.eachLayer(layer => {
        if ((layer instanceof L.Marker || layer instanceof L.CircleMarker) && layer !== userLocationMarker) {
            map.removeLayer(layer);
        }
    });
    
    const defaultFacilities = facilities.filter(f => 
        f.type === currentMapType && f.city === 'madanapalle'
    );
    
    defaultFacilities.forEach(facility => {
        // Red + icon for all hospitals
        const redPlusIcon = L.divIcon({
            html: '<div style="color: #e74c3c; font-size: 16px; font-weight: bold;">+</div>',
            iconSize: [20, 20],
            className: 'custom-hospital-icon'
        });
        
        const redMarker = L.marker([facility.lat, facility.lng], { 
            icon: redPlusIcon 
        }).addTo(map);
        
        // Status symbol - big red cross for not available
        const isAvailable = facility.status === 'available';
        const statusIcon = L.divIcon({
            html: isAvailable ? 
                '<div style="color: #27ae60; font-size: 18px;">✔️</div>' :
                '<div style="color: #e74c3c; font-size: 32px; font-weight: bold;">✖</div>',
            iconSize: isAvailable ? [25, 25] : [35, 35],
            className: 'custom-hospital-icon'
        });
        
        const offsetLat = facility.lat + 0.002;
        const offsetLng = facility.lng + 0.002;
        
        const statusMarker = L.marker([offsetLat, offsetLng], { 
            icon: statusIcon 
        }).addTo(map);
        
        redMarker.on('click', () => {
            showHospitalPopup(facility, redMarker);
        });
        
        statusMarker.on('click', () => {
            showHospitalPopup(facility, statusMarker);
        });
    });
    
    displayHospitalProfiles(defaultFacilities);
}

function showHospitalDetails(facility) {
    const detailsBox = document.getElementById('hospital-details');
    const nameElement = document.getElementById('hospital-name');
    const infoElement = document.getElementById('hospital-info');
    
    const status = facility.status === 'available' ? 'Available' : 'Not Available';
    const statusColor = facility.status === 'available' ? '#27ae60' : '#e74c3c';
    
    nameElement.textContent = facility.name;
    nameElement.style.color = statusColor;
    
    infoElement.innerHTML = `
        <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
        <p><strong>📍 Address:</strong> ${facility.address}</p>
        <p><strong>📞 Phone:</strong> <a href="tel:${facility.phone}">${facility.phone}</a></p>
        <p><strong>📧 Email:</strong> <a href="mailto:${facility.email}">${facility.email}</a></p>
        <p><strong>🛏️ Beds:</strong> ${facility.beds_available} / ${facility.total_beds}</p>
        <p><strong>🏥 Specialties:</strong> ${facility.specialties.join(', ')}</p>
        <button onclick="window.open('tel:${facility.phone}')" class="btn-primary" style="margin-top: 1rem;">📞 Call Now</button>
    `;
    
    detailsBox.style.display = 'block';
    detailsBox.scrollIntoView({ behavior: 'smooth' });
}

function showHospitalPopup(facility, marker) {
    const status = facility.status === 'available' ? 'Available' : 'Not Available';
    const statusColor = facility.status === 'available' ? '#27ae60' : '#e74c3c';
    
    const popupContent = `
        <div style="text-align: center; min-width: 200px;">
            <h3 style="margin-bottom: 10px; color: #2c3e50;">${facility.name}</h3>
            <p style="color: ${statusColor}; font-size: 16px; font-weight: bold; margin-bottom: 10px;">${status}</p>
            <p style="margin-bottom: 5px;"><strong>📍</strong> ${facility.address}</p>
            <p style="margin-bottom: 5px;"><strong>📞</strong> ${facility.phone}</p>
            <p style="margin-bottom: 5px;"><strong>📧</strong> ${facility.email}</p>
            <p style="margin-bottom: 10px;"><strong>🛏️</strong> Beds: ${facility.beds_available}/${facility.total_beds}</p>
            <p style="margin-bottom: 10px;"><strong>🏥</strong> ${facility.specialties.join(', ')}</p>
            <button onclick="window.open('tel:${facility.phone}')" 
                    style="background: #3498db; color: white; border: none; padding: 8px 16px; 
                           border-radius: 5px; cursor: pointer; font-size: 14px;">
                📞 Call Now
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent).openPopup();
    showHospitalDetails(facility);
}

function displayHospitalProfiles(facilitiesList) {
    const profilesContainer = document.getElementById('hospital-profiles');
    
    profilesContainer.innerHTML = facilitiesList.map(facility => {
        const status = facility.status === 'available' ? 'available' : 'unavailable';
        const statusText = facility.status === 'available' ? 'Available' : 'Not Available';
        
        return `
            <div class="hospital-profile-card" onclick="focusOnHospital(${facility.id})">
                <div class="hospital-profile-header ${status}">
                    <h3>${facility.name}</h3>
                    <p style="margin: 0; font-weight: bold;">${statusText}</p>
                </div>
                <div class="hospital-profile-body">
                    <p><strong>📍 Address:</strong> ${facility.address}</p>
                    <p><strong>📞 Phone:</strong> ${facility.phone}</p>
                    <p><strong>🛏️ Beds:</strong> ${facility.beds_available} / ${facility.total_beds}</p>
                    <p><strong>🏥 Specialties:</strong> ${facility.specialties.join(', ')}</p>
                </div>
            </div>
        `;
    }).join('');
}

function focusOnHospital(facilityId) {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility && map) {
        map.setView([facility.lat, facility.lng], 15);
        showHospitalDetails(facility);
    }
}

function showHospitalMap() {
    showSection('map');
    setTimeout(() => {
        currentMapType = 'hospital';
        document.getElementById('hospital-btn').classList.add('active');
        document.getElementById('medical-btn').classList.remove('active');
        updateMarkers();
    }, 200);
}

function showMedicalMap() {
    showSection('map');
    setTimeout(() => {
        currentMapType = 'medical_center';
        document.getElementById('medical-btn').classList.add('active');
        document.getElementById('hospital-btn').classList.remove('active');
        updateMarkers();
    }, 200);
}

function searchCity() {
    alert('This app only serves Madanapalle. Use the location buttons above.');
    showMadanapalle();
}

function showAllHospitalsInCity(city) {
    if (!map) return;
    
    // Clear existing markers except user location
    map.eachLayer(layer => {
        if ((layer instanceof L.Marker || layer instanceof L.CircleMarker) && layer !== userLocationMarker) {
            map.removeLayer(layer);
        }
    });
    
    const cityFacilities = facilities.filter(f => 
        f.city === city && f.type === currentMapType
    );
    
    cityFacilities.forEach(facility => {
        // Red + icon for all hospitals
        const redPlusIcon = L.divIcon({
            html: '<div style="color: #e74c3c; font-size: 16px; font-weight: bold;">+</div>',
            iconSize: [20, 20],
            className: 'custom-hospital-icon'
        });
        
        const redMarker = L.marker([facility.lat, facility.lng], { 
            icon: redPlusIcon 
        }).addTo(map);
        
        // Status symbol - big red cross for not available
        const isAvailable = facility.status === 'available';
        const statusIcon = L.divIcon({
            html: isAvailable ? 
                '<div style="color: #27ae60; font-size: 18px;">✔️</div>' :
                '<div style="color: #e74c3c; font-size: 32px; font-weight: bold;">✖</div>',
            iconSize: isAvailable ? [25, 25] : [35, 35],
            className: 'custom-hospital-icon'
        });
        
        const offsetLat = facility.lat + 0.002;
        const offsetLng = facility.lng + 0.002;
        
        const statusMarker = L.marker([offsetLat, offsetLng], { 
            icon: statusIcon 
        }).addTo(map);
        
        redMarker.on('click', () => {
            showHospitalPopup(facility, redMarker);
        });
        
        statusMarker.on('click', () => {
            showHospitalPopup(facility, statusMarker);
        });
    });
    
    displayHospitalProfiles(cityFacilities);
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('all-btn').classList.add('active');
}

function showAvailableOnly() {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('available-btn').classList.add('active');
    filterMarkers('available');
}

function showNotAvailable() {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('not-available-btn').classList.add('active');
    filterMarkers('not-available');
}

function showAllHospitals() {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('all-btn').classList.add('active');
    filterMarkers('all');
}

function filterMarkers(type) {
    if (!map) return;
    
    // Clear existing markers except user location
    map.eachLayer(layer => {
        if ((layer instanceof L.Marker || layer instanceof L.CircleMarker) && layer !== userLocationMarker) {
            map.removeLayer(layer);
        }
    });
    
    const searchCity = 'madanapalle'; // Fixed to always use Madanapalle
    let filteredFacilities = facilities.filter(f => 
        f.type === currentMapType && f.city === searchCity
    );
    
    if (type === 'available') {
        filteredFacilities = filteredFacilities.filter(f => f.status === 'available');
        // Show only green ✔️ for available
        filteredFacilities.forEach(facility => {
            const checkIcon = L.divIcon({
                html: '<div style="color: #27ae60; font-size: 24px;">✔️</div>',
                iconSize: [30, 30],
                className: 'custom-hospital-icon'
            });
            
            const marker = L.marker([facility.lat, facility.lng], { 
                icon: checkIcon 
            }).addTo(map);
            
            marker.on('click', () => {
                showHospitalPopup(facility, marker);
            });
        });
    } else if (type === 'not-available') {
        filteredFacilities = filteredFacilities.filter(f => f.status !== 'available');
        // Show only big red ✖ for not available
        filteredFacilities.forEach(facility => {
            const crossIcon = L.divIcon({
                html: '<div style="color: #e74c3c; font-size: 40px; font-weight: bold;">✖</div>',
                iconSize: [45, 45],
                className: 'custom-hospital-icon'
            });
            
            const marker = L.marker([facility.lat, facility.lng], { 
                icon: crossIcon 
            }).addTo(map);
            
            marker.on('click', () => {
                showHospitalPopup(facility, marker);
            });
        });
    } else {
        // Show all hospitals with red + and status symbols
        filteredFacilities.forEach(facility => {
            // Red + icon
            const redPlusIcon = L.divIcon({
                html: '<div style="color: #e74c3c; font-size: 16px; font-weight: bold;">+</div>',
                iconSize: [20, 20],
                className: 'custom-hospital-icon'
            });
            
            const redMarker = L.marker([facility.lat, facility.lng], { 
                icon: redPlusIcon 
            }).addTo(map);
            
            // Status symbol - big red cross for not available
            const isAvailable = facility.status === 'available';
            const statusIcon = L.divIcon({
                html: isAvailable ? 
                    '<div style="color: #27ae60; font-size: 18px;">✔️</div>' :
                    '<div style="color: #e74c3c; font-size: 32px; font-weight: bold;">✖</div>',
                iconSize: isAvailable ? [25, 25] : [35, 35],
                className: 'custom-hospital-icon'
            });
            
            const offsetLat = facility.lat + 0.002;
            const offsetLng = facility.lng + 0.002;
            
            const statusMarker = L.marker([offsetLat, offsetLng], { 
                icon: statusIcon 
            }).addTo(map);
            
            redMarker.on('click', () => {
                showHospitalPopup(facility, redMarker);
            });
            
            statusMarker.on('click', () => {
                showHospitalPopup(facility, statusMarker);
            });
        });
    }
    
    displayHospitalProfiles(filteredFacilities);
}

function showMyLocation() {
    if (userLocation && map) {
        map.setView([userLocation.lat, userLocation.lng], 15);
    } else {
        getLocation();
    }
}

// Voice
function initVoice() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            const btn = document.getElementById('voice-search-btn');
            btn.style.background = '#e74c3c';
            btn.innerHTML = '<i class="fas fa-stop"></i>';
            btn.style.animation = 'pulse 1s infinite';
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase();
            document.getElementById('city-search').value = transcript;
            setTimeout(() => searchCity(), 500);
        };
        
        recognition.onend = function() {
            const btn = document.getElementById('voice-search-btn');
            btn.style.background = '#f39c12';
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
            btn.style.animation = 'none';
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            const btn = document.getElementById('voice-search-btn');
            btn.style.background = '#f39c12';
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
            btn.style.animation = 'none';
            alert('Voice search error. Please try again or type the city name.');
        };
    } else {
        console.log('Speech recognition not supported');
    }
}

function startVoiceSearch() {
    if (recognition) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Voice recognition start error:', error);
            alert('Voice search not available. Please type the city name.');
        }
    } else {
        alert('Voice recognition not supported in this browser. Please type the city name.');
    }
}

let selectedSpecialty = null;
let currentUser = null;

// Authentication Functions
function showLogin() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('login-page').classList.add('active');
}

function showSignup() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('signup-page').classList.add('active');
}

// Initialize authentication
document.addEventListener('DOMContentLoaded', function() {
    initVoice();
    
    // Login Form Handler
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const userType = document.getElementById('login-user-type').value;
        
        if (email && password && userType) {
            currentUser = { email, userType };
            
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            
            switch(userType) {
                case 'user':
                    document.getElementById('user-dashboard').classList.add('active');
                    const emailInput = document.getElementById('user-email');
                    if (emailInput) emailInput.value = email;
                    break;
                case 'hospital':
                    document.getElementById('hospital-dashboard').classList.add('active');
                    break;
                case 'medical-center':
                    document.getElementById('medical-center-dashboard').classList.add('active');
                    break;
                case 'admin':
                    document.getElementById('admin-dashboard').classList.add('active');
                    break;
            }
        } else {
            alert('Please fill all fields');
        }
    });
    
    // Signup Form Handler
    document.getElementById('signup-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const userType = document.getElementById('signup-user-type').value;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        if (name && email && phone && password && userType) {
            alert('Account created successfully! Please login.');
            showLogin();
        } else {
            alert('Please fill all fields');
        }
    });
});

function findDoctors(specialty) {
    selectedSpecialty = specialty;
    const searchCity = 'madanapalle';
    
    const availableHospitals = facilities.filter(f => {
        return f.city === searchCity && 
               f.doctors && 
               f.doctors[specialty] && 
               f.doctors[specialty].available;
    });
    
    const specialtyNames = {
        cardiology: 'Cardiologists (Heart Specialists)',
        orthopedics: 'Orthopedic Doctors (Bone & Joint)',
        emergency: 'Emergency Doctors',
        pediatrics: 'Pediatricians (Child Specialists)',
        general: 'General Medicine Doctors',
        neurology: 'Neurologists (Brain & Nerve)'
    };
    
    document.getElementById('selected-specialty').textContent = specialtyNames[specialty] || specialty;
    
    const doctorResults = document.getElementById('available-doctors');
    if (availableHospitals.length > 0) {
        doctorResults.innerHTML = availableHospitals.map(hospital => `
            <div class="doctor-card">
                <h4>${hospital.name}</h4>
                <p><strong>📍</strong> ${hospital.address}</p>
                <p><strong>👨‍⚕️</strong> ${hospital.doctors[specialty].count} doctors available</p>
                <p><strong>📞</strong> ${hospital.phone}</p>
            </div>
        `).join('');
    } else {
        doctorResults.innerHTML = '<p>No doctors available for this specialty in Madanapalle.</p>';
    }
    
    document.getElementById('doctor-results').style.display = 'block';
}

function showDoctorMap() {
    if (!selectedSpecialty) return;
    
    showSection('map');
    setTimeout(() => {
        filterDoctorMarkers(selectedSpecialty);
    }, 200);
}

function filterDoctorMarkers(specialty) {
    if (!map) return;
    
    // Clear existing markers except user location
    map.eachLayer(layer => {
        if ((layer instanceof L.Marker || layer instanceof L.CircleMarker) && layer !== userLocationMarker) {
            map.removeLayer(layer);
        }
    });
    
    const availableHospitals = facilities.filter(f => {
        return f.city === 'madanapalle' && 
               f.doctors && 
               f.doctors[specialty] && 
               f.doctors[specialty].available;
    });
    
    availableHospitals.forEach(facility => {
        const doctorIcon = L.divIcon({
            html: '<div style="color: #3498db; font-size: 24px;">👨‍⚕️</div>',
            iconSize: [30, 30],
            className: 'custom-hospital-icon'
        });
        
        const marker = L.marker([facility.lat, facility.lng], { 
            icon: doctorIcon 
        }).addTo(map);
        
        marker.on('click', () => {
            showDoctorPopup(facility, specialty, marker);
        });
    });
    
    displayHospitalProfiles(availableHospitals);
}

function showDoctorPopup(facility, specialty, marker) {
    const specialtyNames = {
        cardiology: 'Cardiologists',
        orthopedics: 'Orthopedic Doctors',
        emergency: 'Emergency Doctors',
        pediatrics: 'Pediatricians',
        general: 'General Doctors',
        neurology: 'Neurologists'
    };
    
    const popupContent = `
        <div style="text-align: center; min-width: 200px;">
            <h3 style="margin-bottom: 10px; color: #2c3e50;">${facility.name}</h3>
            <p style="color: #3498db; font-size: 16px; font-weight: bold; margin-bottom: 10px;">${specialtyNames[specialty]} Available</p>
            <p style="margin-bottom: 5px;"><strong>👨‍⚕️</strong> ${facility.doctors[specialty].count} doctors</p>
            <p style="margin-bottom: 5px;"><strong>📍</strong> ${facility.address}</p>
            <p style="margin-bottom: 5px;"><strong>📞</strong> ${facility.phone}</p>
            <button onclick="window.open('tel:${facility.phone}')" 
                    style="background: #3498db; color: white; border: none; padding: 8px 16px; 
                           border-radius: 5px; cursor: pointer; font-size: 14px;">
                📞 Call Now
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent).openPopup();
}

// Hospital Dashboard Functions
const doctors = [
    {
        id: 1,
        name: "Dr. Rajesh Kumar",
        specialty: "Cardiology",
        diseases: ["Heart Disease", "Hypertension", "Chest Pain", "Arrhythmia"],
        status: "available",
        experience: "15 years"
    },
    {
        id: 2,
        name: "Dr. Priya Sharma",
        specialty: "Neurology",
        diseases: ["Stroke", "Epilepsy", "Migraine", "Parkinson's"],
        status: "busy",
        experience: "12 years"
    },
    {
        id: 3,
        name: "Dr. Anil Reddy",
        specialty: "Orthopedics",
        diseases: ["Fractures", "Joint Pain", "Arthritis", "Sports Injuries"],
        status: "available",
        experience: "18 years"
    },
    {
        id: 4,
        name: "Dr. Sunitha Rao",
        specialty: "Pediatrics",
        diseases: ["Child Fever", "Vaccination", "Growth Issues", "Allergies"],
        status: "unavailable",
        experience: "10 years"
    },
    {
        id: 5,
        name: "Dr. Venkat Rao",
        specialty: "General Medicine",
        diseases: ["Diabetes", "Fever", "Cold", "General Checkup"],
        status: "available",
        experience: "20 years"
    },
    {
        id: 6,
        name: "Dr. Lakshmi Devi",
        specialty: "Gynecology",
        diseases: ["Pregnancy", "Women's Health", "PCOS", "Menstrual Issues"],
        status: "busy",
        experience: "14 years"
    }
];

let hospitalMap = null;
let hospitalMarker = null;

function showHospitalPage(page) {
    document.querySelectorAll('.hospital-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.header-nav .nav-link').forEach(a => a.classList.remove('active'));
    
    document.getElementById('hospital-' + page).classList.add('active');
    event.target.classList.add('active');
    
    if (page === 'edit') {
        // Map will be initialized when user clicks "Select on Map"
    } else if (page === 'doctors') {
        loadDoctors();
    } else if (page === 'status') {
        loadStatusManagement();
        updateStatusCounts();
    }
}

function loadDoctors() {
    const grid = document.getElementById('doctorsGrid');
    grid.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    ${doctor.name.charAt(3)}${doctor.name.split(' ')[1].charAt(0)}
                </div>
                <div class="doctor-info">
                    <h3>${doctor.name}</h3>
                    <p>${doctor.specialty} • ${doctor.experience}</p>
                </div>
            </div>
            <div class="doctor-specialties">
                <strong>Treats:</strong><br>
                ${doctor.diseases.map(disease => `<span class="specialty-tag">${disease}</span>`).join('')}
            </div>
            <div class="doctor-status">
                <span class="status-badge status-${doctor.status}">
                    ${doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                </span>
            </div>
        </div>
    `).join('');
}

function updateDoctorStatus(doctorId, newStatus) {
    const doctor = doctors.find(d => d.id === doctorId);
    const oldStatus = doctor.status;
    doctor.status = newStatus;
    
    loadDoctors();
    updateStatusCounts();
    updateSpecialtyStatus();
    loadStatusManagement();
    
    showStatusUpdateNotification(doctor.name, newStatus);
}

function showStatusUpdateNotification(doctorName, status) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ed573;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = `✅ ${doctorName} status updated to ${status.toUpperCase()}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

function loadStatusManagement() {
    const grid = document.getElementById('statusManagement');
    grid.innerHTML = doctors.map(doctor => `
        <div class="status-management-card">
            <div class="doctor-header">
                <div class="doctor-avatar" style="width: 40px; height: 40px; font-size: 16px;">
                    ${doctor.name.charAt(3)}${doctor.name.split(' ')[1].charAt(0)}
                </div>
                <div style="margin-left: 15px; flex: 1;">
                    <div class="doctor-name">${doctor.name}</div>
                    <div class="doctor-specialty">${doctor.specialty}</div>
                </div>
                <span class="status-badge status-${doctor.status}">
                    ${doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1)}
                </span>
            </div>
            <div class="status-update-form">
                <label style="font-weight: 600; color: #2d3748;">Update Status:</label>
                <select onchange="updateDoctorStatus(${doctor.id}, this.value)" class="status-select">
                    <option value="available" ${doctor.status === 'available' ? 'selected' : ''}>✅ Available</option>
                    <option value="busy" ${doctor.status === 'busy' ? 'selected' : ''}>🟡 Busy</option>
                    <option value="unavailable" ${doctor.status === 'unavailable' ? 'selected' : ''}>❌ Unavailable</option>
                </select>
            </div>
        </div>
    `).join('');
}

function updateStatusCounts() {
    const available = doctors.filter(d => d.status === 'available').length;
    const busy = doctors.filter(d => d.status === 'busy').length;
    const unavailable = doctors.filter(d => d.status === 'unavailable').length;
    
    document.getElementById('availableCount').textContent = available;
    document.getElementById('busyCount').textContent = busy;
    document.getElementById('unavailableCount').textContent = unavailable;
    
    updateSpecialtyStatus();
}

function updateSpecialtyStatus() {
    const specialties = [...new Set(doctors.map(d => d.specialty))];
    const statusDiv = document.getElementById('specialtyStatus');
    
    statusDiv.innerHTML = specialties.map(specialty => {
        const specialtyDoctors = doctors.filter(d => d.specialty === specialty);
        const available = specialtyDoctors.filter(d => d.status === 'available').length;
        const total = specialtyDoctors.length;
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: white; border-radius: 10px; border-left: 4px solid #667eea;">
                <div>
                    <h4>${specialty}</h4>
                    <p style="color: #718096; margin: 0;">${available}/${total} doctors available</p>
                </div>
                <div class="status-badge ${available > 0 ? 'status-available' : 'status-unavailable'}">
                    ${available > 0 ? 'Available' : 'No Doctors Available'}
                </div>
            </div>
        `;
    }).join('');
}

function getHospitalLocation() {
    // Set location to Madanapalle center
    const lat = 13.5503;
    const lng = 78.5026;
    
    const latInput = document.getElementById('hospital-latitude');
    const lngInput = document.getElementById('hospital-longitude');
    
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
    
    alert('✅ Location set to Madanapalle center. Use map to select exact location.');
}

function showLocationMap() {
    const mapContainer = document.getElementById('editMap');
    mapContainer.style.display = 'block';
    
    setTimeout(() => {
        initializeHospitalMap();
    }, 100);
}

function initializeHospitalMap() {
    if (hospitalMap) {
        hospitalMap.remove();
    }
    
    const latInput = document.getElementById('hospital-latitude');
    const lngInput = document.getElementById('hospital-longitude');
    
    const lat = latInput ? parseFloat(latInput.value) || 13.2172 : 13.2172;
    const lng = lngInput ? parseFloat(lngInput.value) || 79.1003 : 79.1003;
    
    hospitalMap = L.map('editMap').setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(hospitalMap);
    
    hospitalMarker = L.marker([lat, lng]).addTo(hospitalMap);
    
    hospitalMap.on('click', function(e) {
        const { lat, lng } = e.latlng;
        const latInput = document.getElementById('hospital-latitude');
        const lngInput = document.getElementById('hospital-longitude');
        
        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);
        
        if (hospitalMarker) {
            hospitalMap.removeLayer(hospitalMarker);
        }
        hospitalMarker = L.marker([lat, lng]).addTo(hospitalMap);
        
        // Show confirmation
        const popup = L.popup()
            .setLatLng([lat, lng])
            .setContent('✅ Hospital location updated!')
            .openOn(hospitalMap);
        
        setTimeout(() => {
            hospitalMap.closePopup(popup);
        }, 2000);
    });
}

function addDoctor() {
    const name = prompt('Enter doctor name:');
    const specialty = prompt('Enter specialty:');
    const diseases = prompt('Enter diseases treated (comma separated):');
    
    if (name && specialty && diseases) {
        const newDoctor = {
            id: doctors.length + 1,
            name: name,
            specialty: specialty,
            diseases: diseases.split(',').map(d => d.trim()),
            status: 'available',
            experience: '5 years'
        };
        
        doctors.push(newDoctor);
        loadDoctors();
        updateStatusCounts();
        alert('Doctor added successfully!');
    }
}

function showMadanapalle() {
    if (!map) forceInitMap();
    
    setTimeout(() => {
        if (map) {
            map.setView([13.5503, 78.5026], 13);
            updateMarkers();
        }
    }, 100);
}

function showMyLocationAndNearby() {
    if (!map) forceInitMap();
    
    // Set to Madanapalle center with radius
    setTimeout(() => {
        if (map) {
            map.setView([13.5503, 78.5026], 14);
            
            // Add radius circle
            L.circle([13.5503, 78.5026], {
                color: 'blue',
                fillColor: '#30f',
                fillOpacity: 0.1,
                radius: 2000 // 2km radius
            }).addTo(map).bindPopup('📍 2km radius from Madanapalle center');
            
            updateMarkers();
        }
    }, 100);
}

function forceInitMap() {
    if (map) {
        map.remove();
        map = null;
    }
    
    setTimeout(() => {
        map = L.map('map').setView([13.5503, 78.5026], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        // Add Madanapalle marker
        userLocation = { lat: 13.5503, lng: 78.5026 };
        userLocationMarker = L.marker([13.5503, 78.5026])
            .addTo(map)
            .bindPopup('📍 Madanapalle Center');
        
        updateMarkers();
    }, 100);
}

function logout() {
    currentUser = null;
    showLogin();
}